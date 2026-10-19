/**
 * Seeds the StaffSync database with the same demo workspace the mock UI used.
 *
 * Run with:  npm run seed            (adds/refreshes demo data)
 *            npm run seed -- --reset (drops every collection first)
 *            npm run seed -- --if-empty (does nothing when data exists)
 *
 * Every demo employee gets a real bcrypt-hashed account using
 * SEED_DEMO_PASSWORD (default StaffSync@123). Real registrations create their
 * own accounts through POST /api/auth/register.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import Activity from '../src/models/Activity.js';
import Announcement from '../src/models/Announcement.js';
import Attendance from '../src/models/Attendance.js';
import Employee from '../src/models/Employee.js';
import LeaveRequest from '../src/models/LeaveRequest.js';
import Notification from '../src/models/Notification.js';
import RegistrationRequest from '../src/models/RegistrationRequest.js';
import Settings from '../src/models/Settings.js';
import TrainingProgram from '../src/models/TrainingProgram.js';
import User from '../src/models/User.js';
import { daysBetweenInclusive, todayISO } from '../src/utils/dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = JSON.parse(fs.readFileSync(path.join(__dirname, 'demoSeed.json'), 'utf8'));

const DEMO_PASSWORD = env.seedDemoPassword;

function shiftDate(value, days) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftTimestamp(value, days) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Date(date.getTime() + days * 86400000).toISOString();
}

/** Keeps the demo looking "live" when it is seeded on a later day. */
function shiftDays() {
  if (!RAW.generatedOn) return 0;
  const start = new Date(`${RAW.generatedOn}T00:00:00Z`);
  const now = new Date(`${todayISO()}T00:00:00Z`);
  return Math.round((now - start) / 86400000);
}

async function wipe() {
  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Attendance.deleteMany({}),
    Announcement.deleteMany({}),
    TrainingProgram.deleteMany({}),
    Notification.deleteMany({}),
    Settings.deleteMany({}),
    Activity.deleteMany({}),
    RegistrationRequest.deleteMany({}),
  ]);
}

