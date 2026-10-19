/**
 * API serializers.
 *
 * MongoDB uses ObjectIds internally, but the React client was written against
 * string ids (`id`, `employeeId`, `readBy: []`, `enrolled[].employeeId`).
 * Every response therefore goes through one of these functions so the wire
 * format stays exactly what the UI expects.
 */

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const nameOf = (employee) => {
  if (!employee) return null;
  if (typeof employee === 'string') return null;
  return employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || null;
};

export function serializeEmployee(doc, { viewer = null, includePrivate = null } = {}) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: false }) : doc;
  const id = idOf(plain._id || plain.id);
  const manager = plain.managerId;
  const managerDoc = manager && typeof manager === 'object' && (manager.name || manager.firstName) ? manager : null;
  const managerId = manager ? idOf(manager) : null;

  // Private contact details are visible to HR, to the employee themselves and
  // to that employee's direct manager. Everyone else gets the directory view.
  const isSelf = viewer?.employeeId === id;
  const isHr = viewer?.role === 'hr';
  const isManagerOfRecord = viewer?.role === 'manager' && managerId === viewer?.employeeId;
  const priv = includePrivate === true || isHr || isSelf || isManagerOfRecord;

  const employee = {
    id,
    employeeCode: plain.employeeCode || null,
    firstName: plain.firstName,
    lastName: plain.lastName,
    name: plain.name || `${plain.firstName || ''} ${plain.lastName || ''}`.trim(),
    email: plain.email,
    jobTitle: plain.jobTitle,
    department: plain.department,
    role: plain.systemRole,
    systemRole: plain.systemRole,
    employmentType: plain.employmentType,
    workMode: plain.workMode,
    location: plain.location,
    managerId,
    managerName: nameOf(managerDoc) || plain.managerName || '—',
    joinDate: plain.joinDate,
    status: plain.status,
    gender: plain.gender,
    skills: Array.isArray(plain.skills) ? plain.skills : [],
    bio: plain.bio || '',
    avatar: plain.avatar || null,
    leave: plain.leave || {},
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };

  if (priv) {
    employee.phone = plain.phone || '';
    employee.dob = plain.dob || '';
    employee.bloodGroup = plain.bloodGroup || '';
    employee.address = plain.address || '';
    employee.emergency = {
      name: plain.emergency?.name || '',
      relation: plain.emergency?.relation || '',
      phone: plain.emergency?.phone || '',
    };
  } else {
    employee.phone = '';
    employee.dob = '';
    employee.bloodGroup = '';
    employee.address = '';
    employee.emergency = { name: '', relation: '', phone: '' };
  }

  return employee;
}

/** Compact directory entry used inside activity + notification payloads. */
export function serializeDirectoryEmployee(doc) {
  if (!doc || typeof doc === 'string') return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: idOf(plain._id || plain.id),
    name: plain.name || `${plain.firstName || ''} ${plain.lastName || ''}`.trim(),
    firstName: plain.firstName,
    lastName: plain.lastName,
    jobTitle: plain.jobTitle,
    department: plain.department,
    avatar: plain.avatar || null,
    systemRole: plain.systemRole,
    role: plain.systemRole,
  };
}

export function serializeLeave(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const employee = plain.employee && typeof plain.employee === 'object' ? plain.employee : null;
  return {
    id: idOf(plain._id || plain.id),
    employeeId: idOf(plain.employee) || (employee ? idOf(employee._id) : null),
    employeeName: nameOf(employee) || plain.employeeName || 'Unknown',
    jobTitle: employee?.jobTitle || '',
    department: employee?.department || '',
    managerId: employee ? idOf(employee.managerId) : null,
    email: employee?.email || '',
    type: plain.type,
    from: plain.from,
    to: plain.to,
    days: plain.days,
    reason: plain.reason || '',
    handover: plain.handover || '',
    status: plain.status,
    note: plain.note || '',
    appliedOn: plain.appliedOn,
    reviewedBy: plain.reviewedByName || null,
    reviewedById: idOf(plain.reviewedBy),
    reviewedOn: plain.reviewedOn || null,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

export function serializeAttendance(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: idOf(plain._id || plain.id),
    employeeId: idOf(plain.employee),
    date: plain.date,
    status: plain.status,
    mode: plain.mode || null,
    checkIn: plain.checkIn || null,
    checkOut: plain.checkOut || null,
    hours: plain.hours || 0,
    note: plain.note || '',
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
  };
}

export function serializeAnnouncement(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: idOf(plain._id || plain.id),
    title: plain.title,
    category: plain.category,
    body: plain.body || '',
    authorId: idOf(plain.author),
    authorName: plain.authorName || 'People Ops',
    authorRole: plain.authorRole || 'HR',
    date: plain.date,
    pinned: Boolean(plain.pinned),
    audience: plain.audience || 'Everyone',
    readBy: (plain.readBy || []).map((value) => idOf(value)).filter(Boolean),
    tone: plain.tone || 'blue',
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

export function serializeTraining(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: idOf(plain._id || plain.id),
    title: plain.title,
    category: plain.category,
    description: plain.description || '',
    format: plain.format,
    level: plain.level,
    durationMins: plain.durationMins,
    modules: plain.modules,
    instructor: plain.instructor || '',
    instructorTitle: plain.instructorTitle || '',
    dueDate: plain.dueDate || null,
    mandatory: Boolean(plain.mandatory),
    tone: plain.tone || 'blue',
    enrolled: (plain.enrolled || []).map((entry) => ({
      employeeId: idOf(entry.employee),
      progress: entry.progress,
      status: entry.status,
      assignedOn: entry.assignedOn,
      completedOn: entry.completedOn || null,
    })),
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
  };
}

export function serializeNotification(doc, employeeId) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const readBy = (plain.readBy || []).map((value) => idOf(value)).filter(Boolean);
  return {
    id: idOf(plain._id || plain.id),
    type: plain.type,
    title: plain.title,
    body: plain.body || '',
    href: plain.href || '/notifications',
    audienceRoles: plain.audienceRoles || [],
    readBy,
    read: Boolean(employeeId && readBy.includes(employeeId)),
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function serializeRegistration(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: idOf(plain._id || plain.id),
    firstName: plain.firstName,
    lastName: plain.lastName,
    name: `${plain.firstName || ''} ${plain.lastName || ''}`.trim(),
    email: plain.email,
    phone: plain.phone || '',
    jobTitle: plain.jobTitle || '',
    department: plain.department || '',
    employmentType: plain.employmentType || '',
    location: plain.location || '',
    startDate: plain.startDate || null,
    note: plain.note || '',
    systemRole: plain.systemRole || 'employee',
    status: plain.status,
    appliedOn: plain.appliedOn,
    reviewedBy: plain.reviewedByName || null,
    reviewedById: idOf(plain.reviewedBy),
    reviewedOn: plain.reviewedOn || null,
    employeeId: idOf(plain.employee),
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
  };
}

export function serializeActivity(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const employee = plain.employee && typeof plain.employee === 'object' ? plain.employee : null;
  return {
    id: idOf(plain._id || plain.id),
    employeeId: idOf(plain.employee),
    employee: serializeDirectoryEmployee(employee),
    text: plain.text,
    type: plain.type,
    at: plain.at ? new Date(plain.at).toISOString() : new Date().toISOString(),
  };
}

export { idOf, nameOf };
