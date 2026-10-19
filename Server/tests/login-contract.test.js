/**
 * Regression tests for the sign-in contract.
 *
 * The UI crashed with "Cannot read properties of undefined (reading 'name')"
 * when a login response was missing `user`. The API must therefore always
 * return { data: { token, user } } on success, and must reject unusable
 * accounts with a clear message instead of a half-valid session.
 */
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import Employee from '../src/models/Employee.js';
import User from '../src/models/User.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, makeAccount, makeEmployee, PASSWORD } from './helpers/factory.js';

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

describe('POST /api/auth/login — response contract', () => {
  test('returns data.token and a complete data.user profile', async () => {
    const employee = await makeEmployee({ systemRole: 'hr', firstName: 'Priya' });
    await makeAccount(employee);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: PASSWORD })
      .expect(200);

    assert.ok(response.body.data.token, 'token must be present');
    const user = response.body.data.user;
    assert.ok(user, 'user must be present — the UI dereferences it immediately');
    assert.equal(user.id, employee._id.toString());
    assert.equal(user.name, `${employee.firstName} ${employee.lastName}`);
    assert.equal(user.systemRole, 'hr');
    assert.ok(user.email);
  });

  test('never leaks the password hash or salt', async () => {
    const employee = await makeEmployee();
    await makeAccount(employee);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: PASSWORD })
      .expect(200);

    const raw = JSON.stringify(response.body);
    assert.doesNotMatch(raw, /passwordHash/);
    assert.doesNotMatch(raw, /\$2[aby]\$/);
  });

  test('normalises email case and surrounding whitespace', async () => {
    const employee = await makeEmployee({ email: 'Mixed.Case@NimbusLabs.test' });
    await makeAccount(employee);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  MIXED.CASE@NIMBUSLABS.TEST  ', password: PASSWORD })
      .expect(200);

    assert.equal(response.body.data.user.email, 'mixed.case@nimbuslabs.test');
  });

  test('wrong password returns 401 with a readable message and no token', async () => {
    const employee = await makeEmployee();
    await makeAccount(employee);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: 'wrong-password' })
      .expect(401);

    assert.match(response.body.message, /don’t match our records/);
    assert.equal(response.body.data, undefined);
  });

  test('an account with no employee link fails with an actionable 403', async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    await User.create({
      email: 'orphan@nimbuslabs.test',
      passwordHash,
      role: 'employee',
      status: 'active',
      employee: null,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'orphan@nimbuslabs.test', password: PASSWORD })
      .expect(403);

    assert.match(response.body.message, /isn’t linked to an employee profile/);
    assert.equal(response.body.data, undefined);
  });

  test('a valid token returns the same profile from /auth/me', async () => {
    const employee = await makeEmployee({ systemRole: 'manager' });
    await makeAccount(employee);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: PASSWORD })
      .expect(200);

    const me = await request(app).get('/api/auth/me').set(auth(login.body.data.token)).expect(200);
    assert.equal(me.body.data.id, login.body.data.user.id);
    assert.equal(me.body.data.systemRole, 'manager');
  });
});

describe('POST /api/auth/login — account states', () => {
  test('pending accounts are refused with 403', async () => {
    const employee = await makeEmployee();
    await makeAccount(employee, { status: 'pending' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: PASSWORD })
      .expect(403);

    assert.match(response.body.message, /awaiting HR approval/i);
  });

  test('disabled accounts are refused with 403', async () => {
    const employee = await makeEmployee();
    await makeAccount(employee, { status: 'disabled' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: PASSWORD })
      .expect(403);

    assert.match(response.body.message, /deactivated/i);
  });

  test('an inactive employee cannot sign in even with a good password', async () => {
    const employee = await makeEmployee({ status: 'Inactive' });
    await makeAccount(employee);

    await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: PASSWORD })
      .expect(403);
  });
});
