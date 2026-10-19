import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import Activity from '../src/models/Activity.js';
import Notification from '../src/models/Notification.js';
import Settings from '../src/models/Settings.js';
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

describe('health + errors', () => {
  it('reports API and database status', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.equal(response.body.data.status, 'ok');
    assert.equal(response.body.data.database, 'connected');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);
    assert.match(response.body.message, /No API route matches/);
  });

  it('returns a JSON 400 for malformed request bodies', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken",')
      .expect(400);
    assert.ok(response.body.message);
  });

  it('rejects requests from an origin outside CLIENT_URL', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com')
      .expect(403);
    assert.match(response.body.message, /not allowed/);
  });

  it('allows the configured client origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  it('exposes no Express fingerprint', async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.headers['x-powered-by'], undefined);
  });
});

describe('settings', () => {
  it('returns defaults before anything is saved', async () => {
    const response = await request(app).get(`/api/settings/${team.employee._id}`).set(auth(tokens.employee)).expect(200);
    assert.deepEqual(response.body.data, {
      emailOnLeave: true,
      emailOnAnnouncement: true,
      weeklyDigest: false,
      pushNotifications: true,
      compactTables: false,
      showBirthdays: true,
    });
  });

  it('persists preferences', async () => {
    const response = await request(app)
      .put(`/api/settings/${team.employee._id}`)
      .set(auth(tokens.employee))
      .send({ weeklyDigest: true, compactTables: true })
      .expect(200);
    assert.equal(response.body.data.weeklyDigest, true);
    assert.equal(response.body.data.compactTables, true);
    assert.equal(response.body.data.emailOnLeave, true);

    const stored = await Settings.findOne({ employee: team.employee._id }).lean();
    assert.equal(stored.weeklyDigest, true);
  });

  it('rejects unknown preference keys (mass-assignment guard)', async () => {
    const response = await request(app)
      .put(`/api/settings/${team.employee._id}`)
      .set(auth(tokens.employee))
      .send({ weeklyDigest: true, isAdmin: true });
    assert.equal(response.status, 400);
  });

  it('returns 404 for an unknown employee', async () => {
    await request(app).get('/api/settings/000000000000000000000000').set(auth(tokens.hr)).expect(404);
  });
});

describe('notifications', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/announcements')
      .set(auth(tokens.hr))
      .send({ title: 'Wellness week', body: 'Five days of small resets.' })
      .expect(201);
    await Notification.create({
      recipient: team.unrelated._id,
      type: 'leave',
      title: 'Your leave was approved',
      body: 'Private notification',
    });
  });

  it('lists broadcasts and personal notifications for the right audience', async () => {
    const employee = await request(app).get('/api/notifications').set(auth(tokens.employee)).expect(200);
    assert.equal(employee.body.data.length, 1);
    assert.equal(employee.body.data[0].read, false);

    const hr = await request(app).get('/api/notifications').set(auth(tokens.hr)).expect(200);
    assert.equal(hr.body.data.length, 1);
  });

  it('marks one notification as read', async () => {
    const list = await request(app).get('/api/notifications').set(auth(tokens.employee)).expect(200);
    const id = list.body.data[0].id;
    const response = await request(app).patch(`/api/notifications/${id}/read`).set(auth(tokens.employee)).expect(200);
    assert.equal(response.body.data.read, true);
  });

  it('blocks reading someone else’s notification', async () => {
    const personal = await Notification.findOne({ recipient: team.unrelated._id }).lean();
    const response = await request(app).patch(`/api/notifications/${personal._id}/read`).set(auth(tokens.employee));
    assert.equal(response.status, 403);
  });

  it('marks everything as read', async () => {
    const response = await request(app).patch('/api/notifications/read-all').set(auth(tokens.employee)).expect(200);
    assert.ok(response.body.data.updated >= 1);
    const after = await request(app).get('/api/notifications').set(auth(tokens.employee)).expect(200);
    assert.ok(after.body.data.every((row) => row.read));
  });

  it('returns 404 for an unknown notification', async () => {
    await request(app).patch('/api/notifications/000000000000000000000000/read').set(auth(tokens.employee)).expect(404);
  });
});

describe('activity feed', () => {
  beforeEach(async () => {
    await Activity.create([
      { employee: team.employee._id, text: 'applied for annual leave', type: 'leave' },
      { employee: team.hr._id, text: 'posted an announcement', type: 'announcement' },
      { employee: team.unrelated._id, text: 'joined the team', type: 'people' },
    ]);
  });

  it('shows the whole feed to HR', async () => {
    const response = await request(app).get('/api/activity?limit=8').set(auth(tokens.hr)).expect(200);
    assert.equal(response.body.data.length, 3);
    assert.equal(typeof response.body.data[0].employee.id, 'string');
    assert.ok(response.body.data[0].employee.name);
  });

  it('limits the employee feed to their own activity', async () => {
    const response = await request(app).get('/api/activity').set(auth(tokens.employee)).expect(200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].text, 'applied for annual leave');
  });

  it('honours the limit parameter', async () => {
    const response = await request(app).get('/api/activity?limit=2').set(auth(tokens.hr)).expect(200);
    assert.equal(response.body.data.length, 2);
  });

  it('rejects an invalid limit', async () => {
    await request(app).get('/api/activity?limit=500').set(auth(tokens.hr)).expect(400);
  });
});

describe('response hygiene', () => {
  it('never returns password hashes from any endpoint', async () => {
    const endpoints = [
      ['/api/auth/me', tokens.employee],
      ['/api/employees', tokens.hr],
      ['/api/leaves', tokens.hr],
      ['/api/notifications', tokens.employee],
    ];
    for (const [path, token] of endpoints) {
      const response = await request(app).get(path).set(auth(token)).expect(200);
      const body = JSON.stringify(response.body);
      assert.ok(!body.includes('passwordHash'));
      assert.ok(!body.includes('$2a$'));
      assert.ok(!body.includes('$2b$'));
    }
  });

  it('does not expose environment secrets in error messages', async () => {
    const response = await request(app).get('/api/auth/me').set(auth('garbage'));
    assert.equal(response.status, 401);
    assert.ok(!JSON.stringify(response.body).includes('test-only-jwt-secret'));
  });
});