export async function seedDatabase({ reset = false, ifEmpty = false } = {}) {
  const existing = await Employee.countDocuments({});
  if (existing > 0) {
    if (ifEmpty) {
      console.log(`[seed] ${existing} employees already exist — skipping (--if-empty).`);
      return { skipped: true };
    }
    if (!reset) {
      console.log('[seed] Database already contains employees. Re-run with --reset to rebuild the demo workspace.');
      return { skipped: true };
    }
  }
  if (reset) await wipe();

  const days = shiftDays();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.bcryptRounds);

  /* ------------------------------ Employees ----------------------------- */
  const idMap = new Map(); // EMP-001 -> ObjectId
  for (const person of RAW.employees) {
    const employee = await Employee.create({
      employeeCode: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone || '',
      jobTitle: person.jobTitle,
      department: person.department,
      systemRole: person.systemRole || 'employee',
      employmentType: person.employmentType || 'Full-time',
      workMode: person.workMode || 'Hybrid',
      location: person.location || 'Bengaluru, IN',
      joinDate: shiftDate(person.joinDate, days),
      status: person.status || 'Active',
      dob: person.dob || '',
      gender: person.gender || 'Prefer not to say',
      bloodGroup: person.bloodGroup || '',
      address: person.address || '',
      emergency: person.emergency || {},
      skills: person.skills || [],
      bio: person.bio || '',
      avatar: person.avatar || null,
      leave: person.leave,
    });
    idMap.set(person.id, employee._id);
  }

  // Managers are linked in a second pass so ordering never matters.
  for (const person of RAW.employees) {
    if (person.managerId && idMap.has(person.managerId)) {
      await Employee.updateOne({ _id: idMap.get(person.id) }, { managerId: idMap.get(person.managerId) });
    }
  }

  await User.insertMany(
    RAW.employees.map((person) => ({
      email: person.email,
      passwordHash,
      role: person.systemRole || 'employee',
      status: 'active',
      employee: idMap.get(person.id),
    })),
  );

  const displayName = new Map(RAW.employees.map((person) => [person.name, idMap.get(person.id)]));

  await Settings.insertMany(
    RAW.employees.map((person) => ({ employee: idMap.get(person.id) })),
  );

  /* -------------------------------- Leaves ------------------------------ */
  for (const leave of RAW.leaves) {
    const employeeId = idMap.get(leave.employeeId);
    if (!employeeId) continue;
    const from = shiftDate(leave.from, days);
    const to = shiftDate(leave.to, days);
    await LeaveRequest.create({
      employee: employeeId,
      type: leave.type,
      from,
      to,
      days: leave.days || daysBetweenInclusive(from, to),
      reason: leave.reason || '',
      handover: leave.handover || '',
      status: leave.status || 'Pending',
      note: leave.note || '',
      appliedOn: shiftDate(leave.appliedOn, days),
      reviewedBy: leave.reviewedBy ? displayName.get(leave.reviewedBy) || null : null,
      reviewedByName: leave.reviewedBy || null,
      reviewedOn: leave.reviewedOn ? shiftDate(leave.reviewedOn, days) : null,
    });
  }

  /* ------------------------------ Attendance ---------------------------- */
  const seen = new Set();
  const attendanceDocs = [];
  for (const record of RAW.attendance) {
    const employeeId = idMap.get(record.employeeId);
    if (!employeeId) continue;
    const date = shiftDate(record.date, days);
    const key = `${employeeId}-${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    attendanceDocs.push({
      employee: employeeId,
      date,
      status: record.status,
      mode: record.status === 'WFH' ? 'remote' : record.checkIn ? 'office' : null,
      checkIn: record.checkIn || null,
      checkOut: record.checkOut || null,
      hours: record.hours || 0,
      note: record.note || '',
    });
  }
  if (attendanceDocs.length) await Attendance.insertMany(attendanceDocs, { ordered: false });

  /* ---------------------------- Announcements --------------------------- */
  for (const item of RAW.announcements) {
    const authorId = idMap.get(item.authorId) || idMap.get('EMP-001');
    await Announcement.create({
      title: item.title,
      category: item.category || 'Company',
      body: item.body || '',
      author: authorId,
      authorName: item.authorName,
      authorRole: item.authorRole,
      date: shiftDate(item.date, days),
      pinned: Boolean(item.pinned),
      audience: item.audience || 'Everyone',
      readBy: (item.readBy || []).map((id) => idMap.get(id)).filter(Boolean),
      tone: item.tone || 'blue',
    });
  }

  /* ------------------------------- Training ----------------------------- */
  for (const course of RAW.trainings) {
    await TrainingProgram.create({
      title: course.title,
      category: course.category,
      description: course.description,
      format: course.format,
      level: course.level,
      durationMins: course.durationMins,
      modules: course.modules,
      instructor: course.instructor,
      instructorTitle: course.instructorTitle,
      dueDate: shiftDate(course.dueDate, days),
      mandatory: Boolean(course.mandatory),
      tone: course.tone || 'blue',
      enrolled: (course.enrolled || [])
        .filter((entry) => idMap.has(entry.employeeId))
        .map((entry) => ({
          employee: idMap.get(entry.employeeId),
          progress: entry.progress,
          status: entry.status,
          assignedOn: shiftDate(entry.assignedOn, days),
          completedOn: entry.completedOn ? shiftDate(entry.completedOn, days) : null,
        })),
    });
  }

  /* ----------------------------- Notifications -------------------------- */
  for (const item of RAW.notifications) {
    await Notification.create({
      type: item.type,
      title: item.title,
      body: item.body || '',
      recipient: item.employeeId ? idMap.get(item.employeeId) : null,
      audienceRoles: item.employeeId ? [] : item.audienceRoles || [],
      href: item.href || '/notifications',
      readBy: (item.readBy || []).map((id) => idMap.get(id)).filter(Boolean),
      createdAt: shiftTimestamp(item.createdAt, days),
    });
  }

  /* --------------------------- Registrations ---------------------------- */
  for (const request of RAW.registrations) {
    await RegistrationRequest.create({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone || '',
      jobTitle: request.jobTitle || 'Team member',
      department: request.department || 'Engineering',
      employmentType: request.employmentType || 'Full-time',
      location: request.location || 'Bengaluru, IN',
      note: request.note || '',
      status: request.status || 'Pending',
      appliedOn: shiftDate(request.appliedOn, days),
      systemRole: 'employee',
    });
    // A seeded request has no sign-in account until HR approves it. The
    // account is created on approval, with no known password, so the person
    // must use the registration flow instead — see README.
  }

  /* -------------------------------- Activity ---------------------------- */
  const hrId = idMap.get('EMP-001');
  const recentLeave = RAW.leaves[0];
  await Activity.insertMany([
    {
      employee: hrId,
      text: `posted “${RAW.announcements[0]?.title || 'a company update'}”`,
      type: 'announcement',
      at: new Date(Date.now() - 1000 * 60 * 55),
    },
    {
      employee: idMap.get(recentLeave?.employeeId) || hrId,
      text: 'applied for annual leave',
      type: 'leave',
      at: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      employee: hrId,
      text: 'approved a leave request',
      type: 'leave',
      at: new Date(Date.now() - 1000 * 60 * 60 * 26),
    },
    {
      employee: hrId,
      text: `added ${RAW.employees.at(-1)?.name || 'a new teammate'} to the directory`,
      type: 'people',
      at: new Date(Date.now() - 1000 * 60 * 60 * 50),
    },
  ]);

  const counts = {
    employees: await Employee.countDocuments({}),
    accounts: await User.countDocuments({}),
    leaves: await LeaveRequest.countDocuments({}),
    attendance: await Attendance.countDocuments({}),
    announcements: await Announcement.countDocuments({}),
    trainings: await TrainingProgram.countDocuments({}),
    notifications: await Notification.countDocuments({}),
    registrations: await RegistrationRequest.countDocuments({}),
  };

  console.log('[seed] Demo workspace ready:', counts);
  if (days !== 0) console.log(`[seed] Dates shifted by ${days} day(s) so the demo lines up with today.`);
  console.log(`[seed] Demo sign-in password: ${DEMO_PASSWORD} (accounts are bcrypt-hashed in MongoDB).`);
  return { skipped: false, counts };
}
