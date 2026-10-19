import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import Announcement from '../src/models/Announcement.js';
import Attendance from '../src/models/Attendance.js';
import Employee from '../src/models/Employee.js';
import LeaveRequest from '../src/models/LeaveRequest.js';
import Notification from '../src/models/Notification.js';
import RegistrationRequest from '../src/models/RegistrationRequest.js';
import TrainingProgram from '../src/models/TrainingProgram.js';
import User from '../src/models/User.js';
import { seedDatabase } from '../seed/seed.js';
import { startTestApp, stopTestApp } from './helpers/app.js';

let app;
let tokens = {};

before(async () => {
  app = await startTestApp();
  await seedDatabase({ reset: true });
});

after(async () => {
  await stopTestApp();
});

async function login(email, password = 'StaffSync@123') {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(response.status, 200, `expected demo login to work for ${email}`);
  return response.body.data.token;
}

describe('demo seed', () => {
  it('creates the full demo workspace', async () => {
    assert.equal(await Employee.countDocuments({}), 24);
    assert.equal(await User.countDocuments({}), 24);
    assert.equal(await LeaveRequest.countDocuments({}), 16);
    assert.equal(await Attendance.countDocuments({}), 782);
    assert.equal(await Announcement.countDocuments({}), 5);
    assert.equal(await TrainingProgram.countDocuments({}), 6);
    assert.equal(await Notification.countDocuments({}), 6);
    assert.equal(await RegistrationRequest.countDocuments({}), 2);
  });

  it('hashes every seeded password', async () => {
    const user = await User.findOne({ email: 'priya.sharma@nimbuslabs.com' }).select('+passwordHash');
    assert.match(user.passwordHash, /^\$2[aby]\$/);
    assert.notEqual(user.passwordHash, 'StaffSync@123');
  });

  it('links managers to their reports', async () => {
    const rohan = await Employee.findOne({ email: 'rohan.kapoor@nimbuslabs.com' }).lean();
    const reports = await Employee.countDocuments({ managerId: rohan._id });
    assert.ok(reports >= 1, 'Rohan should manage at least one person');
    const aarav = await Employee.findOne({ email: 'aarav.mehta@nimbuslabs.com' }).lean();
    assert.equal(aarav.managerId.toString(), rohan._id.toString());
  });

  it('signs in the three demo roles', async () => {
    tokens.hr = await login('priya.sharma@nimbuslabs.com');
    tokens.manager = await login('rohan.kapoor@nimbuslabs.com');
    tokens.employee = await login('aarav.mehta@nimbuslabs.com');
    assert.ok(tokens.hr && tokens.manager && tokens.employee);
  });

  it('serves the seeded dashboard data in the exact UI shape', async () => {
    const employees = await request(app).get('/api/employees').set({ Authorization: `Bearer ${tokens.hr}` });
    assert.equal(employees.status, 200);
    assert.equal(employees.body.data.length, 24);
    assert.match(employees.body.data[0].employeeCode, /^EMP-\d{3}$/);
    assert.ok(employees.body.data[0].managerName);
    assert.ok(employees.body.data[0].leave.annual);

    const leaves = await request(app).get('/api/leaves').set({ Authorization: `Bearer ${tokens.hr}` });
    assert.equal(leaves.body.data.length, 16);
    assert.ok(leaves.body.data[0].employeeName);
    assert.ok(leaves.body.data[0].reviewedBy === null || typeof leaves.body.data[0].reviewedBy === 'string');

    const attendance = await request(app).get('/api/attendance').set({ Authorization: `Bearer ${tokens.hr}` });
    assert.equal(attendance.body.data.length, 782);

    const trainings = await request(app).get('/api/training').set({ Authorization: `Bearer ${tokens.employee}` });
    assert.equal(trainings.body.data.length, 6);
    const enrolled = trainings.body.data.flatMap((course) => course.enrolled);
    assert.ok(enrolled.length > 0);
    assert.ok(enrolled.every((entry) => typeof entry.employeeId === 'string'));

    const announcements = await request(app).get('/api/announcements').set({ Authorization: `Bearer ${tokens.employee}` });
    assert.equal(announcements.body.data.length, 5);
    assert.ok(announcements.body.data.every((post) => Array.isArray(post.readBy)));
  });

  it('is idempotent unless --reset is passed', async () => {
    const result = await seedDatabase({});
    assert.equal(result.skipped, true);
    assert.equal(await Employee.countDocuments({}), 24);
  });
});
