import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeAttendance } from '../utils/serialize.js';
import { recordActivity } from '../utils/notify.js';
import { nowTime24, todayISO, workedHours } from '../utils/dates.js';
import { assertEmployeeInScope, visibleEmployeeIds } from '../utils/scope.js';

async function scopedFilter(req) {
  const scope = await visibleEmployeeIds(req.user);
  return scope === null ? {} : { employee: { $in: scope } };
}

export async function listAttendance(req, res) {
  const { employeeId, from, to, page, limit } = req.query;

  if (employeeId) await assertEmployeeInScope(req.user, employeeId);

  const filter = await scopedFilter(req);
  if (employeeId) filter.employee = employeeId;
  if (from) filter.date = { ...(filter.date || {}), $gte: from };
  if (to) filter.date = { ...(filter.date || {}), $lte: to };

  let query = Attendance.find(filter).sort({ date: -1, createdAt: -1 });
  let meta;
  if (page && limit) {
    const total = await Attendance.countDocuments(filter);
    query = query.skip((page - 1) * limit).limit(limit);
    meta = { page, limit, total, pages: Math.ceil(total / limit) || 1 };
  }

  const rows = await query.lean();
  const payload = { data: rows.map(serializeAttendance) };
  if (meta) payload.meta = meta;
  res.json(payload);
}

export async function todayAttendance(req, res) {
  const filter = await scopedFilter(req);
  filter.date = todayISO();
  const rows = await Attendance.find(filter).sort({ createdAt: 1 }).lean();
  res.json({ data: rows.map(serializeAttendance) });
}

export async function clockIn(req, res) {
  const employeeId = req.user.employeeId;
  if (req.body.employeeId && String(req.body.employeeId) !== employeeId) {
    throw ApiError.forbidden('You can only clock in for yourself.');
  }

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw ApiError.notFound('Employee not found.');
  if (employee.status === 'Inactive') throw ApiError.forbidden('Inactive employees can’t clock in.');

  const date = todayISO();
  const time = nowTime24();
  const existing = await Attendance.findOne({ employee: employeeId, date });

  if (existing?.checkIn) throw ApiError.conflict('You’ve already clocked in today.');

  const mode = req.body.mode || 'office';
  const status = mode === 'remote' ? 'WFH' : time > '09:45' ? 'Late' : 'Present';
  const note = mode === 'remote' ? 'Working remotely' : time > '09:45' ? 'Late check-in' : 'On time';

  let record = existing;
  if (!record) {
    record = new Attendance({ employee: employeeId, date });
  }
  record.mode = mode;
  record.checkIn = time;
  record.checkOut = null;
  record.status = status;
  record.hours = 0;
  record.note = note;
  await record.save();

  await recordActivity({ employeeId, text: `clocked in (${mode === 'remote' ? 'remote' : 'office'})`, type: 'attendance' });

  res.status(201).json({ data: serializeAttendance(record) });
}

export async function clockOut(req, res) {
  const employeeId = req.user.employeeId;
  if (req.body.employeeId && String(req.body.employeeId) !== employeeId) {
    throw ApiError.forbidden('You can only clock out for yourself.');
  }

  const date = todayISO();
  const record = await Attendance.findOne({ employee: employeeId, date });
  if (!record || !record.checkIn) throw ApiError.badRequest('You need to clock in first.');
  if (record.checkOut) throw ApiError.conflict('You’ve already clocked out today.');

  record.checkOut = nowTime24();
  record.hours = workedHours(record.checkIn, record.checkOut);
  await record.save();

  await recordActivity({ employeeId, text: `clocked out after ${record.hours} hours`, type: 'attendance' });

  res.json({ data: serializeAttendance(record) });
}
