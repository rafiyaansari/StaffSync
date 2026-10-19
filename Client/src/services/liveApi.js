/**
 * Live API adapter for your existing Express + MongoDB backend.
 *
 * Enable it with:   VITE_API_MODE=live
 * Point it at your server with:   VITE_API_URL=http://localhost:5000/api
 *
 * The endpoint list below is a convention. Rename any path in this one file to
 * match your existing routes — no component or context needs to change.
 */
import { normalizeLoginResponse } from './authPayload';
import { request } from './http';
import { getSession, setSession, clearSession } from './session';

const unwrap = (payload) => (payload?.data !== undefined ? payload.data : payload);

export const liveApi = {
  mode: 'live',

  auth: {
    async login(credentials) {
      const raw = await request('/auth/login', { method: 'POST', body: credentials, auth: false });
      // Validates token + user before anything is stored or returned, so a
      // malformed response can never reach the UI as `undefined`.
      const { token, user, payload } = normalizeLoginResponse(raw);
      setSession({ token, employeeId: user.id || user._id, role: user.systemRole || user.role });
      return { ...payload, token, user };
    },
    async register(payload) {
      return unwrap(await request('/auth/register', { method: 'POST', body: payload, auth: false }));
    },
    async me() {
      const session = getSession();
      if (!session?.token) return null;
      return unwrap(await request('/auth/me'));
    },
    async changePassword(payload) {
      return unwrap(await request('/auth/password', { method: 'PUT', body: payload }));
    },
    currentSession() {
      return getSession();
    },
    logout() {
      clearSession();
    },
  },

  employees: {
    list: async () => unwrap(await request('/employees')),
    get: async (id) => unwrap(await request(`/employees/${id}`)),
    create: async (payload) => unwrap(await request('/employees', { method: 'POST', body: payload })),
    update: async (id, payload) => unwrap(await request(`/employees/${id}`, { method: 'PUT', body: payload })),
    remove: async (id) => unwrap(await request(`/employees/${id}`, { method: 'DELETE' })),
  },

  leaves: {
    list: async (params = {}) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
      ).toString();
      return unwrap(await request(`/leaves${query ? `?${query}` : ''}`));
    },
    apply: async (payload) => unwrap(await request('/leaves', { method: 'POST', body: payload })),
    decide: async ({ id, status, note }) =>
      unwrap(await request(`/leaves/${id}/status`, { method: 'PATCH', body: { status, note } })),
    cancel: async ({ id }) => unwrap(await request(`/leaves/${id}/cancel`, { method: 'PATCH' })),
  },

  attendance: {
    list: async (params = {}) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
      ).toString();
      return unwrap(await request(`/attendance${query ? `?${query}` : ''}`));
    },
    today: async () => unwrap(await request('/attendance/today')),
    clockIn: async (payload) => unwrap(await request('/attendance/clock-in', { method: 'POST', body: payload })),
    clockOut: async (payload) => unwrap(await request('/attendance/clock-out', { method: 'POST', body: payload })),
  },

  announcements: {
    list: async () => unwrap(await request('/announcements')),
    create: async (payload) => unwrap(await request('/announcements', { method: 'POST', body: payload })),
    update: async (id, payload) => unwrap(await request(`/announcements/${id}`, { method: 'PATCH', body: payload })),
    remove: async (id) => unwrap(await request(`/announcements/${id}`, { method: 'DELETE' })),
    markRead: async ({ id }) => unwrap(await request(`/announcements/${id}/read`, { method: 'POST' })),
  },

  training: {
    list: async () => unwrap(await request('/training')),
    enroll: async (payload) => unwrap(await request(`/training/${payload.trainingId}/enroll`, { method: 'POST', body: payload })),
    progress: async ({ trainingId, ...payload }) =>
      unwrap(await request(`/training/${trainingId}/progress`, { method: 'PATCH', body: payload })),
    assign: async ({ trainingId, ...payload }) =>
      unwrap(await request(`/training/${trainingId}/assign`, { method: 'POST', body: payload })),
  },

  notifications: {
    list: async () => unwrap(await request('/notifications')),
    markRead: async ({ id }) => unwrap(await request(`/notifications/${id}/read`, { method: 'PATCH' })),
    markAllRead: async () => unwrap(await request('/notifications/read-all', { method: 'PATCH' })),
  },

  registrations: {
    list: async () => unwrap(await request('/registrations')),
    decide: async ({ id, status, note }) =>
      unwrap(await request(`/registrations/${id}`, { method: 'PATCH', body: { status, note } })),
  },

  settings: {
    get: async (employeeId) => unwrap(await request(`/settings/${employeeId}`)),
    update: async (employeeId, payload) => unwrap(await request(`/settings/${employeeId}`, { method: 'PUT', body: payload })),
  },

  activity: {
    list: async (limit = 8) => unwrap(await request(`/activity?limit=${limit}`)),
  },

  async resetDemoData() {
    throw new Error('Reset is only available in mock mode.');
  },
};
