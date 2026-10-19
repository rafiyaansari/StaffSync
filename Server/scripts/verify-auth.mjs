#!/usr/bin/env node
/**
 * End-to-end authentication check against the database in Server/.env.
 *
 *   npm run verify:auth
 *
 * It boots the real Express app on a random local port (the running dev server
 * is untouched), then exercises exactly what the browser does:
 *
 *   1. GET  /api/health                     → 200 + database connected
 *   2. POST /api/auth/login (wrong password) → 401 + readable message
 *   3. POST /api/auth/login (demo account)   → 200 + token + user profile
 *   4. GET  /api/auth/me (bearer token)      → 200 + same employee id
 *   5. GET  /api/employees (no token)        → 401
 *
 * Exits 1 on the first failure so it can be used in scripts/CI.
 */
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import mongoose from 'mongoose';

const DEMO = { email: 'priya.sharma@nimbuslabs.com', password: env.seedDemoPassword };

let failures = 0;
const pass = (label, extra = '') => console.log(`  ✅ ${label}${extra ? ` — ${extra}` : ''}`);
const fail = (label, extra = '') => {
  failures += 1;
  console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`);
};

async function call(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

async function main() {
  console.log('\nStaffSync auth verification');
  console.log('─'.repeat(58));
  console.log(`Environment : ${env.nodeEnv}`);

  await connectDatabase();

  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log(`Test server : ${base} (temporary)\n`);

  try {
    // 1 — health
    const health = await call(base, '/api/health');
    if (health.status === 200 && health.body?.data?.database === 'connected') {
      pass('GET /api/health', `database ${health.body.data.database}`);
    } else {
      fail('GET /api/health', `status ${health.status}, database ${health.body?.data?.database ?? 'unknown'}`);
    }

    // 2 — wrong password must be rejected with a message
    const badLogin = await call(base, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO.email, password: 'definitely-not-the-password' }),
    });
    if (badLogin.status === 401 && typeof badLogin.body?.message === 'string' && badLogin.body.message.length > 10) {
      pass('wrong password rejected', `${badLogin.status}: ${badLogin.body.message}`);
    } else {
      fail('wrong password rejected', `got ${badLogin.status} ${JSON.stringify(badLogin.body)}`);
    }

    // 3 — the documented demo account must sign in with the documented password
    const login = await call(base, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO.email, password: DEMO.password }),
    });
    const payload = login.body?.data;
    const token = payload?.token;
    const user = payload?.user;

    if (login.status === 200) {
      pass('demo login returns 200');
    } else {
      fail(
        'demo login returns 200',
        `${login.status}: ${login.body?.message || 'no message'}. ` +
          'Check SEED_DEMO_PASSWORD and run: npm run db:doctor',
      );
    }

    if (token && typeof token === 'string') pass('response contains a token', `${token.split('.').length} JWT segments`);
    else fail('response contains a token', JSON.stringify(payload)?.slice(0, 120));

    if (user?.id && user?.name && (user.systemRole || user.role)) {
      pass('response contains the user profile', `${user.name} · ${user.systemRole || user.role} · ${user.id}`);
    } else {
      fail('response contains the user profile', JSON.stringify(user)?.slice(0, 120));
    }

    if (!JSON.stringify(login.body).match(/passwordHash|password"\s*:/)) {
      pass('response never exposes password fields');
    } else {
      fail('response never exposes password fields');
    }

    // 4 — the token works on a protected route
    if (token) {
      const me = await call(base, '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (me.status === 200 && me.body?.data?.email === DEMO.email) {
        pass('GET /api/auth/me with the token', me.body.data.email);
      } else {
        fail('GET /api/auth/me with the token', `status ${me.status}`);
      }
    }

    // 5 — protected route without a token
    const anonymous = await call(base, '/api/employees');
    if (anonymous.status === 401) {
      pass('protected route rejects anonymous requests', '401');
    } else {
      fail('protected route rejects anonymous requests', `got ${anonymous.status}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('─'.repeat(58));
  if (failures) {
    console.log(`${failures} check(s) failed. See Server/README troubleshooting or run npm run db:doctor.\n`);
    process.exitCode = 1;
  } else {
    console.log('All auth checks passed. The browser should be able to sign in.\n');
  }
}

main()
  .catch((error) => {
    console.error('\n[verify:auth] Failed:', error.message);
    if (/MongoServerSelectionError|ENOTFOUND|querySrv/i.test(error.message)) {
      console.error('Could not reach MongoDB. Check MONGO_URI + Atlas Network Access, or try: npm run verify:auth:dns');
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
    await mongoose.connection.close().catch(() => {});
  });
