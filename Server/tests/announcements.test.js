import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Announcement from '../src/models/Announcement.js';
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

const create = (body = {}) =>
  request(app)
    .post('/api/announcements')
    .set(auth(tokens.hr))
    .send({ title: 'Q3 town hall', category: 'Event', body: 'Thursday at 4:30 PM in the atrium.', ...body });

describe('POST /api/announcements', () => {
  it('publishes the announcement and notifies the company', async () => {
    const response = await create();
    assert.equal(response.status, 201);
    assert.equal(response.body.data.title, 'Q3 town hall');
    assert.equal(response.body.data.authorName, 'Priya Sharma');
    assert.ok(response.body.data.readBy.includes(team.hr._id.toString()));

    const notification = await Notification.findOne({ type: 'announcement', recipient: null }).lean();
    assert.ok(notification);
    assert.deepEqual(notification.audienceRoles.sort(), ['employee', 'hr', 'manager']);
  });

  it('rejects an empty title', async () => {
    const response = await create({ title: '   ' });
    assert.equal(response.status, 400);
  });

  it('accepts pinning and a custom tone', async () => {
    const response = await create({ pinned: true, tone: 'violet' });
    assert.equal(response.body.data.pinned, true);
    assert.equal(response.body.data.tone, 'violet');
  });
});

describe('GET /api/announcements', () => {
  it('orders pinned posts first', async () => {
    await create({ title: 'Older', date: '2026-10-01' });
    await create({ title: 'Pinned', pinned: true });
    const response = await request(app).get('/api/announcements').set(auth(tokens.employee)).expect(200);
    assert.equal(response.body.data[0].title, 'Pinned');
  });

  it('hides HR-only posts from employees and managers', async () => {
    await create({ title: 'Everyone', audience: 'Everyone' });
    await create({ title: 'Managers', audience: 'Managers' });
    await create({ title: 'HR only', audience: 'HR only' });

    const employee = await request(app).get('/api/announcements').set(auth(tokens.employee)).expect(200);
    assert.deepEqual(employee.body.data.map((item) => item.title), ['Everyone']);

    const manager = await request(app).get('/api/announcements').set(auth(tokens.manager)).expect(200);
    assert.deepEqual(manager.body.data.map((item) => item.title).sort(), ['Everyone', 'Managers']);

    const hr = await request(app).get('/api/announcements').set(auth(tokens.hr)).expect(200);
    assert.equal(hr.body.data.length, 3);
  });
});

describe('PATCH /api/announcements/:id', () => {
  it('updates an announcement', async () => {
    const created = await create();
    const response = await request(app)
      .patch(`/api/announcements/${created.body.data.id}`)
      .set(auth(tokens.hr))
      .send({ title: 'Q3 town hall — moved to Friday', pinned: true });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.title, 'Q3 town hall — moved to Friday');
    assert.equal(response.body.data.pinned, true);
  });

  it('returns 404 for an unknown announcement', async () => {
    await request(app)
      .patch('/api/announcements/000000000000000000000000')
      .set(auth(tokens.hr))
      .send({ title: 'Ghost' })
      .expect(404);
  });
});

describe('POST /api/announcements/:id/read', () => {
  it('marks the post read for the signed-in employee, once', async () => {
    const created = await create();
    const id = created.body.data.id;
    const first = await request(app).post(`/api/announcements/${id}/read`).set(auth(tokens.employee)).expect(200);
    assert.ok(first.body.data.readBy.includes(team.employee._id.toString()));
    const second = await request(app).post(`/api/announcements/${id}/read`).set(auth(tokens.employee)).expect(200);
    assert.equal(second.body.data.readBy.filter((value) => value === team.employee._id.toString()).length, 1);
  });

  it('refuses to mark an announcement the employee cannot see', async () => {
    const created = await create({ audience: 'HR only' });
    await request(app)
      .post(`/api/announcements/${created.body.data.id}/read`)
      .set(auth(tokens.employee))
      .expect(403);
  });
});

describe('DELETE /api/announcements/:id', () => {
  it('removes the announcement', async () => {
    const created = await create();
    await request(app).delete(`/api/announcements/${created.body.data.id}`).set(auth(tokens.hr)).expect(200);
    assert.equal(await Announcement.countDocuments({}), 0);
  });
});
