import Employee from '../models/Employee.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeLeave } from '../utils/serialize.js';
import { notify, recordActivity } from '../utils/notify.js';
import { daysBetweenInclusive, todayISO } from '../utils/dates.js';
import { assertEmployeeInScope, isDirectManagerOf, visibleEmployeeIds } from '../utils/scope.js';

const LEAVE_LABEL = {
  annual: 'annual leave',
  sick: 'sick leave',
  casual: 'casual leave',
  wfh: 'work from home',
  unpaid: 'unpaid leave',
};

const populateLeave = (query) => query.populate('employee', 'name firstName lastName jobTitle department email managerId');

export async function listLeaves(req, res) {
  const { employeeId, status, from, to } = req.query;
  const scope = await visibleEmployeeIds(req.user);

  const filter = {};
  if (employeeId) {
    if (scope !== null && !scope.includes(String(employeeId))) {
      throw ApiError.forbidden('You can only view leave for yourself or your direct team.');
    }
    filter.employee = employeeId;
  } else if (scope !== null) {
    filter.employee = { $in: scope };
  }
  if (status) filter.status = status;
  if (from) filter.from = { ...(filter.from || {}), $gte: from };
  if (to) filter.to = { ...(filter.to || {}), $lte: to };

  const rows = await populateLeave(LeaveRequest.find(filter)).sort({ appliedOn: -1, createdAt: -1 }).lean();
  res.json({ data: rows.map(serializeLeave) });
}

export async function applyLeave(req, res) {
  const employeeId = req.user.employeeId;
  if (req.body.employeeId && String(req.body.employeeId) !== employeeId) {
    throw ApiError.forbidden('You can only apply for your own leave.');
  }

  const from = req.body.from;
  const to = req.body.to;
  if (to < from) throw ApiError.badRequest('The end date can’t be before the start date.');

  const overlap = await LeaveRequest.findOne({
    employee: employeeId,
    status: { $in: ['Pending', 'Approved'] },
    from: { $lte: to },
    to: { $gte: from },
  }).lean();
  if (overlap) throw ApiError.conflict('You already have a leave request covering those dates.');

  const days = daysBetweenInclusive(from, to);

  if (req.body.type !== 'unpaid') {
    const employee = await Employee.findById(employeeId).lean();
    const balance = employee?.leave?.[req.body.type];
    if (balance && days > Math.max(0, balance.total - balance.used)) {
      throw ApiError.badRequest(
        `That request needs ${days} days but only ${Math.max(0, balance.total - balance.used)} ${req.body.type} days remain.`,
      );
    }
  }

  const request = await LeaveRequest.create({
    employee: employeeId,
    type: req.body.type,
    from,
    to,
    days,
    reason: req.body.reason || '',
    handover: req.body.handover || '',
    status: 'Pending',
    appliedOn: todayISO(),
  });

  const employee = await Employee.findById(employeeId).lean();

  await notify({
    audienceRoles: ['hr'],
    type: 'leave',
    title: `${employee.name} requested ${LEAVE_LABEL[request.type]}`,
    body: `${request.from} → ${request.to}. Needs review.`,
    href: '/leaves',
  });
  if (employee.managerId) {
    await notify({
      recipient: employee.managerId,
      type: 'leave',
      title: `${employee.name} requested ${LEAVE_LABEL[request.type]}`,
      body: `${request.from} → ${request.to}. Needs review.`,
      href: '/leaves',
    });
  }
  await recordActivity({
    employeeId,
    text: `applied for ${LEAVE_LABEL[request.type]}`,
    type: 'leave',
  });

  const populated = await populateLeave(LeaveRequest.findById(request._id)).lean();
  res.status(201).json({ data: serializeLeave(populated) });
}

export async function decideLeave(req, res) {
  const { status, note } = req.body;
  const leave = await LeaveRequest.findById(req.params.id).populate(
    'employee',
    'name firstName lastName jobTitle department email managerId',
  );
  if (!leave) throw ApiError.notFound('Leave request not found.');
  if (leave.status !== 'Pending') throw ApiError.badRequest('This request has already been reviewed.');

  const requesterId = leave.employee._id.toString();
  const isHr = req.user.role === 'hr';
  const isManager = req.user.role === 'manager' && (await isDirectManagerOf(req.user.employeeId, requesterId));
  if (!isHr && !isManager) {
    throw ApiError.forbidden('Only HR or the employee’s manager can decide this request.');
  }
  if (requesterId === req.user.employeeId) {
    throw ApiError.forbidden('You can’t review your own leave request.');
  }

  leave.status = status;
  leave.note = note || '';
  leave.reviewedBy = req.user.employeeId;
  leave.reviewedByName = req.user.employee.name;
  leave.reviewedOn = todayISO();
  await leave.save();

  if (status === 'Approved' && leave.type !== 'unpaid') {
    const employee = await Employee.findById(requesterId);
    if (employee) {
      const balance = employee.leave?.[leave.type];
      if (balance) {
        balance.used = Math.min(balance.total, balance.used + leave.days);
        await employee.save();
      }
    }
  }

  await notify({
    recipient: requesterId,
    type: 'leave',
    title: `Your ${LEAVE_LABEL[leave.type]} was ${status.toLowerCase()}`,
    body: `${leave.from} → ${leave.to}${leave.note ? ` · ${leave.note}` : ''}`,
    href: '/leaves',
  });
  await recordActivity({
    employeeId: req.user.employeeId,
    text: `${status.toLowerCase()} ${leave.employee.name}’s leave request`,
    type: 'leave',
  });

  const populated = await populateLeave(LeaveRequest.findById(leave._id)).lean();
  res.json({ data: serializeLeave(populated) });
}

export async function cancelLeave(req, res) {
  const leave = await LeaveRequest.findById(req.params.id).populate(
    'employee',
    'name firstName lastName jobTitle department email managerId',
  );
  if (!leave) throw ApiError.notFound('Leave request not found.');
  if (leave.employee._id.toString() !== req.user.employeeId) {
    throw ApiError.forbidden('You can only cancel your own requests.');
  }
  if (leave.status !== 'Pending') {
    throw ApiError.badRequest('Only pending requests can be cancelled.');
  }

  leave.status = 'Cancelled';
  leave.note = 'Withdrawn by employee.';
  await leave.save();

  await recordActivity({
    employeeId: req.user.employeeId,
    text: 'withdrew a leave request',
    type: 'leave',
  });

  const populated = await populateLeave(LeaveRequest.findById(leave._id)).lean();
  res.json({ data: serializeLeave(populated) });
}

export { assertEmployeeInScope };
