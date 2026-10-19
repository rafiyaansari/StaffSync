/**
 * Normalises the payload returned by `POST /auth/login`.
 *
 * The UI used to trust whatever the server sent: a successful HTTP status with
 * a body that had no `user` (or no `token`) produced `user === undefined`, and
 * the next line — `user.name` — crashed with
 * "Cannot read properties of undefined (reading 'name')".
 *
 * Every caller now goes through this function, so an incomplete response turns
 * into a readable error instead of an uncaught exception.
 *
 * Accepted shapes (all are treated identically):
 *   { data: { token, user } }        ← what the StaffSync API returns
 *   { token, user }                  ← unwrapped / older builds
 *   { accessToken, employee }        ← alternative naming from other backends
 */

export const AUTH_RESPONSE_ERROR = 'StaffSync could not complete sign-in';

function describe(detail) {
  return `${AUTH_RESPONSE_ERROR}: ${detail} This usually means the API URL points at a different server or an out-of-date backend.`;
}

function fail(detail, code) {
  const error = new Error(describe(detail));
  error.code = code;
  return error;
}

/** Unwraps the `{ data: ... }` envelope the API uses, tolerating plain bodies. */
export function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && payload.data !== undefined) {
    return payload.data;
  }
  return payload;
}

/**
 * @param {unknown} raw the parsed JSON body of the login response
 * @returns {{ token: string, user: Record<string, any>, payload: Record<string, any> }}
 * @throws {Error} with `.code` set when the response is unusable
 */
export function normalizeLoginResponse(raw) {
  const payload = unwrapEnvelope(raw);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw fail('the response body was empty or not an object.', 'AUTH_RESPONSE_INVALID');
  }

  const token = payload.token || payload.accessToken;
  const user = payload.user || payload.employee;

  if (!token || typeof token !== 'string') {
    throw fail('the response did not include a session token.', 'AUTH_RESPONSE_NO_TOKEN');
  }
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw fail('the response did not include a user profile.', 'AUTH_RESPONSE_NO_USER');
  }
  if (!user.id && !user._id) {
    throw fail('the user profile in the response had no id.', 'AUTH_RESPONSE_NO_USER_ID');
  }

  return { token, user, payload };
}

/**
 * True when the object can be rendered as the signed-in user.
 * Used as a last line of defence before a component dereferences it.
 */
export function isUsableUser(user) {
  return Boolean(
    user &&
      typeof user === 'object' &&
      !Array.isArray(user) &&
      (user.id || user._id) &&
      (user.name || user.email),
  );
}
