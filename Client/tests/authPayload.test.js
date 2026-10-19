/**
 * Regression tests for the "Cannot read properties of undefined (reading 'name')"
 * sign-in crash.
 *
 * Run with:  npm test    (inside Client/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLoginResponse,
  unwrapEnvelope,
  isUsableUser,
} from '../src/services/authPayload.js';

const user = { id: 'EMP-001', name: 'Priya Sharma', systemRole: 'hr', email: 'priya@nimbuslabs.com' };

/** assert.throws does not return the error, so capture it explicitly. */
function capture(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  assert.fail('expected the function to throw');
}

test('accepts the envelope the StaffSync API returns', () => {
  const { token, user: parsed } = normalizeLoginResponse({ data: { token: 'jwt.token.value', user } });
  assert.equal(token, 'jwt.token.value');
  assert.equal(parsed.name, 'Priya Sharma');
});

test('accepts an unwrapped body and accessToken/employee naming', () => {
  const { token, user: parsed } = normalizeLoginResponse({ accessToken: 'abc', employee: user });
  assert.equal(token, 'abc');
  assert.equal(parsed.id, 'EMP-001');
});

test('unwraps { data } but leaves plain bodies alone', () => {
  assert.deepEqual(unwrapEnvelope({ data: { a: 1 } }), { a: 1 });
  assert.deepEqual(unwrapEnvelope({ a: 1 }), { a: 1 });
  assert.equal(unwrapEnvelope(null), null);
});

test('throws a readable error instead of returning an undefined user', () => {
  // This is the exact shape that used to crash LoginPage with `user.name`.
  const error = capture(() => normalizeLoginResponse({ data: { token: 'jwt' } }));
  assert.equal(error.code, 'AUTH_RESPONSE_NO_USER');
  assert.match(error.message, /did not include a user profile/);
  assert.doesNotMatch(error.message, /undefined/);
});

test('throws when the token is missing', () => {
  const error = capture(() => normalizeLoginResponse({ data: { user } }));
  assert.equal(error.code, 'AUTH_RESPONSE_NO_TOKEN');
});

test('throws on empty, null or array bodies', () => {
  for (const body of [null, undefined, '', [], 'ok']) {
    const error = capture(() => normalizeLoginResponse(body));
    assert.equal(error.code, 'AUTH_RESPONSE_INVALID');
  }
});

test('throws when the profile has no id', () => {
  const error = capture(() => normalizeLoginResponse({ data: { token: 'jwt', user: { name: 'X' } } }));
  assert.equal(error.code, 'AUTH_RESPONSE_NO_USER_ID');
});

test('isUsableUser guards the UI dereference', () => {
  assert.equal(isUsableUser(user), true);
  assert.equal(isUsableUser({ _id: 'x', email: 'a@b.co' }), true);
  assert.equal(isUsableUser(undefined), false);
  assert.equal(isUsableUser(null), false);
  assert.equal(isUsableUser({}), false);
  assert.equal(isUsableUser([]), false);
});
