import { addDays, dateRange, isoDate, isWeekend, parseISO, todayISO } from './date';

export const ATTENDED_STATUSES = ['Present', 'Late', 'WFH'];

export function employeeById(employees, id) {
  return employees.find((employee) => employee.id === id) || null;
}

export function fullName(employee) {
  return employee?.name || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
}

export function roleOf(employee) {
  return employee?.systemRole || employee?.role || 'employee';
}

export function isHR(employee) {
  return roleOf(employee) === 'hr';
}

export function teamMembers(employees, managerId) {
  return employees.filter((employee) => employee.managerId === managerId);
}

export function reportsOf(employees, managerId) {
  return employees.filter((employee) => employee.managerId === managerId && employee.status !== 'Inactive');
}

export function directTeamIds(employees, managerId) {
  return [managerId, ...teamMembers(employees, managerId).map((employee) => employee.id)];
}

export function leaveDates(leave) {
  if (!leave?.from) return [];
  return dateRange(leave.from, leave.to || leave.from);
}

export function employeesOnLeaveToday(leaves, employees, date = todayISO()) {
  const approved = leaves.filter(
    (leave) => leave.status === 'Approved' && leave.from <= date && (leave.to || leave.from) >= date,
  );
  return approved
    .map((leave) => ({
      leave,
      employee: employeeById(employees, leave.employeeId),
    }))
    .filter((entry) => entry.employee);
}

export function todayRecords(attendance, date = todayISO()) {
  return attendance.filter((record) => record.date === date);
}

export function attendanceStats(records, employees) {
  const active = employees.filter((employee) => employee.status !== 'Inactive');
  const total = active.length;
  const present = records.filter((record) => record.status === 'Present').length;
  const late = records.filter((record) => record.status === 'Late').length;
  const wfh = records.filter((record) => record.status === 'WFH').length;
  const onLeave = records.filter((record) => record.status === 'On leave').length;
  const absent = records.filter((record) => record.status === 'Absent').length;
  const accounted = records.filter((record) => employeeById(active, record.employeeId)).length;
  const attended = present + late + wfh;
  const denominator = Math.min(total, accounted || records.length);
  const rate = denominator ? Math.round((attended / denominator) * 100) : 0;
  return {
    total,
    present: present + late,
    late,
    wfh,
    onLeave,
    absent,
    rate,
    accounted,
    unattended: Math.max(0, denominator - onLeave - absent - attended),
  };
}

