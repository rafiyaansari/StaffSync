/**
 * Mock implementation of the StaffSync API.
 * Every method behaves like its REST counterpart:
 *   authApi.login            -> POST /api/auth/login
 *   employeesApi.list        -> GET  /api/employees
 *   employeesApi.create      -> POST /api/employees
 *   ... see README for the full mapping.
 */
import {
  addNotification,
  addActivity,
  delay,
  getSession,
  makeEmployeeId,
  nextId,
  readDb,
  resetDb,
  setSession,
  updateDb,
  writeDb,
} from './mockDb';
import { todayISO, nowTime24, hoursBetween } from '../utils/date';

const LEAVE_DEFAULTS = {
  annual: { total: 18, used: 0 },
  sick: { total: 10, used: 0 },
  casual: { total: 6, used: 0 },
  wfh: { total: 12, used: 0 },
};

const DEFAULT_PREFERENCES = {
  emailOnLeave: true,
  emailOnAnnouncement: true,
  weeklyDigest: false,
  pushNotifications: true,
  compactTables: false,
  showBirthdays: true,
};

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function findEmployee(db, employeeId) {
  return db.employees.find((employee) => employee.id === employeeId);
}

function actorFrom(db, user) {
  if (!user) return null;
  return findEmployee(db, user.employeeId) || null;
}

function publicEmployee(employee) {
  if (!employee) return null;
  // The UI only needs the employee object; in a real API you might strip
  // sensitive fields (salary, etc.) here based on the requesting role.
  return { ...employee };
}

