import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Notification from '../src/models/Notification.js';
import TrainingProgram from '../src/models/TrainingProgram.js';
import { clearDatabase, startTestApp, stopTestApp } from './helpers/app.js';
import { auth, seedTeam, tokenFor } from './helpers/factory.js';
import { todayISO } from '../src/utils/dates.js';

let app;
let team;
let tokens;
let program;

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
  program = await TrainingProgram.create({
    title: 'Workplace POSH awareness',
    category: 'Compliance',
    description: 'Annual mandatory training.',
    format: 'Self-paced',
    level: 'All levels',
    durationMins: 45,
    modules: 3,
    instructor: 'People Ops',
    dueDate: '2026-11-30',
    mandatory: true,
    tone: 'violet',
  });
});

const enroll = (token, id = program._id) =>
  request(app).post(`/api/training/${id}/enroll`).set(auth(token)).send({});
const setProgress = (token, progress, id = program._id, body = {}) =>
  request(app)
    .patch(`/api/training/${id}/progress`)
    .set(auth(token))
    .send({ progress, ...body });

describe('GET /api/training', () => {
  it('returns the catalogue with enrollments in the UI shape', async () => {
    await enroll(tokens.employee).expect(201);
    const response = await request(app).get('/api/training').set(auth(tokens.employee)).expect(200);
    assert.equal(response.body.data.length, 1);
    const course = response.body.data[0];
    assert.equal(typeof course.id, 'string');
    assert.equal(course.enrolled[0].employeeId, team.employee._id.toString());
    assert.equal(course.enrolled[0].status, 'Not started');
  });
});

describe('POST /api/training/:id/enroll', () => {
  it('enrolls the signed-in employee', async () => {
    const response = await enroll(tokens.employee);
    assert.equal(response.status, 201);
    const entry = response.body.data.enrolled.find((row) => row.employeeId === team.employee._id.toString());
    assert.equal(entry.progress, 0);
    assert.equal(entry.status, 'Not started');
    assert.equal(entry.assignedOn, todayISO());
  });

  it('rejects a duplicate enrollment', async () => {
    await enroll(tokens.employee).expect(201);
    const response = await enroll(tokens.employee);
    assert.equal(response.status, 409);
  });

  it('blocks enrolling someone else', async () => {
    const response = await request(app)
      .post(`/api/training/${program._id}/enroll`)
      .set(auth(tokens.employee))
      .send({ employeeId: team.outsider._id.toString() });
    assert.equal(response.status, 403);
  });

  it('returns 404 for an unknown programme', async () => {
    const response = await enroll(tokens.employee, '000000000000000000000000');
    assert.equal(response.status, 404);
  });
});

describe('PATCH /api/training/:id/progress', () => {
  it('moves through Not started → In progress → Completed', async () => {
    await enroll(tokens.employee).expect(201);

    let response = await setProgress(tokens.employee, 40);
    assert.equal(response.status, 200);
    let entry = response.body.data.enrolled.find((row) => row.employeeId === team.employee._id.toString());
    assert.equal(entry.progress, 40);
    assert.equal(entry.status, 'In progress');
    assert.equal(entry.completedOn, null);

    response = await setProgress(tokens.employee, 100);
    entry = response.body.data.enrolled.find((row) => row.employeeId === team.employee._id.toString());
    assert.equal(entry.status, 'Completed');
    assert.equal(entry.completedOn, todayISO());

    response = await setProgress(tokens.employee, 0);
    entry = response.body.data.enrolled.find((row) => row.employeeId === team.employee._id.toString());
    assert.equal(entry.status, 'Not started');
    assert.equal(entry.completedOn, null);
  });

  it('rejects progress above 100 or below 0', async () => {
    await enroll(tokens.employee).expect(201);
    await setProgress(tokens.employee, 140).expect(400);
    await setProgress(tokens.employee, -5).expect(400);
  });

  it('rejects progress for a programme you are not enrolled in', async () => {
    const response = await setProgress(tokens.employee, 50);
    assert.equal(response.status, 400);
  });

  it('blocks updating someone else’s progress', async () => {
    await enroll(tokens.employee).expect(201);
    const response = await setProgress(tokens.manager, 100, program._id, {
      employeeId: team.employee._id.toString(),
    });
    assert.equal(response.status, 403);
  });

  it('lets HR update progress on behalf of an employee', async () => {
    await enroll(tokens.employee).expect(201);
    const response = await setProgress(tokens.hr, 100, program._id, {
      employeeId: team.employee._id.toString(),
    });
    assert.equal(response.status, 200);
  });
});

describe('POST /api/training/:id/assign', () => {
  const assign = (token, employeeIds, extra = {}) =>
    request(app)
      .post(`/api/training/${program._id}/assign`)
      .set(auth(token))
      .send({ employeeIds, ...extra });

  it('assigns to several employees and notifies each one', async () => {
    const response = await assign(tokens.hr, [team.employee._id.toString(), team.unrelated._id.toString()], {
      dueDate: '2026-12-15',
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.enrolled.length, 2);
    assert.equal(response.body.data.dueDate, '2026-12-15');

    const notifications = await Notification.find({ type: 'training', recipient: { $ne: null } }).lean();
    assert.equal(notifications.length, 2);
  });

  it('does not duplicate someone already enrolled', async () => {
    await enroll(tokens.employee).expect(201);
    const response = await assign(tokens.hr, [team.employee._id.toString(), team.outsider._id.toString()]);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.enrolled.length, 2);
  });

  it('lets a manager assign within their direct team', async () => {
    const response = await assign(tokens.manager, [team.employee._id.toString()]);
    assert.equal(response.status, 200);
  });

  it('blocks a manager assigning to someone outside their team', async () => {
    const response = await assign(tokens.manager, [team.unrelated._id.toString()]);
    assert.equal(response.status, 403);
  });

  it('rejects an empty selection', async () => {
    await assign(tokens.hr, []).expect(400);
  });

  it('rejects an unknown employee id', async () => {
    const response = await assign(tokens.hr, ['000000000000000000000000']);
    assert.equal(response.status, 400);
  });
});
