import Announcement from '../models/Announcement.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeAnnouncement } from '../utils/serialize.js';
import { notify, recordActivity } from '../utils/notify.js';
import { todayISO } from '../utils/dates.js';

function audienceFilter(role) {
  if (role === 'hr') return {};
  if (role === 'manager') return { audience: { $in: ['Everyone', 'Managers'] } };
  return { audience: 'Everyone' };
}

export async function listAnnouncements(req, res) {
  const rows = await Announcement.find(audienceFilter(req.user.role))
    .sort({ pinned: -1, date: -1, createdAt: -1 })
    .lean();
  res.json({ data: rows.map(serializeAnnouncement) });
}

export async function createAnnouncement(req, res) {
  const author = await Employee.findById(req.user.employeeId).lean();
  if (!author) throw ApiError.unauthorized();

  const announcement = await Announcement.create({
    title: req.body.title,
    category: req.body.category,
    body: req.body.body,
    author: author._id,
    authorName: author.name,
    authorRole: author.jobTitle || 'HR',
    date: todayISO(),
    pinned: req.body.pinned,
    audience: req.body.audience,
    tone: req.body.tone,
    readBy: [author._id],
  });

  await notify({
    audienceRoles: ['employee', 'manager', 'hr'],
    type: 'announcement',
    title: `New announcement · ${announcement.title}`,
    body:
      announcement.body.slice(0, 90) + (announcement.body.length > 90 ? '…' : ''),
    href: '/announcements',
  });
  await recordActivity({
    employeeId: author._id,
    text: `posted “${announcement.title}”`,
    type: 'announcement',
  });

  res.status(201).json({ data: serializeAnnouncement(announcement) });
}

export async function updateAnnouncement(req, res) {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found.');

  for (const key of ['title', 'category', 'body', 'pinned', 'audience', 'tone']) {
    if (req.body[key] !== undefined) announcement[key] = req.body[key];
  }
  await announcement.save();

  await recordActivity({
    employeeId: req.user.employeeId,
    text: `updated “${announcement.title}”`,
    type: 'announcement',
  });

  res.json({ data: serializeAnnouncement(announcement) });
}

export async function deleteAnnouncement(req, res) {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found.');

  await announcement.deleteOne();
  await recordActivity({
    employeeId: req.user.employeeId,
    text: `removed the announcement “${announcement.title}”`,
    type: 'announcement',
  });

  res.json({ data: { message: 'Announcement deleted.', id: announcement._id.toString() } });
}

export async function markAnnouncementRead(req, res) {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found.');

  const visible =
    req.user.role === 'hr' ||
    announcement.audience === 'Everyone' ||
    (announcement.audience === 'Managers' && req.user.role === 'manager');
  if (!visible) throw ApiError.forbidden('This announcement is not addressed to you.');

  if (!announcement.readBy.some((id) => id.toString() === req.user.employeeId)) {
    announcement.readBy.push(req.user.employeeId);
    await announcement.save();
  }

  res.json({ data: serializeAnnouncement(announcement) });
}
