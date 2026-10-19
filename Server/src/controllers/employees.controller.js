import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Settings from '../models/Settings.js';
import TrainingProgram from '../models/TrainingProgram.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeEmployee } from '../utils/serialize.js';
import { recordActivity } from '../utils/notify.js';
import { todayISO } from '../utils/dates.js';
import { nextEmployeeCode } from '../utils/employeeCode.js';

const SELF_EDITABLE = [
  'firstName',
  'lastName',
  'name',
  'email',
  'phone',
  'dob',
  'gender',
  'bloodGroup',
  'address',
  'emergency',
  'skills',
  'bio',
  'avatar',
];

const viewerOf = (req) => ({ role: req.user.role, employeeId: req.user.employeeId });

async function assertEmailAvailable(email, exceptId = null) {
  const query = { email: email.toLowerCase() };
  if (exceptId) query._id = { $ne: exceptId };
  const [employeeClash, userClash] = await Promise.all([
    Employee.findOne(query).lean(),
    User.findOne({ email: email.toLowerCase(), ...(exceptId ? { employee: { $ne: exceptId } } : {}) }).lean(),
  ]);
  if (employeeClash) throw ApiError.conflict('Another employee already uses this email address.');
  if (userClash) throw ApiError.conflict('An account with this email already exists.');
}

async function validateManager(managerId, employeeId = null) {
  if (!managerId) return null;
  if (employeeId && String(managerId) === String(employeeId)) {
    throw ApiError.badRequest('An employee can’t report to themselves.');
  }
  const manager = await Employee.findById(managerId).lean();
  if (!manager) throw ApiError.badRequest('The selected manager could not be found.');
  return manager._id;
}

export async function listEmployees(req, res) {
  const { department, status, search } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { jobTitle: { $regex: safe, $options: 'i' } },
    ];
  }

  const rows = await Employee.find(filter)
    .populate('managerId', 'name firstName lastName')
    .sort({ name: 1 })
    .lean();

  res.json({ data: rows.map((row) => serializeEmployee(row, { viewer: viewerOf(req) })) });
}

export async function getEmployee(req, res) {
  const employee = await Employee.findById(req.params.id).populate('managerId', 'name firstName lastName').lean();
  if (!employee) throw ApiError.notFound('Employee not found.');

  const isSelf = employee._id.toString() === req.user.employeeId;
  const isTeamManager =
    req.user.role === 'manager' && employee.managerId && employee.managerId._id.toString() === req.user.employeeId;
  if (req.user.role !== 'hr' && !isSelf && !isTeamManager) {
    throw ApiError.forbidden('You can only view your own profile or your direct team.');
  }

  res.json({ data: serializeEmployee(employee, { viewer: viewerOf(req) }) });
}

export async function createEmployee(req, res) {
  const body = req.body;
  await assertEmailAvailable(body.email);
  const managerId = await validateManager(body.managerId);

  const employee = await Employee.create({
    ...body,
    employeeCode: await nextEmployeeCode(),
    managerId,
    email: body.email.toLowerCase(),
    leave: undefined,
  });

  if (body.password) {
    const passwordHash = await bcrypt.hash(body.password, env.bcryptRounds);
    await User.create({
      email: employee.email,
      passwordHash,
      role: employee.systemRole,
      status: 'active',
      employee: employee._id,
    });
  }

  await recordActivity({
    employeeId: req.user.employeeId,
    text: `added ${employee.name} to ${employee.department}`,
    type: 'people',
  });

  const populated = await Employee.findById(employee._id).populate('managerId', 'name firstName lastName').lean();
  res.status(201).json({ data: serializeEmployee(populated, { viewer: viewerOf(req) }) });
}

