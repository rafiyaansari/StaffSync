import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';

/**
 * Creates a notification document. Either target one employee (`recipient`)
 * or broadcast to roles (`audienceRoles`).
 */
export async function notify({ recipient = null, audienceRoles = [], type = 'system', title, body = '', href = '/notifications' }) {
  if (!title) return null;
  return Notification.create({
    recipient: recipient || null,
    audienceRoles: recipient ? [] : audienceRoles,
    type,
    title,
    body,
    href,
  });
}

export async function recordActivity({ employeeId = null, text, type = 'system', at = new Date() }) {
  if (!text) return null;
  return Activity.create({ employee: employeeId || null, text, type, at });
}

export async function notifyMany(employeeIds, payload) {
  if (!employeeIds?.length) return [];
  return Promise.all(employeeIds.map((employeeId) => notify({ ...payload, recipient: employeeId })));
}
