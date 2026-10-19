import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Employee from '../src/models/Employee.js';
import LeaveRequest from '../src/models/LeaveRequest.js';
import Notification from '../src/models/Notification.js';
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
  };
});

const apply = (token, body) =>
  request(app)
    .post('/api/leaves')
    .set(auth(token))
    .send({ type: 'annual', from: '2026-11-02', to: '2026-11-04', reason: 'Family wedding', ...body });

describe('POST /api/leaves', () => {
  it('creates a pending request with computed days and join fields', async () => {
    const response = await apply(tokens.employee, {});
    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, 'Pending');
    assert.equal(response.body.data.days, 3);
    assert.equal(response.body.data.employeeId, team.employee._id.toString());
    assert.equal(response.body.data.employeeName, 'Aarav Mehta');
    assert.equal(response.body.data.department, 'Engineering');
    assert.match(response.body.data.appliedOn, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('notifies HR and the reporting manager', async () => {
    await apply(tokens.employee, {});
    const hrNotification = await Notification.findOne({ audienceRoles: 'hr', type: 'leave' }).lean();
    const managerNotification = await Notification.findOne({ recipient: team.manager._id, type: 'leave' }).lean();
    assert.ok(hrNotification, 'HR should be notified');
    assert.ok(managerNotification, 'the manager should be notified');
  });

  it('rejects an end date before the start date', async () => {
    const response = await apply(tokens.employee, { from: '2026-11-05', to: '2026-11-02' });
    assert.equal(response.status, 400);
    assert.match(response.body.message, /before the start date/);
  });

  it('rejects malformed dates', async () => {
    const response = await apply(tokens.employee, { from: '02-11-2026' });
    assert.equal(response.status, 400);
    assert.ok(response.body.errors.from);
  });

  it('rejects overlapping pending or approved requests', async () => {
    await apply(tokens.employee, {}).expect(201);
    const response = await apply(tokens.employee, { from: '2026-11-04', to: '2026-11-06' });
    assert.equal(response.status, 409);
    assert.match(response.body.message, /already have a leave request/);
  });

  it('allows a request for the same single day', async () => {
    const response = await apply(tokens.employee, { type: 'sick', from: '2026-11-10', to: '2026-11-10' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.days, 1);
  });

  it('rejects a request larger than the remaining balance', async () => {
    await Employee.updateOne({ _id: team.employee._id }, { 'leave.casual.used': 5 });
    const response = await apply(tokens.employee, { type: 'casual', from: '2026-11-16', to: '2026-11-18' });
    assert.equal(response.status, 400);
    assert.match(response.body.message, /only 1 casual days remain/);
  });

  it('lets unpaid leave exceed the balance', async () => {
    const response = await apply(tokens.employee, { type: 'unpaid', from: '2026-11-16', to: '2026-11-30' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.days, 15);
  });

  it('blocks applying on behalf of someone else', async () => {
    const response = await apply(tokens.employee, { employeeId: team.outsider._id.toString() });
    assert.equal(response.status, 403);
  });
});

describe('PATCH /api/leaves/:id/status', () => {
  let leave;
  beforeEach(async () => {
    const response = await apply(tokens.employee, {});
    leave = response.body.data;
  });

  it('approves the request, records the reviewer and increases the used balance', async () => {
    const before = await Employee.findById(team.employee._id).lean();
    const response = await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Approved', note: 'Enjoy the wedding' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'Approved');
    assert.equal(response.body.data.reviewedBy, 'Priya Sharma');
    assert.equal(response.body.data.note, 'Enjoy the wedding');

    const after = await Employee.findById(team.employee._id).lean();
    assert.equal(after.leave.annual.used, before.leave.annual.used + 3);
  });

  it('rejects the request without touching the balance', async () => {
    const before = await Employee.findById(team.employee._id).lean();
    const response = await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set(auth(tokens.manager))
      .send({ status: 'Rejected', note: 'Team release week' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'Rejected');

    const after = await Employee.findById(team.employee._id).lean();
    assert.equal(after.leave.annual.used, before.leave.annual.used);
  });

  it('keeps used days capped at the entitlement', async () => {
    await Employee.updateOne(
      { _id: team.employee._id },
      { 'leave.annual.total': 3, 'leave.annual.used': 2 },
    );
    await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Approved' })
      .expect(200);
    const employee = await Employee.findById(team.employee._id).lean();
    assert.equal(employee.leave.annual.used, 3);
  });

  it('does not consume unpaid leave', async () => {
    const unpaid = await apply(tokens.employee, { type: 'unpaid', from: '2026-12-01', to: '2026-12-03' });
    const before = await Employee.findById(team.employee._id).lean();
    await request(app)
      .patch(`/api/leaves/${unpaid.body.data.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Approved' })
      .expect(200);
    const after = await Employee.findById(team.employee._id).lean();
    assert.deepEqual(after.leave, before.leave);
  });

  it('sends the employee a decision notification', async () => {
    await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Approved' })
      .expect(200);
    const notification = await Notification.findOne({ recipient: team.employee._id, type: 'leave' }).lean();
    assert.ok(notification);
    assert.match(notification.title, /approved/);
  });

  it('rejects a second decision', async () => {
    await request(app).patch(`/api/leaves/${leave.id}/status`).set(auth(tokens.hr)).send({ status: 'Approved' }).expect(200);
    const response = await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Rejected' });
    assert.equal(response.status, 400);
    assert.match(response.body.message, /already been reviewed/);
  });

  it('rejects an invalid decision value', async () => {
    const response = await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Pending' });
    assert.equal(response.status, 400);
  });

  it('stops HR from reviewing their own request', async () => {
    const own = await apply(tokens.hr, { from: '2026-12-10', to: '2026-12-11' });
    const response = await request(app)
      .patch(`/api/leaves/${own.body.data.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Approved' });
    assert.equal(response.status, 403);
  });

  it('returns 404 for an unknown request', async () => {
    await request(app)
      .patch('/api/leaves/000000000000000000000000/status')
      .set(auth(tokens.hr))
      .send({ status: 'Approved' })
      .expect(404);
  });
});

describe('PATCH /api/leaves/:id/cancel', () => {
  it('cancels your own pending request', async () => {
    const created = await apply(tokens.employee, {});
    const response = await request(app)
      .patch(`/api/leaves/${created.body.data.id}/cancel`)
      .set(auth(tokens.employee));
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'Cancelled');
    assert.match(response.body.data.note, /Withdrawn/);
  });

  it('refuses to cancel an already reviewed request', async () => {
    const created = await apply(tokens.employee, {});
    await request(app)
      .patch(`/api/leaves/${created.body.data.id}/status`)
      .set(auth(tokens.hr))
      .send({ status: 'Approved' })
      .expect(200);
    const response = await request(app)
      .patch(`/api/leaves/${created.body.data.id}/cancel`)
      .set(auth(tokens.employee));
    assert.equal(response.status, 400);
  });

  it('lets the employee apply again after cancelling', async () => {
    const created = await apply(tokens.employee, {});
    await request(app).patch(`/api/leaves/${created.body.data.id}/cancel`).set(auth(tokens.employee)).expect(200);
    await apply(tokens.employee, {}).expect(201);
  });
});

describe('GET /api/leaves', () => {
  it('shows an employee only their own requests', async () => {
    await apply(tokens.employee, {});
    await apply(tokens.outsiderToken || tokens.hr, { from: '2026-12-20', to: '2026-12-21' });
    const response = await request(app).get('/api/leaves').set(auth(tokens.employee)).expect(200);
    assert.ok(response.body.data.length >= 1);
    assert.ok(response.body.data.every((row) => row.employeeId === team.employee._id.toString()));
  });

  it('shows HR the whole company', async () => {
    await apply(tokens.employee, {});
    await apply(tokens.hr, { from: '2026-12-20', to: '2026-12-21' });
    const response = await request(app).get('/api/leaves').set(auth(tokens.hr)).expect(200);
    assert.equal(response.body.data.length, 2);
  });

  it('filters by status', async () => {
    const created = await apply(tokens.employee, {});
    await request(app).patch(`/api/leaves/${created.body.data.id}/cancel`).set(auth(tokens.employee)).expect(200);
    const pending = await request(app).get('/api/leaves?status=Pending').set(auth(tokens.hr)).expect(200);
    const cancelled = await request(app).get('/api/leaves?status=Cancelled').set(auth(tokens.hr)).expect(200);
    assert.equal(pending.body.data.length, 0);
    assert.equal(cancelled.body.data.length, 1);
  });

  it('keeps the seeded mock records out of the way (clean collection per test)', async () => {
    assert.equal(await LeaveRequest.countDocuments({}), 0);
  });
});
