import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Attendance from '../src/models/Attendance.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, seedTeam, tokenFor } from './helpers/factory.js';
import { todayISO } from '../src/utils/dates.js';

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
  };
});

const clockIn = (token, body = {}) => request(app).post('/api/attendance/clock-in').set(auth(token)).send(body);
const clockOut = (token, body = {}) => request(app).post('/api/attendance/clock-out').set(auth(token)).send(body);

describe('POST /api/attendance/clock-in', () => {
  it('creates the day’s record with an on-time or late status', async () => {
    const response = await clockIn(tokens.employee, { mode: 'office' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.date, todayISO());
    assert.match(response.body.data.checkIn, /^\d{2}:\d{2}$/);
    assert.ok(['Present', 'Late'].includes(response.body.data.status));
    assert.equal(response.body.data.employeeId, team.employee._id.toString());
  });

  it('marks remote check-ins as WFH', async () => {
    const response = await clockIn(tokens.employee, { mode: 'remote' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, 'WFH');
    assert.equal(response.body.data.mode, 'remote');
    assert.equal(response.body.data.note, 'Working remotely');
  });

  it('rejects a second clock-in on the same day', async () => {
    await clockIn(tokens.employee).expect(201);
    const response = await clockIn(tokens.employee);
    assert.equal(response.status, 409);
    assert.match(response.body.message, /already clocked in/);
  });

  it('rejects an invalid mode', async () => {
    const response = await clockIn(tokens.employee, { mode: 'moon-base' });
    assert.equal(response.status, 400);
  });

  it('stores exactly one record per employee per day', async () => {
    await clockIn(tokens.employee).expect(201);
    await clockIn(tokens.employee).expect(409);
    assert.equal(await Attendance.countDocuments({ employee: team.employee._id, date: todayISO() }), 1);
  });
});

describe('POST /api/attendance/clock-out', () => {
  it('records a check-out and computes hours (minus a 30 minute break)', async () => {
    const start = await clockIn(tokens.employee).expect(201);
    const response = await clockOut(tokens.employee);
    assert.equal(response.status, 200);
    assert.match(response.body.data.checkOut, /^\d{2}:\d{2}$/);
    assert.equal(typeof response.body.data.hours, 'number');
    assert.ok(response.body.data.hours >= 0 && response.body.data.hours <= 23.5);
    assert.equal(response.body.data.id, start.body.data.id);
  });

  it('refuses to clock out before clocking in', async () => {
    const response = await clockOut(tokens.employee);
    assert.equal(response.status, 400);
    assert.match(response.body.message, /clock in first/);
  });

  it('refuses a second clock-out', async () => {
    await clockIn(tokens.employee).expect(201);
    await clockOut(tokens.employee).expect(200);
    const response = await clockOut(tokens.employee);
    assert.equal(response.status, 409);
    assert.match(response.body.message, /already clocked out/);
  });
});

describe('GET /api/attendance', () => {
  beforeEach(async () => {
    await Attendance.create([
      { employee: team.employee._id, date: '2026-10-01', status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.5 },
      { employee: team.employee._id, date: '2026-10-02', status: 'Late', checkIn: '10:05', checkOut: '18:30', hours: 7.9 },
      { employee: team.unrelated._id, date: '2026-10-02', status: 'Present', checkIn: '09:00', checkOut: '18:00', hours: 8.5 },
    ]);
  });

  it('filters by date range', async () => {
    const response = await request(app)
      .get('/api/attendance?from=2026-10-02&to=2026-10-02')
      .set(auth(tokens.hr))
      .expect(200);
    assert.equal(response.body.data.length, 2);
    assert.ok(response.body.data.every((row) => row.date === '2026-10-02'));
  });

  it('filters by employee for HR', async () => {
    const response = await request(app)
      .get(`/api/attendance?employeeId=${team.employee._id}`)
      .set(auth(tokens.hr))
      .expect(200);
    assert.equal(response.body.data.length, 2);
  });

  it('supports optional pagination metadata', async () => {
    const response = await request(app)
      .get('/api/attendance?page=1&limit=1')
      .set(auth(tokens.hr))
      .expect(200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.meta.total, 3);
    assert.equal(response.body.meta.pages, 3);
  });

  it('returns today’s records for the signed-in scope', async () => {
    await clockIn(tokens.employee, { mode: 'remote' }).expect(201);
    const own = await request(app).get('/api/attendance/today').set(auth(tokens.employee)).expect(200);
    assert.equal(own.body.data.length, 1);
    assert.equal(own.body.data[0].status, 'WFH');

    const hr = await request(app).get('/api/attendance/today').set(auth(tokens.hr)).expect(200);
    assert.ok(hr.body.data.some((row) => row.employeeId === team.employee._id.toString()));
  });

  it('rejects an invalid date filter', async () => {
    await request(app).get('/api/attendance?from=10-01-2026').set(auth(tokens.hr)).expect(400);
  });
});
