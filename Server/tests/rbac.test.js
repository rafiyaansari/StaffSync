import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Attendance from '../src/models/Attendance.js';
import LeaveRequest from '../src/models/LeaveRequest.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, seedTeam, tokenFor } from './helpers/factory.js';

let app;
let team;
let tokens;

before(async () => {
  app = await startTestApp();
});

after(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  await clearDatabase();
  team = await seedTeam();
  tokens = {
    hr: await tokenFor(app, team.hr),
    manager: await tokenFor(app, team.manager),
    employee: await tokenFor(app, team.employee),
    unrelated: await tokenFor(app, team.unrelated),
  };
});

const protectedRoutes = [
  ['get', '/api/employees'],
  ['get', '/api/leaves'],
  ['get', '/api/attendance'],
  ['get', '/api/announcements'],
  ['get', '/api/training'],
  ['get', '/api/notifications'],
  ['get', '/api/registrations'],
  ['get', '/api/settings/000000000000000000000000'],
  ['get', '/api/activity'],
  ['get', '/api/auth/me'],
  ['post', '/api/leaves'],
  ['post', '/api/attendance/clock-in'],
];

describe('unauthenticated access', () => {
  for (const [method, path] of protectedRoutes) {
    it(`blocks ${method.toUpperCase()} ${path}`, async () => {
      const response = await request(app)[method](path);
      assert.equal(response.status, 401, `${path} should require auth`);
      assert.ok(response.body.message);
    });
  }

  it('rejects an expired/invalid token', async () => {
    const response = await request(app).get('/api/employees').set(auth('not-a-real-token'));
    assert.equal(response.status, 401);
  });
});

