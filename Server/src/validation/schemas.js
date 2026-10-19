import { z } from 'zod';
import { isISODate } from '../utils/dates.js';

const email = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .min(3, 'Email is required.')
  .max(160, 'Email is too long.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.');

const password = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD date format.')
  .refine((value) => isISODate(value), 'Enter a real calendar date.');

const shortText = (max = 120) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour) time.');

const emergency = z
  .object({
    name: shortText(120).optional().default(''),
    relation: shortText(60).optional().default(''),
    phone: shortText(32).optional().default(''),
  })
  .strict();

const avatar = z
  .union([z.string(), z.null()])
  .optional()
  .refine((value) => {
    if (value === null || value === undefined || value === '') return true;
    if (value.startsWith('data:image/')) return value.length <= 1_500_000;
    return /^https?:\/\//.test(value) && value.length <= 500;
  }, 'Avatar must be an https URL or a small image upload (1.5 MB max).');

/* ------------------------------- Auth -------------------------------- */
export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(60),
    lastName: z.string().trim().min(1, 'Last name is required.').max(60),
    email,
    password,
    phone: shortText(32).optional().default(''),
    department: shortText(80).optional().default('Engineering'),
    jobTitle: shortText(120).optional().default('Team member'),
    employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional().default('Full-time'),
    location: shortText(120).optional().default('Bengaluru, IN'),
    startDate: z.union([isoDate, z.literal('')]).optional().default(''),
    note: shortText(800).optional().default(''),
  })
  .strict();

export const loginSchema = z
  .object({
    email: email,
    password: z.string().min(1, 'Enter your password.').max(200),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(200),
    newPassword: password,
  })
  .strict();

/* ----------------------------- Employees ------------------------------ */
const employeeFields = {
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().min(1, 'Last name is required.').max(60),
  name: shortText(130).optional(),
  email,
  password: password.optional(),
  phone: shortText(32).optional().default(''),
  jobTitle: z.string().trim().min(1, 'Job title is required.').max(120),
  department: z.string().trim().min(1, 'Department is required.').max(80),
  systemRole: z.enum(['hr', 'manager', 'employee']).optional().default('employee'),
  role: z.enum(['hr', 'manager', 'employee']).optional(),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional().default('Full-time'),
  workMode: z.enum(['Hybrid', 'On-site', 'Remote']).optional().default('Hybrid'),
  location: shortText(120).optional().default('Bengaluru, IN'),
  managerId: z.union([objectId, z.literal(''), z.null()]).optional().default(null),
  joinDate: isoDate,
  status: z.enum(['Active', 'Probation', 'Inactive']).optional().default('Active'),
  dob: z.union([isoDate, z.literal('')]).optional().default(''),
  gender: shortText(40).optional().default('Prefer not to say'),
  bloodGroup: shortText(8).optional().default(''),
  address: shortText(400).optional().default(''),
  emergency: emergency.optional(),
  skills: z.array(shortText(60)).max(30, 'Keep skills to 30 entries or fewer.').optional().default([]),
  bio: shortText(1200).optional().default(''),
  avatar,
};

export const createEmployeeSchema = z.object(employeeFields).strict();

export const updateEmployeeSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(60).optional(),
    lastName: z.string().trim().min(1, 'Last name is required.').max(60).optional(),
    name: shortText(130).optional(),
    email: email.optional(),
    password: password.optional(),
    phone: shortText(32).optional(),
    jobTitle: z.string().trim().min(1, 'Job title is required.').max(120).optional(),
    department: z.string().trim().min(1, 'Department is required.').max(80).optional(),
    systemRole: z.enum(['hr', 'manager', 'employee']).optional(),
    role: z.enum(['hr', 'manager', 'employee']).optional(),
    employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional(),
    workMode: z.enum(['Hybrid', 'On-site', 'Remote']).optional(),
    location: shortText(120).optional(),
    managerId: z.union([objectId, z.literal(''), z.null()]).optional(),
    joinDate: isoDate.optional(),
    status: z.enum(['Active', 'Probation', 'Inactive']).optional(),
    dob: z.union([isoDate, z.literal('')]).optional(),
    gender: shortText(40).optional(),
    bloodGroup: shortText(8).optional(),
    address: shortText(400).optional(),
    emergency: emergency.optional(),
    skills: z.array(shortText(60)).max(30, 'Keep skills to 30 entries or fewer.').optional(),
    bio: shortText(1200).optional(),
    avatar,
  })
  .strict();

