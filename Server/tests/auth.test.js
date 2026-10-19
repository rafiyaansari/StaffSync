import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import User from '../src/models/User.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, login, makeUser, seedTeam, tokenFor, PASSWORD } from './helpers/factory.js';

let app;

before(async () => {
  app = await startTestApp();
});

after(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('POST /api/auth/register', () => {
  const valid = {
    firstName: 'Ishita',
    lastName: 'Khanna',
    email: 'ishita.khanna@example.com',
    password: 'StrongPass@123',
    phone: '+91 98201 55387',
    department: 'Design',
    jobTitle: 'Product Designer',
    employmentType: 'Full-time',
    location: 'Mumbai, IN',
  };

  it('creates a pending registration request and a pending account', async () => {
    const response = await request(app).post('/api/auth/register').send(valid);
    assert.equal(response.status, 201);
    assert.equal(response.body.data.request.status, 'Pending');
    assert.equal(response.body.data.request.email, valid.email);
    assert.ok(response.body.data.message.includes('HR will review'));

    const user = await User.findOne({ email: valid.email }).select('+passwordHash');
    assert.equal(user.status, 'pending');
    assert.ok(user.passwordHash.startsWith('$2'), 'password must be hashed with bcrypt');
    assert.notEqual(user.passwordHash, valid.password);
  });

  it('rejects a weak password with a 400 and field details', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, password: 'short' });
    assert.equal(response.status, 400);
    assert.match(response.body.message, /at least 8/);
    assert.ok(response.body.errors.password);
  });

  it('rejects an invalid email and missing names', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, email: 'not-an-email', firstName: '' });
    assert.equal(response.status, 400);
    assert.ok(response.body.errors.email);
    assert.ok(response.body.errors.firstName);
  });

  it('blocks a duplicate account with 409', async () => {
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const response = await request(app).post('/api/auth/register').send(valid);
    assert.equal(response.status, 409);
    assert.match(response.body.message, /already exists/);
  });

  it('does not allow a registrant to log in before approval', async () => {
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const response = await login(app, valid.email, valid.password);
    assert.equal(response.status, 403);
    assert.match(response.body.message, /awaiting HR approval/);
  });
});

describe('POST /api/auth/login', () => {
  it('signs in an active account and returns a token plus employee profile', async () => {
    const employee = await makeUser({ firstName: 'Priya', lastName: 'Sharma', systemRole: 'hr' });
    const response = await login(app, employee.email);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.token);
    assert.equal(response.body.data.user.id, employee._id.toString());
    assert.equal(response.body.data.user.systemRole, 'hr');
    assert.equal(response.body.data.user.role, 'hr');
    assert.equal(response.body.data.user.passwordHash, undefined);
    assert.equal(response.body.data.user.password, undefined);
  });

  it('rejects a wrong password with 401 and the same generic message', async () => {
    const employee = await makeUser({});
    const wrong = await login(app, employee.email, 'WrongPass@123');
    assert.equal(wrong.status, 401);
    const unknown = await login(app, 'nobody@nimbuslabs.test', 'WrongPass@123');
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  it('rejects malformed login bodies', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'broken' });
    assert.equal(response.status, 400);
  });

  it('blocks a disabled account', async () => {
    const employee = await makeUser({});
    await User.updateOne({ employee: employee._id }, { status: 'disabled' });
    const response = await login(app, employee.email);
    assert.equal(response.status, 403);
    assert.match(response.body.message, /deactivated|not active/i);
  });
});

describe('GET /api/auth/me', () => {
  it('requires a bearer token', async () => {
    const response = await request(app).get('/api/auth/me');
    assert.equal(response.status, 401);
  });

  it('rejects a tampered token', async () => {
    const employee = await makeUser({});
    const token = await tokenFor(app, employee);
    const response = await request(app).get('/api/auth/me').set(auth(`${token}tampered`));
    assert.equal(response.status, 401);
  });

  it('returns the signed-in employee', async () => {
    const employee = await makeUser({ firstName: 'Aarav', lastName: 'Mehta' });
    const token = await tokenFor(app, employee);
    const response = await request(app).get('/api/auth/me').set(auth(token));
    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, employee._id.toString());
    assert.equal(response.body.data.firstName, 'Aarav');
  });

  it('restores the session after a refresh (same token still works)', async () => {
    const employee = await makeUser({});
    const token = await tokenFor(app, employee);
    await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    const second = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    assert.equal(second.body.data.email, employee.email);
  });
});

describe('PUT /api/auth/password', () => {
  it('requires the current password', async () => {
    const employee = await makeUser({});
    const token = await tokenFor(app, employee);
    const response = await request(app)
      .put('/api/auth/password')
      .set(auth(token))
      .send({ currentPassword: 'nope', newPassword: 'NewPass@123' });
    assert.equal(response.status, 400);
    assert.match(response.body.message, /current password/i);
  });

  it('updates the password and the old one stops working', async () => {
    const employee = await makeUser({});
    const token = await tokenFor(app, employee);
    await request(app)
      .put('/api/auth/password')
      .set(auth(token))
      .send({ currentPassword: PASSWORD, newPassword: 'NewPass@123' })
      .expect(200);

    assert.equal((await login(app, employee.email, PASSWORD)).status, 401);
    assert.equal((await login(app, employee.email, 'NewPass@123')).status, 200);
  });

  it('rejects reusing the same password', async () => {
    const employee = await makeUser({});
    const token = await tokenFor(app, employee);
    const response = await request(app)
      .put('/api/auth/password')
      .set(auth(token))
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    assert.equal(response.status, 400);
  });
});

describe('role-scoped access after login', () => {
  it('exposes the correct role for each seeded account type', async () => {
    const team = await seedTeam();
    for (const [person, role] of [
      [team.hr, 'hr'],
      [team.manager, 'manager'],
      [team.employee, 'employee'],
    ]) {
      const response = await login(app, person.email);
      assert.equal(response.status, 200);
      assert.equal(response.body.data.user.systemRole, role);
    }
  });
});