export const mockApi = {
  mode: 'mock',

  /* ----------------------------- Auth ----------------------------- */
  auth: {
    async login({ email, password }) {
      await delay(420);
      const db = readDb();
      const account = db.accounts.find(
        (item) => item.email === normalizeEmail(email) && item.password === password,
      );
      if (!account) {
        fail('That email and password don’t match our records.', 401);
      }
      if (account.status === 'pending') {
        fail('Your account is awaiting HR approval. Please check back shortly.', 403);
      }
      const employee = findEmployee(db, account.employeeId);
      if (!employee) fail('We couldn’t find a profile for this account.', 404);
      if (employee.status === 'Inactive') fail('This account has been deactivated.', 403);

      const session = {
        token: `mock.${btoa(`${employee.id}:${Date.now()}`)}`,
        employeeId: employee.id,
        role: employee.systemRole,
        issuedAt: new Date().toISOString(),
      };
      setSession(session);
      return { user: publicEmployee(employee), token: session.token, session };
    },

    async register(payload) {
      await delay(600);
      const db = readDb();
      const email = normalizeEmail(payload.email);
      if (db.accounts.some((account) => account.email === email)) {
        fail('An account with this email already exists. Try signing in instead.', 409);
      }
      const requestId = nextId('REG', db.registrationRequests, 3001);
      const request = {
        id: requestId,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email,
        phone: payload.phone || '',
        department: payload.department || 'Engineering',
        jobTitle: payload.jobTitle || 'Team member',
        employmentType: payload.employmentType || 'Full-time',
        location: payload.location || 'Bengaluru, IN',
        systemRole: 'employee',
        appliedOn: todayISO(),
        status: 'Pending',
        note: payload.note || 'Self-registered via StaffSync.',
      };
      db.registrationRequests.unshift(request);
      db.accounts.push({
        employeeId: null,
        email,
        password: payload.password,
        status: 'pending',
        requestId,
      });
      addNotification(db, {
        type: 'system',
        title: 'New registration request',
        body: `${request.firstName} ${request.lastName} applied to join ${request.department}.`,
        audienceRoles: ['hr'],
        href: '/employees/requests',
      });
      writeDb(db);
      return {
        request,
        message: 'Registration submitted. HR will review and activate your account.',
      };
    },

    async me() {
      await delay(140);
      const session = getSession();
      if (!session) return null;
      const db = readDb();
      return publicEmployee(findEmployee(db, session.employeeId));
    },

    async changePassword({ employeeId, currentPassword, newPassword }) {
      await delay(300);
      const db = readDb();
      const account = db.accounts.find((item) => item.employeeId === employeeId);
      if (!account) fail('Account not found.', 404);
      if (account.password !== currentPassword) fail('Current password is incorrect.', 401);
      if (newPassword.length < 8) fail('Use at least 8 characters for your new password.');
      account.password = newPassword;
      writeDb(db);
      return { message: 'Password updated.' };
    },

    currentSession() {
      return getSession();
    },

    logout() {
      setSession(null);
    },
  },

  /* --------------------------- Employees -------------------------- */
  employees: {
    async list() {
      await delay(260);
      const db = readDb();
      return db.employees.map(publicEmployee);
    },

    async get(id) {
      await delay(200);
      const db = readDb();
      const employee = findEmployee(db, id);
      if (!employee) fail('Employee not found.', 404);
      return publicEmployee(employee);
    },

    async create(payload) {
      await delay(420);
      const db = readDb();
      const email = normalizeEmail(payload.email);
      if (db.accounts.some((account) => account.email === email)) {
        fail('That email is already linked to an account.', 409);
      }
      const id = makeEmployeeId(db);
      const leave = payload.leave || {
        annual: { total: 18, used: 0 },
        sick: { total: 10, used: 0 },
        casual: { total: 6, used: 0 },
        wfh: { total: 12, used: 0 },
      };
      const employee = {
        id,
        firstName: payload.firstName?.trim() || '',
        lastName: payload.lastName?.trim() || '',
        name: `${payload.firstName?.trim() || ''} ${payload.lastName?.trim() || ''}`.trim(),
        email,
        phone: payload.phone || '',
        role: payload.systemRole === 'hr' || payload.systemRole === 'manager' ? payload.systemRole : 'employee',
        systemRole: payload.systemRole || 'employee',
        jobTitle: payload.jobTitle || 'Team member',
        department: payload.department || 'Engineering',
        employmentType: payload.employmentType || 'Full-time',
        workMode: payload.workMode || 'Hybrid',
        location: payload.location || 'Bengaluru, IN',
        managerId: payload.managerId || null,
        managerName: findEmployee(db, payload.managerId)?.name || '—',
        joinDate: payload.joinDate || todayISO(),
        status: payload.status || 'Probation',
        dob: payload.dob || '1995-01-01',
        gender: payload.gender || 'Prefer not to say',
        bloodGroup: payload.bloodGroup || 'O+',
        address: payload.address || '',
        emergency: payload.emergency || { name: '', relation: '', phone: '' },
        skills: payload.skills || [],
        bio: payload.bio || '',
        leave,
        avatar: null,
      };
      db.employees.push(employee);
      db.accounts.push({
        employeeId: id,
        email,
        password: payload.password || 'StaffSync@123',
        status: 'active',
      });
      addActivity(db, { employeeId: id, text: 'joined the team', type: 'people' });
      addNotification(db, {
        type: 'system',
        title: 'New teammate added',
        body: `${employee.name} joined ${employee.department}.`,
        audienceRoles: ['hr'],
        href: '/employees',
      });
      writeDb(db);
      return publicEmployee(employee);
    },

    async update(id, payload) {
      await delay(360);
      const db = readDb();
      const employee = findEmployee(db, id);
      if (!employee) fail('Employee not found.', 404);
      const next = { ...employee, ...payload };
      if (payload.firstName || payload.lastName) {
        next.name = `${next.firstName} ${next.lastName}`.trim();
      }
      if (payload.managerId !== undefined) {
        next.managerName = findEmployee(db, payload.managerId)?.name || '—';
      }
      if (payload.email && normalizeEmail(payload.email) !== employee.email) {
        const account = db.accounts.find((item) => item.employeeId === id);
        const email = normalizeEmail(payload.email);
        if (db.accounts.some((item) => item.email === email && item.employeeId !== id)) {
          fail('That email is already in use.', 409);
        }
        next.email = email;
        if (account) account.email = email;
      }
      Object.assign(employee, next);
      // keep the account role in sync
      const account = db.accounts.find((item) => item.employeeId === id);
      if (account) {
        if (payload.systemRole) account.role = payload.systemRole;
        if (payload.password) account.password = payload.password;
      }
      writeDb(db);
      return publicEmployee(employee);
    },

    async remove(id) {
      await delay(300);
      const db = readDb();
      const employee = findEmployee(db, id);
      if (!employee) fail('Employee not found.', 404);
      if (employee.systemRole === 'hr' && db.employees.filter((e) => e.systemRole === 'hr').length <= 1) {
        fail('You can’t remove the last HR account.');
      }
      db.employees = db.employees.filter((item) => item.id !== id);
      db.accounts = db.accounts.filter((item) => item.employeeId !== id);
      db.leaveRequests = db.leaveRequests.filter((item) => item.employeeId !== id);
      db.attendance = db.attendance.filter((item) => item.employeeId !== id);
      writeDb(db);
      return { message: 'Employee removed.' };
    },
  },

  /* ----------------------------- Leaves --------------------------- */
  leaves: {
    async list({ employeeId } = {}) {
      await delay(220);
      const db = readDb();
      const rows = employeeId
        ? db.leaveRequests.filter((leave) => leave.employeeId === employeeId)
        : db.leaveRequests;
      return rows.map((leave) => {
        const employee = findEmployee(db, leave.employeeId);
        return {
          ...leave,
          employeeName: employee?.name || 'Unknown',
          jobTitle: employee?.jobTitle || '',
          department: employee?.department || '',
          managerId: employee?.managerId || null,
          email: employee?.email || '',
          appliedOn: leave.appliedOn?.slice(0, 10),
          days: leave.days || undefined,
        };
      });
    },

    async apply(payload, user) {
      await delay(420);
      const db = readDb();
      const employee = findEmployee(db, payload.employeeId || user?.employeeId);
      if (!employee) fail('Employee not found.', 404);
      if (!payload.from || !payload.to) fail('Choose both a start and end date.');
      if (payload.to < payload.from) fail('The end date can’t be before the start date.');
      const overlap = db.leaveRequests.find(
        (leave) =>
          leave.employeeId === employee.id &&
          ['Pending', 'Approved'].includes(leave.status) &&
          leave.from <= payload.to &&
          leave.to >= payload.from,
      );
      if (overlap) fail('You already have a leave request covering those dates.');

      const request = {
        id: nextId('LV', db.leaveRequests, 2041),
        employeeId: employee.id,
        type: payload.type || 'annual',
        from: payload.from,
        to: payload.to,
        reason: payload.reason?.trim() || '',
        status: 'Pending',
        appliedOn: todayISO(),
        handover: payload.handover?.trim() || '',
        reviewedBy: null,
        reviewedOn: null,
        note: '',
      };
      db.leaveRequests.unshift(request);
      const manager = findEmployee(db, employee.managerId);
      addNotification(db, {
        type: 'leave',
        title: `${employee.name} requested ${request.type === 'wfh' ? 'work from home' : `${request.type} leave`}`,
        body: `${request.from} → ${request.to}. Needs review.`,
        audienceRoles: ['hr'],
        employeeId: manager?.id,
        href: '/leaves',
      });
      if (manager) {
        addNotification(db, {
          type: 'leave',
          title: `${employee.name} requested leave`,
          body: `${request.from} → ${request.to}. Needs review.`,
          audienceRoles: ['manager'],
          employeeId: manager.id,
          href: '/leaves',
        });
      }
      addActivity(db, {
        employeeId: employee.id,
        text: `applied for ${request.type === 'wfh' ? 'work from home' : `${request.type} leave`}`,
        type: 'leave',
      });
      writeDb(db);
      return request;
    },

    async decide({ id, status, note, reviewer }, user) {
      await delay(360);
      if (!['Approved', 'Rejected'].includes(status)) fail('Invalid decision.');
      const db = readDb();
      const leave = db.leaveRequests.find((item) => item.id === id);
      if (!leave) fail('Leave request not found.', 404);
      if (leave.status !== 'Pending') fail('This request has already been reviewed.');
      const reviewerEmployee = findEmployee(db, user?.employeeId) || actorFrom(db, reviewer);
      leave.status = status;
      leave.note = note?.trim() || '';
      leave.reviewedBy = reviewerEmployee?.name || 'HR';
      leave.reviewedOn = todayISO();
      const employee = findEmployee(db, leave.employeeId);
      if (status === 'Approved' && employee && leave.type !== 'unpaid') {
        const used = employee.leave?.[leave.type]?.used ?? 0;
        const days = Math.max(
          1,
          Math.round((new Date(leave.to) - new Date(leave.from)) / 86400000) + 1,
        );
        if (!employee.leave) employee.leave = JSON.parse(JSON.stringify(LEAVE_DEFAULTS));
        employee.leave[leave.type].used = Math.min(
          employee.leave[leave.type].total,
          used + days,
        );
      }
      addNotification(db, {
        type: 'leave',
        title: `Your ${leave.type} leave was ${status.toLowerCase()}`,
        body: `${leave.from} → ${leave.to}${leave.note ? ` · ${leave.note}` : ''}`,
        audienceRoles: ['employee', 'manager', 'hr'],
        employeeId: leave.employeeId,
        href: '/leaves',
      });
      addActivity(db, {
        employeeId: user?.employeeId || 'EMP-001',
        text: `${status.toLowerCase()} ${employee?.name || 'a'}’s leave request`,
        type: 'leave',
      });
      writeDb(db);
      return leave;
    },

    async cancel({ id, employeeId }) {
      await delay(260);
      const db = readDb();
      const leave = db.leaveRequests.find((item) => item.id === id);
      if (!leave) fail('Leave request not found.', 404);
      if (leave.employeeId !== employeeId) fail('You can only cancel your own requests.', 403);
      if (leave.status !== 'Pending') fail('Only pending requests can be cancelled.');
      leave.status = 'Cancelled';
      leave.note = 'Withdrawn by employee.';
      writeDb(db);
      return leave;
    },
  },

  /* --------------------------- Attendance ------------------------- */
  attendance: {
    async list({ employeeId, from, to } = {}) {
      await delay(220);
      const db = readDb();
      return db.attendance.filter((record) => {
        if (employeeId && record.employeeId !== employeeId) return false;
        if (from && record.date < from) return false;
        if (to && record.date > to) return false;
        return true;
      });
    },

    async today() {
      await delay(200);
      const db = readDb();
      const date = todayISO();
      return db.attendance.filter((record) => record.date === date);
    },

    async clockIn({ employeeId, mode = 'office' }) {
      await delay(320);
      const db = readDb();
      const employee = findEmployee(db, employeeId);
      if (!employee) fail('Employee not found.', 404);
      const date = todayISO();
      const time = nowTime24();
      let record = db.attendance.find((item) => item.employeeId === employeeId && item.date === date);
      if (record && record.checkIn) fail('You’ve already clocked in today.');
      if (!record) {
        record = {
          id: `ATT-${employeeId}-${date}`,
          employeeId,
          date,
          status: 'Present',
          leaveType: null,
          checkIn: null,
          checkOut: null,
          hours: 0,
          note: '',
        };
        db.attendance.push(record);
      }
      record.checkIn = time;
      record.checkOut = null;
      record.status = mode === 'remote' ? 'WFH' : time > '09:45' ? 'Late' : 'Present';
      record.note = mode === 'remote' ? 'Working remotely' : time > '09:45' ? 'Late check-in' : 'On time';
      writeDb(db);
      return record;
    },

    async clockOut({ employeeId }) {
      await delay(320);
      const db = readDb();
      const date = todayISO();
      const record = db.attendance.find((item) => item.employeeId === employeeId && item.date === date);
      if (!record || !record.checkIn) fail('You need to clock in first.');
      if (record.checkOut) fail('You’ve already clocked out today.');
      record.checkOut = nowTime24();
      record.hours = Number(Math.max(0, hoursBetween(record.checkIn, record.checkOut) - 0.5).toFixed(1));
      writeDb(db);
      return record;
    },
  },

  /* -------------------------- Announcements ----------------------- */
  announcements: {
    async list() {
      await delay(240);
      const db = readDb();
      return db.announcements
        .slice()
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date));
    },

    async create(payload, user) {
      await delay(360);
      const db = readDb();
      const author = findEmployee(db, user?.employeeId);
      if (!payload.title?.trim()) fail('Give the announcement a title.');
      const announcement = {
        id: nextId('ANN', db.announcements, 1101),
        title: payload.title.trim(),
        category: payload.category || 'Company',
        body: payload.body?.trim() || '',
        authorId: author?.id || user?.employeeId,
        authorName: author?.name || 'People Ops',
        authorRole: author?.jobTitle || 'HR',
        date: todayISO(),
        pinned: Boolean(payload.pinned),
        audience: payload.audience || 'Everyone',
        readBy: [author?.id].filter(Boolean),
        tone: payload.tone || 'blue',
      };
      db.announcements.unshift(announcement);
      addNotification(db, {
        type: 'announcement',
        title: `New announcement · ${announcement.title}`,
        body: announcement.body.slice(0, 90) + (announcement.body.length > 90 ? '…' : ''),
        audienceRoles: ['employee', 'manager', 'hr'],
        href: '/announcements',
      });
      addActivity(db, {
        employeeId: author?.id || 'EMP-001',
        text: `posted “${announcement.title}”`,
        type: 'announcement',
      });
      writeDb(db);
      return announcement;
    },

    async update(id, payload) {
      await delay(280);
      const db = readDb();
      const announcement = db.announcements.find((item) => item.id === id);
      if (!announcement) fail('Announcement not found.', 404);
      Object.assign(announcement, payload);
      writeDb(db);
      return announcement;
    },

    async remove(id) {
      await delay(240);
      const db = readDb();
      db.announcements = db.announcements.filter((item) => item.id !== id);
      writeDb(db);
      return { message: 'Announcement deleted.' };
    },

    async markRead({ id, employeeId }) {
      await delay(120);
      const db = readDb();
      const announcement = db.announcements.find((item) => item.id === id);
      if (announcement && !announcement.readBy.includes(employeeId)) {
        announcement.readBy.push(employeeId);
        writeDb(db);
      }
      return announcement;
    },
  },

  /* ----------------------------- Training ------------------------- */
  training: {
    async list() {
      await delay(240);
      const db = readDb();
      return db.trainings.map((course) => ({
        ...course,
        enrolled: course.enrolled.map((entry) => {
          const employee = findEmployee(db, entry.employeeId);
          return {
            ...entry,
            employeeName: employee?.name || 'Unknown',
            department: employee?.department || '',
            jobTitle: employee?.jobTitle || '',
          };
        }),
      }));
    },

    async enroll({ trainingId, employeeId }) {
      await delay(300);
      const db = readDb();
      const course = db.trainings.find((item) => item.id === trainingId);
      if (!course) fail('Training not found.', 404);
      if (course.enrolled.some((entry) => entry.employeeId === employeeId)) {
        return course.enrolled.find((entry) => entry.employeeId === employeeId);
      }
      const entry = {
        employeeId,
        progress: 0,
        status: 'Not started',
        assignedOn: todayISO(),
        completedOn: null,
      };
      course.enrolled.push(entry);
      writeDb(db);
      return entry;
    },

    async progress({ trainingId, employeeId, progress }) {
      await delay(220);
      const db = readDb();
      const course = db.trainings.find((item) => item.id === trainingId);
      if (!course) fail('Training not found.', 404);
      const entry = course.enrolled.find((item) => item.employeeId === employeeId);
      if (!entry) fail('You are not enrolled in this training.', 404);
      const value = Math.max(0, Math.min(100, Number(progress)));
      entry.progress = value;
      entry.status = value >= 100 ? 'Completed' : value > 0 ? 'In progress' : 'Not started';
      entry.completedOn = value >= 100 ? todayISO() : null;
      writeDb(db);
      return entry;
    },

    async assign({ trainingId, employeeIds, dueDate }, user) {
      await delay(420);
      const db = readDb();
      const course = db.trainings.find((item) => item.id === trainingId);
      if (!course) fail('Training not found.', 404);
      if (!employeeIds?.length) fail('Select at least one teammate.');
      const assignedBy = findEmployee(db, user?.employeeId);
      if (dueDate) course.dueDate = dueDate;
      employeeIds.forEach((employeeId) => {
        if (!course.enrolled.some((entry) => entry.employeeId === employeeId)) {
          course.enrolled.push({
            employeeId,
            progress: 0,
            status: 'Not started',
            assignedOn: todayISO(),
            completedOn: null,
          });
          addNotification(db, {
            type: 'training',
            title: 'New training assigned',
            body: `${course.title} was assigned by ${assignedBy?.name || 'your manager'}.`,
            audienceRoles: ['employee', 'manager', 'hr'],
            employeeId,
            href: '/training',
          });
        }
      });
      writeDb(db);
      return { trainingId, count: employeeIds.length };
    },
  },

  /* -------------------------- Notifications ----------------------- */
  notifications: {
    async list(user) {
      await delay(180);
      const db = readDb();
      if (!user) return [];
      return db.notifications
        .filter((notification) => {
          if (notification.employeeId) return notification.employeeId === user.employeeId;
          return notification.audienceRoles?.includes(user.role);
        })
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((notification) => ({
          ...notification,
          read: notification.readBy?.includes(user.employeeId) || false,
        }));
    },

    async markRead({ id, employeeId }) {
      await delay(100);
      const db = readDb();
      const notification = db.notifications.find((item) => item.id === id);
      if (notification && !notification.readBy.includes(employeeId)) {
        notification.readBy.push(employeeId);
        writeDb(db);
      }
      return notification;
    },

    async markAllRead(user) {
      await delay(160);
      const db = readDb();
      db.notifications.forEach((notification) => {
        const relevant = notification.employeeId
          ? notification.employeeId === user.employeeId
          : notification.audienceRoles?.includes(user.role);
        if (relevant && !notification.readBy.includes(user.employeeId)) {
          notification.readBy.push(user.employeeId);
        }
      });
      writeDb(db);
      return { message: 'All caught up.' };
    },
  },

  /* ----------------------- Registration requests ------------------ */
  registrations: {
    async list() {
      await delay(220);
      const db = readDb();
      return [...db.registrationRequests].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
    },

    async decide({ id, status, note }, user) {
      await delay(360);
      if (!['Approved', 'Rejected'].includes(status)) fail('Invalid decision.');
      const db = readDb();
      const request = db.registrationRequests.find((item) => item.id === id);
      if (!request) fail('Registration request not found.', 404);
      if (request.status !== 'Pending') fail('This request has already been reviewed.');
      request.status = status;
      request.reviewedBy = findEmployee(db, user?.employeeId)?.name || 'HR';
      request.reviewedOn = todayISO();
      request.note = note || request.note;
      const account = db.accounts.find((item) => item.email === request.email);

      if (status === 'Approved') {
        const employee = {
          id: makeEmployeeId(db),
          firstName: request.firstName,
          lastName: request.lastName,
          name: `${request.firstName} ${request.lastName}`,
          email: request.email,
          phone: request.phone,
          role: 'employee',
          systemRole: request.systemRole || 'employee',
          jobTitle: request.jobTitle,
          department: request.department,
          employmentType: request.employmentType || 'Full-time',
          workMode: 'Hybrid',
          location: request.location || 'Bengaluru, IN',
          managerId: null,
          managerName: '—',
          joinDate: todayISO(),
          status: 'Probation',
          dob: '1996-01-01',
          gender: 'Prefer not to say',
          bloodGroup: 'O+',
          address: '',
          emergency: { name: '', relation: '', phone: '' },
          skills: [],
          bio: '',
          leave: JSON.parse(JSON.stringify(LEAVE_DEFAULTS)),
          avatar: null,
        };
        db.employees.push(employee);
        if (account) {
          account.employeeId = employee.id;
          account.status = 'active';
          account.role = 'employee';
        } else {
          db.accounts.push({
            employeeId: employee.id,
            email: request.email,
            password: 'StaffSync@123',
            status: 'active',
          });
        }
        request.employeeId = employee.id;
        addNotification(db, {
          type: 'system',
          title: 'Welcome to Nimbus Labs',
          body: 'Your account is active. Complete your profile to get started.',
          audienceRoles: ['employee', 'manager', 'hr'],
          employeeId: employee.id,
          href: '/profile',
        });
        addActivity(db, { employeeId: employee.id, text: 'joined the team', type: 'people' });
      } else if (account) {
        account.status = 'rejected';
      }
      writeDb(db);
      return request;
    },
  },

  /* ----------------------------- Settings ------------------------- */
  settings: {
    async get(employeeId) {
      await delay(160);
      const db = readDb();
      return { ...DEFAULT_PREFERENCES, ...(db.preferences?.[employeeId] || {}) };
    },

    async update(employeeId, payload) {
      await delay(200);
      const db = readDb();
      db.preferences = db.preferences || {};
      db.preferences[employeeId] = { ...DEFAULT_PREFERENCES, ...(db.preferences[employeeId] || {}), ...payload };
      writeDb(db);
      return db.preferences[employeeId];
    },
  },

  /* ----------------------------- Activity ------------------------- */
  activity: {
    async list(limit = 8) {
      await delay(160);
      const db = readDb();
      return db.activity.slice(0, limit).map((entry) => ({
        ...entry,
        employee: findEmployee(db, entry.employeeId),
      }));
    },
  },

  /* ------------------------------ Reset --------------------------- */
  async resetDemoData() {
    await delay(400);
    const db = resetDb();
    return db;
  },
};

export { DEFAULT_PREFERENCES };
