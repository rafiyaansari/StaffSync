/**
 * Navigation is defined per role so the sidebar, search and route guard all
 * stay in sync from a single source of truth.
 */
export const NAVIGATION = {
  hr: [
    {
      label: 'Workspace',
      items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true }],
    },
    {
      label: 'People',
      items: [
        { to: '/employees', label: 'Employees', icon: 'users' },
        { to: '/employees/requests', label: 'Registrations', icon: 'clipboard', badgeKey: 'registrations' },
        { to: '/attendance', label: 'Attendance', icon: 'clock' },
        { to: '/leaves', label: 'Leave management', icon: 'calendar', badgeKey: 'pendingLeaves' },
      ],
    },
    {
      label: 'Engage',
      items: [
        { to: '/announcements', label: 'Announcements', icon: 'megaphone' },
        { to: '/training', label: 'Training', icon: 'graduation' },
      ],
    },
    {
      label: 'Account',
      items: [{ to: '/settings', label: 'Settings', icon: 'settings' }],
    },
  ],
  manager: [
    {
      label: 'Workspace',
      items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true }],
    },
    {
      label: 'My team',
      items: [
        { to: '/team', label: 'Team overview', icon: 'users' },
        { to: '/leaves', label: 'Approvals', icon: 'calendarCheck', badgeKey: 'pendingLeaves' },
        { to: '/attendance', label: 'Team attendance', icon: 'clock' },
      ],
    },
    {
      label: 'Engage',
      items: [
        { to: '/announcements', label: 'Announcements', icon: 'megaphone' },
        { to: '/training', label: 'Training', icon: 'graduation' },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/profile', label: 'My profile', icon: 'user' },
        { to: '/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
  employee: [
    {
      label: 'Workspace',
      items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true }],
    },
    {
      label: 'Me',
      items: [
        { to: '/profile', label: 'My profile', icon: 'user' },
        { to: '/attendance', label: 'My attendance', icon: 'clock' },
        { to: '/leaves', label: 'My leaves', icon: 'calendar' },
        { to: '/training', label: 'My learning', icon: 'graduation' },
      ],
    },
    {
      label: 'Stay in the loop',
      items: [{ to: '/announcements', label: 'Announcements', icon: 'megaphone' }],
    },
    {
      label: 'Account',
      items: [{ to: '/settings', label: 'Settings', icon: 'settings' }],
    },
  ],
};

export const ROUTE_META = {
  '/dashboard': { title: 'Dashboard', roles: ['hr', 'manager', 'employee'] },
  '/employees': { title: 'Employees', roles: ['hr'] },
  '/employees/requests': { title: 'Registrations', roles: ['hr'] },
  '/team': { title: 'Team overview', roles: ['manager'] },
  '/attendance': { title: 'Attendance', roles: ['hr', 'manager', 'employee'] },
  '/leaves': { title: 'Leaves', roles: ['hr', 'manager', 'employee'] },
  '/announcements': { title: 'Announcements', roles: ['hr', 'manager', 'employee'] },
  '/training': { title: 'Training', roles: ['hr', 'manager', 'employee'] },
  '/profile': { title: 'My profile', roles: ['hr', 'manager', 'employee'] },
  '/settings': { title: 'Settings', roles: ['hr', 'manager', 'employee'] },
  '/notifications': { title: 'Notifications', roles: ['hr', 'manager', 'employee'] },
};

export const ROLE_LABELS = {
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

export function homeForRole(role) {
  return '/dashboard';
}

export function navForRole(role) {
  return NAVIGATION[role] || NAVIGATION.employee;
}

export function flatNavForRole(role) {
  return navForRole(role).flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.label })),
  );
}
