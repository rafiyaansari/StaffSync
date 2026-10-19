import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Attendance from '../src/models/Attendance.js';
import Employee from '../src/models/Employee.js';
import LeaveRequest from '../src/models/LeaveRequest.js';
import User from '../src/models/User.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, makeUser, seedTeam, tokenFor } from './helpers/factory.js';

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

const newEmployee = (overrides = {}) => ({
  firstName: 'Kavya',
  lastName: 'Rao',
  email: `kavya.${Math.random().toString(36).slice(2, 7)}@nimbuslabs.test`,
  jobTitle: 'Data Analyst',
  department: 'Finance',
  systemRole: 'employee',
  employmentType: 'Full-time',
  workMode: 'Hybrid',
  location: 'Pune, IN',
  joinDate: '2026-01-05',
  status: 'Active',
  ...overrides,
});

describe('GET /api/employees', () => {
  it('returns the directory with string ids and no password fields', async () => {
    const response = await request(app).get('/api/employees').set(auth(hrToken)).expect(200);
    assert.ok(Array.isArray(response.body.data));
    const sample = response.body.data[0];
    assert.equal(typeof sample.id, 'string');
    assert.equal(sample.passwordHash, undefined);
    assert.equal(sample.password, undefined);
    assert.ok('managerName' in sample);
    assert.ok('leave' in sample);
  });

  it('hides personal contact details from colleagues', async () => {
    const token = await tokenFor(app, team.employee);
    const response = await request(app).get('/api/employees').set(auth(token)).expect(200);
    const other = response.body.data.find((row) => row.id === team.outsider._id.toString());
    const self = response.body.data.find((row) => row.id === team.employee._id.toString());
    assert.equal(other.phone, '');
    assert.equal(other.dob, '');
    assert.equal(self.id, team.employee._id.toString());
  });

  it('shows a manager private details for their direct report only', async () => {
    await Employee.updateOne({ _id: team.employee._id }, { phone: '+91 90000 11111' });
    await Employee.updateOne({ _id: team.unrelated._id }, { phone: '+91 90000 22222' });
    const token = await tokenFor(app, team.manager);
    const response = await request(app).get('/api/employees').set(auth(token)).expect(200);
    const report = response.body.data.find((row) => row.id === team.employee._id.toString());
    const stranger = response.body.data.find((row) => row.id === team.unrelated._id.toString());
    assert.equal(report.phone, '+91 90000 11111');
    assert.equal(stranger.phone, '');
  });

  it('blocks an employee from opening another profile directly', async () => {
    const token = await tokenFor(app, team.employee);
    await request(app).get(`/api/employees/${team.unrelated._id}`).set(auth(token)).expect(403);
  });

  it('lets a manager open a direct report profile', async () => {
    const token = await tokenFor(app, team.manager);
    const response = await request(app).get(`/api/employees/${team.employee._id}`).set(auth(token)).expect(200);
    assert.equal(response.body.data.managerId, team.manager._id.toString());
  });
});

describe('POST /api/employees', () => {
  it('creates the employee and a working sign-in account', async () => {
    const payload = newEmployee({ password: 'Welcome@123' });
    const response = await request(app).post('/api/employees').set(auth(hrToken)).send(payload);
    assert.equal(response.status, 201);
    assert.equal(response.body.data.email, payload.email);
    assert.equal(response.body.data.role, 'employee');
    assert.equal(response.body.data.name, 'Kavya Rao');
    assert.match(response.body.data.employeeCode, /^EMP-\d{3}$/);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'Welcome@123' });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.id, response.body.data.id);
  });

  it('rejects duplicate emails with 409', async () => {
    const payload = newEmployee();
    await request(app).post('/api/employees').set(auth(hrToken)).send(payload).expect(201);
    const duplicate = await request(app).post('/api/employees').set(auth(hrToken)).send(payload);
    assert.equal(duplicate.status, 409);
  });

  it('validates required fields', async () => {
    const response = await request(app).post('/api/employees').set(auth(hrToken)).send({ firstName: 'Only' });
    assert.equal(response.status, 400);
    assert.ok(response.body.errors.lastName);
    assert.ok(response.body.errors.email);
    assert.ok(response.body.errors.joinDate);
  });

  it('rejects an invalid join date', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set(auth(hrToken))
      .send(newEmployee({ joinDate: '2026-13-45' }));
    assert.equal(response.status, 400);
  });

  it('links a manager when one is supplied', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set(auth(hrToken))
      .send(newEmployee({ managerId: team.manager._id.toString() }));
    assert.equal(response.status, 201);
    assert.equal(response.body.data.managerId, team.manager._id.toString());
    assert.equal(response.body.data.managerName, 'Rohan Kapoor');
  });

  it('rejects an unknown manager', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set(auth(hrToken))
      .send(newEmployee({ managerId: '000000000000000000000000' }));
    assert.equal(response.status, 400);
  });
});

