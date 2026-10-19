import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import Employee from '../models/Employee.js';
import RegistrationRequest from '../models/RegistrationRequest.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeEmployee, serializeRegistration } from '../utils/serialize.js';
import { notify, recordActivity } from '../utils/notify.js';
import { todayISO } from '../utils/dates.js';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function viewerFor(employee) {
  return { role: employee.systemRole, employeeId: employee._id.toString() };
}

function sessionPayload(user, employee) {
  const token = signToken(user);
  return {
    token,
    expiresIn: TOKEN_TTL_SECONDS,
    user: serializeEmployee(employee, { viewer: viewerFor(employee), includePrivate: true }),
  };
}

export async function register(req, res) {
  const body = req.body;
  const email = body.email.toLowerCase();

  const [existingUser, existingRequest] = await Promise.all([
    User.findOne({ email }).lean(),
    RegistrationRequest.findOne({ email }).lean(),
  ]);

  if (existingUser || existingRequest) {
    throw ApiError.conflict('An account with this email already exists. Try signing in instead.');
  }

  const passwordHash = await bcrypt.hash(body.password, env.bcryptRounds);

  const request = await RegistrationRequest.create({
    firstName: body.firstName,
    lastName: body.lastName,
    email,
    phone: body.phone,
    jobTitle: body.jobTitle,
    department: body.department,
    employmentType: body.employmentType,
    location: body.location,
    startDate: body.startDate || null,
    note: body.note || '',
    systemRole: 'employee',
    appliedOn: todayISO(),
    status: 'Pending',
  });

  await User.create({
    email,
    passwordHash,
    role: 'employee',
    status: 'pending',
    registrationRequest: request._id,
  });

  await notify({
    audienceRoles: ['hr'],
    type: 'registration',
    title: 'New registration request',
    body: `${body.firstName} ${body.lastName} applied to join ${body.department}.`,
    href: '/employees/requests',
  });
  await recordActivity({
    text: `${body.firstName} ${body.lastName} requested an account`,
    type: 'people',
  });

  res.status(201).json({
    data: {
      request: serializeRegistration(request),
      message: 'Registration submitted. HR will review and activate your account.',
    },
  });
}

export async function login(req, res) {
  // Normalise exactly the same way the model does, so "Priya@Nimbus…" or a
  // pasted value with a trailing space still finds the seeded account.
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = await User.findOne({ email }).select('+passwordHash');
  // Same generic message whether the email exists or the password is wrong.
  if (!user) throw ApiError.unauthorized('That email and password don’t match our records.');
  if (!user.passwordHash) {
    throw new ApiError(
      403,
      'This account has no password set. Ask HR to reset it from the employee directory.',
    );
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('That email and password don’t match our records.');

  if (user.status === 'pending') {
    throw new ApiError(403, 'Your account is awaiting HR approval. Please check back shortly.');
  }
  if (user.status === 'rejected') {
    throw new ApiError(403, 'This registration was declined. Contact your HR administrator.');
  }
  if (user.status === 'disabled') {
    throw new ApiError(403, 'This account has been deactivated.');
  }

  const employee = user.employee ? await Employee.findById(user.employee) : null;
  if (!employee) {
    // A seeded/imported account that was never linked to an employee record.
    // Failing loudly here is better than signing in with an empty profile.
    throw new ApiError(
      403,
      'This account isn’t linked to an employee profile yet. Ask HR to repair it (server: npm run db:doctor -- --fix-demo-passwords).',
    );
  }
  if (employee.status === 'Inactive') throw new ApiError(403, 'This account has been deactivated.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({ data: sessionPayload(user, employee) });
}

export async function me(req, res) {
  const employee = await Employee.findById(req.user.employeeId);
  if (!employee) throw ApiError.unauthorized('This profile is no longer available. Please sign in again.');
  res.json({
    data: serializeEmployee(employee, {
      viewer: { role: employee.systemRole, employeeId: employee._id.toString() },
      includePrivate: true,
    }),
  });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw new ApiError(400, 'Your current password is incorrect.');

  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) throw new ApiError(400, 'Choose something different from your current password.');

  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  user.passwordChangedAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({ data: { message: 'Password updated. Use it the next time you sign in.' } });
}