export function departmentHeadcount(employees) {
  const active = employees.filter((employee) => employee.status !== 'Inactive');
  const groups = active.reduce((acc, employee) => {
    acc[employee.department] = (acc[employee.department] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(groups)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export function newJoinersThisMonth(employees, monthDate = new Date()) {
  const prefix = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  return employees.filter((employee) => employee.joinDate?.startsWith(prefix));
}

export function birthdaysThisMonth(employees, monthDate = new Date()) {
  const month = String(monthDate.getMonth() + 1).padStart(2, '0');
  return employees
    .filter((employee) => employee.dob?.slice(5, 7) === month)
    .sort((a, b) => a.dob.slice(8, 10).localeCompare(b.dob.slice(8, 10)));
}

export function pendingLeaves(leaves, employees, managerId = null) {
  return leaves.filter((leave) => {
    if (leave.status !== 'Pending') return false;
    if (!managerId) return true;
    const employee = employeeById(employees, leave.employeeId);
    return employee?.managerId === managerId;
  });
}

export function leaveSummary(leaves, employeeId) {
  const own = leaves.filter((leave) => leave.employeeId === employeeId);
  return {
    total: own.length,
    pending: own.filter((leave) => leave.status === 'Pending').length,
    approved: own.filter((leave) => leave.status === 'Approved').length,
    rejected: own.filter((leave) => leave.status === 'Rejected').length,
  };
}

export function leaveBalance(employee) {
  const leave = employee?.leave || {};
  return ['annual', 'sick', 'casual', 'wfh'].map((type) => {
    const entry = leave[type] || { total: 0, used: 0 };
    return {
      type,
      total: entry.total,
      used: entry.used,
      remaining: Math.max(0, entry.total - entry.used),
      percent: entry.total ? Math.round((entry.used / entry.total) * 100) : 0,
    };
  });
}

export function attendanceForEmployee(attendance, employeeId, { from, to } = {}) {
  return attendance
    .filter((record) => {
      if (record.employeeId !== employeeId) return false;
      if (from && record.date < from) return false;
      if (to && record.date > to) return false;
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function monthAttendance(attendance, employeeId, monthDate = new Date()) {
  const prefix = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  const map = {};
  attendance
    .filter((record) => record.employeeId === employeeId && record.date.startsWith(prefix))
    .forEach((record) => {
      map[record.date] = record;
    });
  return map;
}

export function monthAttendanceStats(records, employeeId, monthDate = new Date()) {
  const map = monthAttendance(records, employeeId, monthDate);
  const values = Object.values(map);
  const present = values.filter((record) => record.status === 'Present').length;
  const late = values.filter((record) => record.status === 'Late').length;
  const wfh = values.filter((record) => record.status === 'WFH').length;
  const onLeave = values.filter((record) => record.status === 'On leave').length;
  const absent = values.filter((record) => record.status === 'Absent').length;
  const logged = values.filter((record) => record.hours > 0);
  const avgHours = logged.length
    ? (logged.reduce((sum, record) => sum + record.hours, 0) / logged.length).toFixed(1)
    : '0.0';
  const workingDaysSoFar = dateRange(
    isoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)),
    todayISO(),
  ).filter((iso) => !isWeekend(parseISO(iso))).length;
  return {
    present,
    late,
    wfh,
    onLeave,
    absent,
    avgHours,
    loggedDays: values.length,
    workingDaysSoFar,
    rate: values.length ? Math.round(((present + late + wfh) / values.length) * 100) : 0,
  };
}

export function weeklyAttendance(attendance, employees, days = 7) {
  const active = employees.filter((employee) => employee.status !== 'Inactive');
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(todayISO(), -i);
    const parsed = parseISO(date);
    if (isWeekend(parsed)) continue;
    const records = todayRecords(attendance, date).filter((record) =>
      employeeById(active, record.employeeId),
    );
    const stats = attendanceStats(records, employees);
    out.push({
      date,
      label: parsed.toLocaleDateString('en-IN', { weekday: 'short' }),
      shortDate: parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      rate: stats.rate,
      present: stats.present,
      wfh: stats.wfh,
      onLeave: stats.onLeave,
      absent: stats.absent,
      total: stats.accounted,
    });
  }
  return out;
}

export function leaveTypeCounts(leaves) {
  return leaveTypes.reduce((acc, type) => {
    acc[type] = leaves.filter((leave) => leave.type === type).length;
    return acc;
  }, {});
}

export const leaveTypes = ['annual', 'sick', 'casual', 'wfh', 'unpaid'];

export function upcomingLeaves(leaves, employees, { days = 30, limit = 5 } = {}) {
  const cut = addDays(todayISO(), days);
  return leaves
    .filter(
      (leave) =>
        leave.status === 'Approved' &&
        leave.from >= todayISO() &&
        leave.from <= cut &&
        employeeById(employees, leave.employeeId),
    )
    .slice()
    .sort((a, b) => a.from.localeCompare(b.from))
    .slice(0, limit)
    .map((leave) => ({ ...leave, employee: employeeById(employees, leave.employeeId) }));
}

export function trainingEnrollment(course, employeeId) {
  return course.enrolled?.find((entry) => entry.employeeId === employeeId) || null;
}

export function myCourses(trainings, employeeId) {
  return trainings
    .filter((course) => trainingEnrollment(course, employeeId))
    .map((course) => ({ ...course, enrollment: trainingEnrollment(course, employeeId) }));
}

export function availableCourses(trainings, employeeId) {
  return trainings.filter((course) => !trainingEnrollment(course, employeeId));
}

export function trainingStats(trainings, employeeIds = null) {
  const relevant = employeeIds
    ? trainings.flatMap((course) =>
        course.enrolled
          .filter((entry) => employeeIds.includes(entry.employeeId))
          .map((entry) => ({ ...entry, courseId: course.id })),
      )
    : trainings.flatMap((course) => course.enrolled.map((entry) => ({ ...entry, courseId: course.id })));
  const completed = relevant.filter((entry) => entry.status === 'Completed').length;
  const inProgress = relevant.filter((entry) => entry.status === 'In progress').length;
  const notStarted = relevant.filter((entry) => entry.status === 'Not started').length;
  return {
    assignments: relevant.length,
    completed,
    inProgress,
    notStarted,
    completionRate: relevant.length ? Math.round((completed / relevant.length) * 100) : 0,
  };
}

export function teamTraining(trainings, employees, managerId) {
  const ids = new Set(reportsOf(employees, managerId).map((employee) => employee.id));
  return trainings
    .map((course) => ({
      ...course,
      enrolled: course.enrolled.filter((entry) => ids.has(entry.employeeId)),
    }))
    .filter((course) => course.enrolled.length);
}

export function todayStatusFor(employeeId, attendance, leaves, date = todayISO()) {
  const record = attendance.find((item) => item.employeeId === employeeId && item.date === date);
  if (record) return record;
  const leave = leaves.find(
    (item) =>
      item.employeeId === employeeId &&
      item.status === 'Approved' &&
      item.from <= date &&
      (item.to || item.from) >= date,
  );
  if (leave) {
    return {
      id: `derived-${employeeId}-${date}`,
      employeeId,
      date,
      status: 'On leave',
      leaveType: leave.type,
      checkIn: null,
      checkOut: null,
      hours: 0,
      note: 'Approved leave',
    };
  }
  return null;
}

export function searchDirectory(employees, query, limit = 6) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return employees
    .filter(
      (employee) =>
        employee.name.toLowerCase().includes(term) ||
        employee.email.toLowerCase().includes(term) ||
        employee.department.toLowerCase().includes(term) ||
        employee.jobTitle.toLowerCase().includes(term),
    )
    .slice(0, limit);
}