export async function updateEmployee(req, res) {
  const target = await Employee.findById(req.params.id);
  if (!target) throw ApiError.notFound('Employee not found.');

  const isHr = req.user.role === 'hr';
  const isSelf = target._id.toString() === req.user.employeeId;
  if (!isHr && !isSelf) throw ApiError.forbidden('You can only update your own profile.');

  const body = { ...req.body };

  if (!isHr) {
    const disallowed = Object.keys(body).filter((key) => !SELF_EDITABLE.includes(key));
    if (disallowed.length) {
      throw ApiError.forbidden(
        `Employees can only change their own contact and profile details (${SELF_EDITABLE.join(', ')}).`,
      );
    }
  }

  if (body.email && body.email.toLowerCase() !== target.email) {
    await assertEmailAvailable(body.email, target._id);
    const account = await User.findOne({ employee: target._id });
    if (account) account.email = body.email.toLowerCase();
    if (account) await account.save({ validateBeforeSave: false });
  }

  if (isHr && body.systemRole && body.systemRole !== target.systemRole) {
    if (isSelf) throw ApiError.badRequest('You can’t change your own role.');
    if (target.systemRole === 'hr' && body.systemRole !== 'hr') {
      const hrCount = await User.countDocuments({ role: 'hr', status: 'active' });
      if (hrCount <= 1) throw ApiError.conflict('The workspace needs at least one HR administrator.');
    }
    const account = await User.findOne({ employee: target._id });
    if (account) {
      account.role = body.systemRole;
      await account.save({ validateBeforeSave: false });
    }
  }

  if (body.managerId !== undefined) {
    body.managerId = await validateManager(body.managerId, target._id);
  }

  const allowed = isHr
    ? [
        'firstName',
        'lastName',
        'name',
        'email',
        'phone',
        'jobTitle',
        'department',
        'systemRole',
        'employmentType',
        'workMode',
        'location',
        'managerId',
        'joinDate',
        'status',
        'dob',
        'gender',
        'bloodGroup',
        'address',
        'emergency',
        'skills',
        'bio',
        'avatar',
      ]
    : SELF_EDITABLE;

  for (const key of allowed) {
    if (body[key] !== undefined) target[key] = body[key];
  }

  await target.save();

  if (isHr && body.password) {
    const passwordHash = await bcrypt.hash(body.password, env.bcryptRounds);
    const account = await User.findOne({ employee: target._id });
    if (account) {
      account.passwordHash = passwordHash;
      account.passwordChangedAt = new Date();
      await account.save({ validateBeforeSave: false });
    } else {
      await User.create({
        email: target.email,
        passwordHash,
        role: target.systemRole,
        status: 'active',
        employee: target._id,
      });
    }
  }

  if (isHr && body.systemRole && body.systemRole !== 'employee') {
    // no-op: role stored on the employee + account above
  }

  const populated = await Employee.findById(target._id).populate('managerId', 'name firstName lastName').lean();
  res.json({ data: serializeEmployee(populated, { viewer: viewerOf(req), includePrivate: isSelf || isHr }) });
}

export async function deleteEmployee(req, res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw ApiError.notFound('Employee not found.');
  if (employee._id.toString() === req.user.employeeId) {
    throw ApiError.badRequest('You can’t delete your own profile while signed in.');
  }

  const account = await User.findOne({ employee: employee._id });
  if (account?.role === 'hr' || employee.systemRole === 'hr') {
    const hrCount = await User.countDocuments({ role: 'hr', status: 'active' });
    if (hrCount <= 1) throw ApiError.conflict('You can’t remove the last HR administrator.');
  }

  await Promise.all([
    LeaveRequest.deleteMany({ employee: employee._id }),
    Attendance.deleteMany({ employee: employee._id }),
    Settings.deleteOne({ employee: employee._id }),
    User.deleteMany({ employee: employee._id }),
    Employee.updateMany({ managerId: employee._id }, { managerId: null }),
    TrainingProgram.updateMany({}, { $pull: { enrolled: { employee: employee._id } } }),
  ]);

  await employee.deleteOne();

  await recordActivity({
    employeeId: req.user.employeeId,
    text: `removed ${employee.name} from the directory`,
    type: 'people',
  });

  res.json({ data: { message: `${employee.name} and their records were removed.`, id: employee._id.toString() } });
}

export { SELF_EDITABLE, todayISO };