/* ------------------------------- Leaves ------------------------------- */
export const applyLeaveSchema = z
  .object({
    employeeId: objectId.optional(),
    type: z.enum(['annual', 'sick', 'casual', 'wfh', 'unpaid']).optional().default('annual'),
    from: isoDate,
    to: isoDate,
    reason: shortText(800).optional().default(''),
    handover: shortText(800).optional().default(''),
  })
  .strict()
  .refine((value) => value.to >= value.from, {
    message: 'The end date can’t be before the start date.',
    path: ['to'],
  });

export const leaveDecisionSchema = z
  .object({
    status: z.enum(['Approved', 'Rejected'], { errorMap: () => ({ message: 'Decision must be Approved or Rejected.' }) }),
    note: shortText(800).optional().default(''),
  })
  .strict();

/* ----------------------------- Attendance ----------------------------- */
export const attendanceQuerySchema = z
  .object({
    employeeId: objectId.optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict();

export const clockInSchema = z
  .object({
    employeeId: objectId.optional(),
    mode: z.enum(['office', 'remote']).optional().default('office'),
  })
  .strict();

export const clockOutSchema = z.object({ employeeId: objectId.optional() }).strict();

/* ---------------------------- Announcements --------------------------- */
const announcementFields = {
  title: z.string().trim().min(1, 'Give the announcement a title.').max(160),
  category: shortText(40).optional().default('Company'),
  body: z.string().trim().max(8000, 'Keep the announcement under 8000 characters.').optional().default(''),
  pinned: z.boolean().optional().default(false),
  audience: z.enum(['Everyone', 'Managers', 'HR only']).optional().default('Everyone'),
  tone: z.enum(['neutral', 'navy', 'blue', 'green', 'amber', 'red', 'rose', 'slate', 'violet', 'teal']).optional().default('blue'),
};

export const createAnnouncementSchema = z.object(announcementFields).strict();
export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the announcement a title.').max(160).optional(),
    category: shortText(40).optional(),
    body: z.string().trim().max(8000, 'Keep the announcement under 8000 characters.').optional(),
    pinned: z.boolean().optional(),
    audience: z.enum(['Everyone', 'Managers', 'HR only']).optional(),
    tone: z.enum(['neutral', 'navy', 'blue', 'green', 'amber', 'red', 'rose', 'slate', 'violet', 'teal']).optional(),
  })
  .strict();

/* ------------------------------ Training ------------------------------ */
export const enrollTrainingSchema = z
  .object({ employeeId: objectId.optional(), trainingId: objectId.optional() })
  .strict();
export const trainingProgressSchema = z
  .object({
    employeeId: objectId.optional(),
    trainingId: objectId.optional(),
    progress: z.coerce.number().min(0, 'Progress cannot be negative.').max(100, 'Progress is capped at 100.'),
  })
  .strict();
export const assignTrainingSchema = z
  .object({
    employeeIds: z.array(objectId).min(1, 'Choose at least one person.').max(200),
    dueDate: z.union([isoDate, z.literal('')]).optional(),
  })
  .strict();

/* --------------------------- Registrations ---------------------------- */
export const registrationDecisionSchema = z
  .object({
    status: z.enum(['Approved', 'Rejected'], { errorMap: () => ({ message: 'Decision must be Approved or Rejected.' }) }),
    note: shortText(800).optional().default(''),
  })
  .strict();

/* ------------------------------ Settings ------------------------------ */
export const settingsSchema = z
  .object({
    emailOnLeave: z.boolean().optional(),
    emailOnAnnouncement: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    compactTables: z.boolean().optional(),
    showBirthdays: z.boolean().optional(),
  })
  .strict();

/* ------------------------------ Activity ------------------------------ */
export const activityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  })
  .strict();

export { email, password, isoDate, objectId, timeString };

/* --------------------------- List filters ----------------------------- */
export const employeeListQuerySchema = z
  .object({
    department: z.string().trim().max(80).optional(),
    status: z.enum(['Active', 'Probation', 'Inactive']).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strip();

export const leaveListQuerySchema = z
  .object({
    employeeId: objectId.optional(),
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strip();
