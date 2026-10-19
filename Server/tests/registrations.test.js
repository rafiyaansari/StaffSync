import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Employee from '../src/models/Employee.js';
import RegistrationRequest from '../src/models/RegistrationRequest.js';
import User from '../src/models/User.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, seedTeam, tokenFor } from './helpers/factory.js';

let app;
let team;
let hrToken;

before(async () => {
  app = await startTestApp();
});

after(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  await clearDatabase();
  team = await seedTeam();
  hrToken = await tokenFor(app, team.hr);
});

const registration = {
  firstName: 'Ishita',
  lastName: 'Khanna',
  email: 'ishita.khanna@example.com',
  password: 'StrongPass@123',
  phone: '+91 98201 55387',
  department: 'Design',
  jobTitle: 'Product Designer',
  employmentType: 'Full-time',
  location: 'Mumbai, IN',
  startDate: '2026-11-01',
};

const submitRegistration = () => request(app).post('/api/auth/register').send(registration);

describe('registration review', () => {
  it('lists pending requests for HR with join fields', async () => {
    await submitRegistration().expect(201);
    const response = await request(app).get('/api/registrations').set(auth(hrToken)).expect(200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].firstName, 'Ishita');
    assert.equal(response.body.data[0].status, 'Pending');
    assert.equal(response.body.data[0].employeeId, null);
  });

  it('approves a request: creates the employee, activates the account and allows sign-in', async () => {
    const created = await submitRegistration();
    const id = created.body.data.request.id;

    const response = await request(app)
      .patch(`/api/registrations/${id}`)
      .set(auth(hrToken))
      .send({ status: 'Approved', note: 'Welcome aboard' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'Approved');
    assert.ok(response.body.data.employeeId);
    assert.equal(response.body.data.reviewedBy, 'Priya Sharma');

    const employee = await Employee.findById(response.body.data.employeeId).lean();
    assert.equal(employee.email, registration.email);
    assert.equal(employee.department, 'Design');
    assert.equal(employee.status, 'Probation');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registration.email, password: registration.password });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.id, response.body.data.employeeId.toString());
  });

  it('rejects a second decision on the same request', async () => {
    const created = await submitRegistration();
    await request(app)
      .patch(`/api/registrations/${created.body.data.request.id}`)
      .set(auth(hrToken))
      .send({ status: 'Approved' })
      .expect(200);
    const response = await request(app)
      .patch(`/api/registrations/${created.body.data.request.id}`)
      .set(auth(hrToken))
      .send({ status: 'Rejected' });
    assert.equal(response.status, 400);
  });

  it('declines a request and blocks that account from signing in', async () => {
    const created = await submitRegistration();
    await request(app)
      .patch(`/api/registrations/${created.body.data.request.id}`)
      .set(auth(hrToken))
      .send({ status: 'Rejected', note: 'No open design roles right now' })
      .expect(200);

    const user = await User.findOne({ email: registration.email }).lean();
    assert.equal(user.status, 'rejected');
    assert.equal(await Employee.countDocuments({ email: registration.email }), 0);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registration.email, password: registration.password });
    assert.equal(login.status, 403);
    assert.match(login.body.message, /declined/);
  });

  it('validates the decision value', async () => {
    const created = await submitRegistration();
    await request(app)
      .patch(`/api/registrations/${created.body.data.request.id}`)
      .set(auth(hrToken))
      .send({ status: 'Maybe' })
      .expect(400);
  });

  it('returns 404 for an unknown request', async () => {
    await request(app)
      .patch('/api/registrations/000000000000000000000000')
      .set(auth(hrToken))
      .send({ status: 'Approved' })
      .expect(404);
  });

  it('keeps requests and accounts in sync when HR approves a seeded request without an account', async () => {
    const seeded = await RegistrationRequest.create({
      firstName: 'Manav',
      lastName: 'Gupta',
      email: 'manav.gupta@example.com',
      department: 'Engineering',
      jobTitle: 'Backend Engineer',
      appliedOn: '2026-10-15',
    });
    const response = await request(app)
      .patch(`/api/registrations/${seeded._id}`)
      .set(auth(hrToken))
      .send({ status: 'Approved' });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.employeeId);
    assert.equal(await User.countDocuments({ email: 'manav.gupta@example.com' }), 0);
  });
});
