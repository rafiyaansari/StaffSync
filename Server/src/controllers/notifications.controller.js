import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeNotification } from '../utils/serialize.js';

function visibleFilter(user) {
  return {
    $or: [{ recipient: user.employeeId }, { recipient: null, audienceRoles: user.role }],
  };
}

export async function listNotifications(req, res) {
  const rows = await Notification.find(visibleFilter(req.user)).sort({ createdAt: -1 }).lean();
  res.json({ data: rows.map((row) => serializeNotification(row, req.user.employeeId)) });
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw ApiError.notFound('Notification not found.');

  const isForMe =
    (notification.recipient && notification.recipient.toString() === req.user.employeeId) ||
    (!notification.recipient && notification.audienceRoles.includes(req.user.role));
  if (!isForMe) throw ApiError.forbidden('This notification belongs to another account.');

  if (!notification.readBy.some((id) => id.toString() === req.user.employeeId)) {
    notification.readBy.push(req.user.employeeId);
    await notification.save();
  }

  res.json({ data: serializeNotification(notification, req.user.employeeId) });
}

export async function markAllNotificationsRead(req, res) {
  const rows = await Notification.find(visibleFilter(req.user)).select('_id readBy');
  let updated = 0;
  for (const row of rows) {
    if (!row.readBy.some((id) => id.toString() === req.user.employeeId)) {
      row.readBy.push(req.user.employeeId);
      await row.save();
      updated += 1;
    }
  }
  res.json({ data: { message: 'All caught up.', updated } });
}
