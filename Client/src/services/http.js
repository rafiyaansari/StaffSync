/**
 * Tiny fetch wrapper used by the live API adapter.
 * Set VITE_API_URL (e.g. http://localhost:5000/api) in your .env file.
 */
import { clearSession, getSession } from './session';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const session = getSession();
  const finalHeaders = { ...headers };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (auth && session?.token) {
    finalHeaders.Authorization = `Bearer ${session.token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    const error = new Error('We couldn’t reach the StaffSync API. Check that the server is running.');
    error.offline = true;
    throw error;
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && getSession()?.token) {
      // The stored token is no longer valid: drop it and let AuthContext sign out.
      clearSession();
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('staffsync.sessionExpired', '1');
        } catch {
          /* storage unavailable */
        }
        window.dispatchEvent(new Event('staffsync:session-expired'));
      }
    }
    const message =
      (payload && (payload.message || payload.error || payload.msg)) ||
      `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export { BASE_URL };
