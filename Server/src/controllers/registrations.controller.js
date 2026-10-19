import Employee from '../models/Employee.js';
import RegistrationRequest from '../models/RegistrationRequest.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeRegistration } from '../utils/serialize.js';
import { notify, recordActivity } from '../utils/notify.js';
import { todayISO } from '../utils/dates.js';
import { nextEmployeeCode } from '../utils/employeeCode.js';

export async function listRegistrations(_req, res) {
  const rows = await RegistrationRequest.find({})
    .populate('reviewedBy', 'name')
    .sort({ appliedOn: -1, createdAt: -1 })
    .lean();
  res.json({ data: rows.map(serializeRegistration) });
}

export async function decideRegistration(req, res) {
  const request = await RegistrationRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Registration request not found.');
  if (request.status !== 'Pending') throw ApiError.badRequest('This request has already been reviewed.');

  const { status, note } = req.body;
  const reviewer = await Employee.findById(req.user.employeeId).lean();

  request.status = status;
  request.note = note || request.note;
  request.reviewedBy = req.user.employeeId;
  request.reviewedByName = reviewer?.name || 'HR';
  request.reviewedOn = todayISO();

  const account = await User.findOne({ email: request.email }).select('+passwordHash');

  if (status === 'Approved') {
    const clash = await Employee.findOne({ email: request.email }).lean();
    if (clash) throw ApiError.conflict('An employee with this email already exists.');

    const employee = await Employee.create({
      employeeCode: await nextEmployeeCode(),
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone,
      jobTitle: request.jobTitle,
      department: request.department,
      systemRole: 'employee',
      employmentType: request.employmentType,
      location: request.location,
      joinDate: request.startDate || todayISO(),
      status: 'Probation',
    });

    request.employee = employee._id;

    if (account) {
      account.status = 'active';
      account.employee = employee._id;
      account.role = 'employee';
      account.registrationRequest = request._id;
      await account.save({ validateBeforeSave: false });
    }

    await notify({
      recipient: employee._id,
      type: 'system',
      title: `Welcome to the team, ${employee.firstName}`,
      body: 'Your StaffSync account is active. Start with your profile and the mandatory training.',
      href: '/profile',
    });
    await recordActivity({
      employeeId: reviewer?._id,
      text: `approved ${employee.name}’s registration`,
      type: 'people',
    });
  } else {
    if (account) {
      account.status = 'rejected';
      await account.save({ validateBeforeSave: false });
    }
    await recordActivity({
      employeeId: reviewer?._id,
      text: `declined ${request.firstName} ${request.lastName}’s registration`,
      type: 'people',
    });
  }

  await request.save();

  const populated = await RegistrationRequest.findById(request._id).populate('reviewedBy', 'name').lean();
  res.json({ data: serializeRegistration(populated) });
}