describe('HR-only endpoints', () => {
  it('blocks employees and managers from employee CRUD', async () => {
    for (const token of [tokens.employee, tokens.manager]) {
      await request(app)
        .post('/api/employees')
        .set(auth(token))
        .send({ firstName: 'X', lastName: 'Y', email: 'x@y.test', jobTitle: 'QA', department: 'Engineering', joinDate: '2024-01-01' })
        .expect(403);
      await request(app).delete(`/api/employees/${team.employee._id}`).set(auth(token)).expect(403);
    }
  });

  it('blocks non-HR from registration review', async () => {
    await request(app).get('/api/registrations').set(auth(tokens.employee)).expect(403);
    await request(app).get('/api/registrations').set(auth(tokens.manager)).expect(403);
    await request(app)
      .patch('/api/registrations/000000000000000000000000')
      .set(auth(tokens.employee))
      .send({ status: 'Approved' })
      .expect(403);
  });

  it('blocks non-HR from announcement writes', async () => {
    await request(app).post('/api/announcements').set(auth(tokens.employee)).send({ title: 'Hi' }).expect(403);
    await request(app).patch('/api/announcements/000000000000000000000000').set(auth(tokens.employee)).send({ title: 'Hi' }).expect(403);
    await request(app).delete('/api/announcements/000000000000000000000000').set(auth(tokens.manager)).expect(403);
  });

  it('lets HR create an announcement', async () => {
    const response = await request(app)
      .post('/api/announcements')
      .set(auth(tokens.hr))
      .send({ title: 'Quarterly town hall', category: 'Event', body: 'Thursday 4:30 PM' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.authorId, team.hr._id.toString());
    assert.ok(response.body.data.readBy.includes(team.hr._id.toString()));
  });
});

describe('leave permissions', () => {
  it('blocks an employee from deciding leave (role middleware)', async () => {
    const leave = await LeaveRequest.create({
      employee: team.employee._id,
      type: 'annual',
      from: '2026-11-02',
      to: '2026-11-03',
      days: 2,
      appliedOn: '2026-10-19',
    });
    const response = await request(app)
      .patch(`/api/leaves/${leave._id}/status`)
      .set(auth(tokens.employee))
      .send({ status: 'Approved' });
    assert.equal(response.status, 403);
  });

  it('lets the direct manager approve their report’s leave', async () => {
    const leave = await LeaveRequest.create({
      employee: team.employee._id,
      type: 'casual',
      from: '2026-11-02',
      to: '2026-11-02',
      days: 1,
      appliedOn: '2026-10-19',
    });
    const response = await request(app)
      .patch(`/api/leaves/${leave._id}/status`)
      .set(auth(tokens.manager))
      .send({ status: 'Approved', note: 'Approved' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'Approved');
    assert.equal(response.body.data.reviewedBy, 'Rohan Kapoor');
  });

  it('blocks a manager from approving someone outside their team', async () => {
    const leave = await LeaveRequest.create({
      employee: team.unrelated._id,
      type: 'annual',
      from: '2026-11-04',
      to: '2026-11-05',
      days: 2,
      appliedOn: '2026-10-19',
    });
    const response = await request(app)
      .patch(`/api/leaves/${leave._id}/status`)
      .set(auth(tokens.manager))
      .send({ status: 'Approved' });
    assert.equal(response.status, 403);
  });

  it('blocks an employee from cancelling someone else’s leave', async () => {
    const leave = await LeaveRequest.create({
      employee: team.outsider._id,
      type: 'annual',
      from: '2026-11-06',
      to: '2026-11-06',
      days: 1,
      appliedOn: '2026-10-19',
    });
    const response = await request(app).patch(`/api/leaves/${leave._id}/cancel`).set(auth(tokens.employee));
    assert.equal(response.status, 403);
  });
});

describe('attendance scoping', () => {
  beforeEach(async () => {
    await Attendance.create([
      { employee: team.employee._id, date: '2026-10-16', status: 'Present', checkIn: '09:10', checkOut: '18:10', hours: 8.5 },
      { employee: team.unrelated._id, date: '2026-10-16', status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.5 },
    ]);
  });

  it('returns only the employee’s own records', async () => {
    const response = await request(app).get('/api/attendance').set(auth(tokens.employee)).expect(200);
    const employeeIds = new Set(response.body.data.map((row) => row.employeeId));
    assert.deepEqual([...employeeIds], [team.employee._id.toString()]);
  });

  it('includes direct reports for a manager, but not unrelated staff', async () => {
    const response = await request(app).get('/api/attendance').set(auth(tokens.manager)).expect(200);
    const ids = new Set(response.body.data.map((row) => row.employeeId));
    assert.ok(ids.has(team.employee._id.toString()));
    assert.ok(!ids.has(team.unrelated._id.toString()));
  });

  it('returns everything for HR', async () => {
    const response = await request(app).get('/api/attendance').set(auth(tokens.hr)).expect(200);
    assert.equal(response.body.data.length, 2);
  });

  it('rejects asking for another employee’s attendance', async () => {
    const response = await request(app)
      .get(`/api/attendance?employeeId=${team.unrelated._id}`)
      .set(auth(tokens.employee));
    assert.equal(response.status, 403);
  });

  it('only allows clocking yourself in', async () => {
    const response = await request(app)
      .post('/api/attendance/clock-in')
      .set(auth(tokens.employee))
      .send({ employeeId: team.unrelated._id.toString(), mode: 'office' });
    assert.equal(response.status, 403);
  });
});

describe('settings and profile permissions', () => {
  it('blocks reading another employee’s preferences', async () => {
    await request(app).get(`/api/settings/${team.unrelated._id}`).set(auth(tokens.employee)).expect(403);
  });

  it('allows reading your own preferences', async () => {
    const response = await request(app).get(`/api/settings/${team.employee._id}`).set(auth(tokens.employee));
    assert.equal(response.status, 200);
    assert.equal(response.body.data.emailOnLeave, true);
  });

  it('blocks editing another employee’s profile', async () => {
    await request(app)
      .put(`/api/employees/${team.unrelated._id}`)
      .set(auth(tokens.employee))
      .send({ phone: '+91 90000 00000' })
      .expect(403);
  });

  it('blocks a manager from editing a direct report’s job title', async () => {
    await request(app)
      .put(`/api/employees/${team.employee._id}`)
      .set(auth(tokens.manager))
      .send({ jobTitle: 'Staff Engineer' })
      .expect(403);
  });

  it('blocks an employee from assigning training', async () => {
    await request(app)
      .post('/api/training/000000000000000000000000/assign')
      .set(auth(tokens.employee))
      .send({ employeeIds: [team.employee._id.toString()] })
      .expect(403);
  });
});