describe('PUT /api/employees/:id', () => {
  it('lets an employee update their own permitted profile fields', async () => {
    const token = await tokenFor(app, team.employee);
    const response = await request(app)
      .put(`/api/employees/${team.employee._id}`)
      .set(auth(token))
      .send({ phone: '+91 90500 12345', address: 'Indiranagar, Bengaluru', skills: ['React', 'CSS'], bio: 'Frontend engineer' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.phone, '+91 90500 12345');
    assert.deepEqual(response.body.data.skills, ['React', 'CSS']);
  });

  it('blocks an employee from promoting themselves via systemRole', async () => {
    const token = await tokenFor(app, team.employee);
    const response = await request(app)
      .put(`/api/employees/${team.employee._id}`)
      .set(auth(token))
      .send({ systemRole: 'hr' });
    assert.equal(response.status, 403);
    const account = await User.findOne({ employee: team.employee._id }).lean();
    assert.equal(account.role, 'employee');
  });

  it('lets HR update role and department, keeping the account in sync', async () => {
    const response = await request(app)
      .put(`/api/employees/${team.employee._id}`)
      .set(auth(hrToken))
      .send({ systemRole: 'manager', jobTitle: 'Engineering Manager', department: 'Engineering' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.systemRole, 'manager');
    const account = await User.findOne({ employee: team.employee._id }).lean();
    assert.equal(account.role, 'manager');
  });

  it('rejects an HR user changing their own role', async () => {
    const response = await request(app)
      .put(`/api/employees/${team.hr._id}`)
      .set(auth(hrToken))
      .send({ systemRole: 'employee' });
    assert.equal(response.status, 400);
  });

  it('changes the sign-in email together with the profile email', async () => {
    const response = await request(app)
      .put(`/api/employees/${team.employee._id}`)
      .set(auth(hrToken))
      .send({ email: 'aarav.new@nimbuslabs.test' });
    assert.equal(response.status, 200);
    const account = await User.findOne({ employee: team.employee._id }).lean();
    assert.equal(account.email, 'aarav.new@nimbuslabs.test');
  });

  it('returns 404 for an unknown employee', async () => {
    await request(app).put('/api/employees/000000000000000000000000').set(auth(hrToken)).send({ phone: '1' }).expect(404);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('removes the employee, account, leave and attendance records', async () => {
    const victim = await makeUser({ firstName: 'Temp', lastName: 'Worker' });
    await LeaveRequest.create({
      employee: victim._id,
      type: 'annual',
      from: '2026-12-01',
      to: '2026-12-02',
      days: 2,
      appliedOn: '2026-11-20',
    });
    await Attendance.create({ employee: victim._id, date: '2026-11-20', status: 'Present', checkIn: '09:00', hours: 0 });

    const response = await request(app).delete(`/api/employees/${victim._id}`).set(auth(hrToken));
    assert.equal(response.status, 200);
    assert.equal(await Employee.findById(victim._id), null);
    assert.equal(await User.countDocuments({ employee: victim._id }), 0);
    assert.equal(await LeaveRequest.countDocuments({ employee: victim._id }), 0);
    assert.equal(await Attendance.countDocuments({ employee: victim._id }), 0);
  });

  it('refuses to delete your own account', async () => {
    const response = await request(app).delete(`/api/employees/${team.hr._id}`).set(auth(hrToken));
    assert.equal(response.status, 400);
  });

  it('protects the last HR administrator', async () => {
    // An HR profile without its own sign-in account still counts as HR.
    const extraHr = await Employee.create({
      firstName: 'Solo',
      lastName: 'HR',
      email: 'solo.hr@nimbuslabs.test',
      jobTitle: 'HR Lead',
      department: 'People Ops',
      systemRole: 'hr',
      joinDate: '2025-05-01',
    });
    const response = await request(app).delete(`/api/employees/${extraHr._id}`).set(auth(hrToken));
    assert.equal(response.status, 409);
  });

  it('blocks employees from deleting anyone', async () => {
    const token = await tokenFor(app, team.employee);
    await request(app).delete(`/api/employees/${team.outsider._id}`).set(auth(token)).expect(403);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).delete('/api/employees/000000000000000000000000').set(auth(hrToken)).expect(404);
  });
});
