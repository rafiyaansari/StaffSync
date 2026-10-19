import { LEAVE_TYPES } from '../data/seed';

export const TONE_HEX = {
  navy: '#0b2545',
  blue: '#2f6fed',
  teal: '#0f8f9e',
  violet: '#7a4ee8',
  amber: '#c07a12',
  green: '#0a9468',
  rose: '#d43a52',
  slate: '#7d8a9c',
};

export const TONE_SOFT = {
  navy: '#e7ecf3',
  blue: '#eaf1ff',
  teal: '#e4f6f8',
  violet: '#f1ebff',
  amber: '#fdf3e1',
  green: '#e6f7ef',
  rose: '#fdecef',
  slate: '#f1f4f8',
};

export function leaveTypeLabel(type) {
  return LEAVE_TYPES[type]?.label || type;
}

export function leaveTypeShort(type) {
  return LEAVE_TYPES[type]?.short || type;
}

export function leaveTypeTone(type) {
  return LEAVE_TYPES[type]?.tone || 'slate';
}

export function attendanceTone(status) {
  switch (status) {
    case 'Present':
      return 'green';
    case 'Late':
      return 'amber';
    case 'WFH':
      return 'blue';
    case 'On leave':
      return 'violet';
    case 'Absent':
      return 'red';
    case 'Week off':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function attendanceIcon(status) {
  switch (status) {
    case 'Present':
      return 'checkCircle';
    case 'Late':
      return 'clock';
    case 'WFH':
      return 'home';
    case 'On leave':
      return 'calendar';
    case 'Absent':
      return 'xCircle';
    default:
      return 'clock';
  }
}

export function leaveStatusTone(status) {
  switch (status) {
    case 'Approved':
      return 'green';
    case 'Pending':
      return 'amber';
    case 'Rejected':
      return 'red';
    case 'Cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function employeeStatusTone(status) {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Probation':
      return 'amber';
    case 'Pending':
      return 'blue';
    case 'Inactive':
      return 'neutral';
    case 'On leave':
      return 'violet';
    default:
      return 'neutral';
  }
}

export function trainingStatusTone(status) {
  switch (status) {
    case 'Completed':
      return 'green';
    case 'In progress':
      return 'blue';
    case 'Not started':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function announcementTone(category) {
  switch (category) {
    case 'Policy':
      return 'navy';
    case 'Event':
      return 'blue';
    case 'Celebration':
      return 'amber';
    case 'HR':
      return 'violet';
    case 'Company':
      return 'teal';
    default:
      return 'blue';
  }
}

export function leaveStatusIcon(status) {
  switch (status) {
    case 'Approved':
      return 'checkCircle';
    case 'Pending':
      return 'clock';
    case 'Rejected':
      return 'xCircle';
    default:
      return 'minus';
  }
}

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
export const WORK_MODES = ['Hybrid', 'On-site', 'Remote'];
export const EMPLOYEE_STATUSES = ['Active', 'Probation', 'Inactive'];
export const ANNOUNCEMENT_CATEGORIES = ['Company', 'Policy', 'Event', 'Celebration', 'HR'];
export const SYSTEM_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
];
