/**
 * StaffSync demo seed data.
 * Everything lives in one place so the mock API can serve it, and so it can be
 * replaced by real Express/MongoDB responses without touching the UI.
 */
import {
  addDays,
  addMonths,
  endOfMonth,
  isoDate,
  isWeekend,
  parseISO,
  startOfMonth,
  todayISO,
} from '../utils/date';

export const TODAY = todayISO();
const THIS_MONTH = startOfMonth(new Date());
const LAST_MONTH = addMonths(THIS_MONTH, -1);

export const COMPANY = {
  name: 'Nimbus Labs',
  legalName: 'Nimbus Labs Technologies Pvt. Ltd.',
  tagline: 'Product studio · Bengaluru',
  domain: 'nimbuslabs.com',
  hq: 'Bengaluru, India',
  founded: 2020,
  plan: 'Scale',
};

export const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'People Ops',
  'Finance',
];

export const LOCATIONS = ['Bengaluru, IN', 'Mumbai, IN', 'Pune, IN', 'Hyderabad, IN', 'Remote, IN'];

export const LEAVE_TYPES = {
  annual: { label: 'Annual leave', short: 'Annual', tone: 'blue' },
  sick: { label: 'Sick leave', short: 'Sick', tone: 'rose' },
  casual: { label: 'Casual leave', short: 'Casual', tone: 'amber' },
  wfh: { label: 'Work from home', short: 'WFH', tone: 'teal' },
  unpaid: { label: 'Unpaid leave', short: 'Unpaid', tone: 'slate' },
};

export const DEMO_ACCOUNTS = [
  {
    role: 'hr',
    label: 'HR',
    name: 'Priya Sharma',
    title: 'HR Manager',
    email: 'priya.sharma@nimbuslabs.com',
    password: 'StaffSync@123',
  },
  {
    role: 'manager',
    label: 'Manager',
    name: 'Rohan Kapoor',
    title: 'Engineering Manager',
    email: 'rohan.kapoor@nimbuslabs.com',
    password: 'StaffSync@123',
  },
  {
    role: 'employee',
    label: 'Employee',
    name: 'Aarav Mehta',
    title: 'Frontend Engineer',
    email: 'aarav.mehta@nimbuslabs.com',
    password: 'StaffSync@123',
  },
];

const LEAVE_DEFAULTS = {
  annual: { total: 18, used: 6 },
  sick: { total: 10, used: 2 },
  casual: { total: 6, used: 1 },
  wfh: { total: 12, used: 4 },
};

function person(partial) {
  const name = `${partial.firstName} ${partial.lastName}`;
  return {
    email: `${partial.firstName}.${partial.lastName}@nimbuslabs.com`.toLowerCase(),
    status: 'Active',
    employmentType: 'Full-time',
    workMode: 'Hybrid',
    location: 'Bengaluru, IN',
    phone: '+91 98765 43210',
    dob: '1995-06-15',
    gender: 'Prefer not to say',
    bloodGroup: 'O+',
    address: '',
    emergency: { name: '', relation: '', phone: '' },
    skills: [],
    bio: '',
    leave: { ...LEAVE_DEFAULTS },
    ...partial,
    name,
    avatar: null,
  };
}

export const EMPLOYEES = [
  person({
    id: 'EMP-001',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: 'hr',
    systemRole: 'hr',
    jobTitle: 'HR Manager',
    department: 'People Ops',
    managerId: null,
    joinDate: '2019-04-08',
    location: 'Bengaluru, IN',
    workMode: 'Hybrid',
    email: 'priya.sharma@nimbuslabs.com',
    phone: '+91 98450 11209',
    dob: '1990-02-14',
    gender: 'Female',
    bloodGroup: 'B+',
    address: 'Indiranagar, Bengaluru, Karnataka 560038',
    emergency: { name: 'Rakesh Sharma', relation: 'Spouse', phone: '+91 98450 88213' },
    skills: ['People strategy', 'HRIS', 'Compensation', 'Employee relations'],
    bio: 'Building a calm, high-trust workplace at Nimbus Labs. Ten years across product startups and consulting.',
    leave: { annual: { total: 18, used: 4 }, sick: { total: 10, used: 1 }, casual: { total: 6, used: 0 }, wfh: { total: 12, used: 3 } },
  }),
  person({
    id: 'EMP-002',
    firstName: 'Rohan',
    lastName: 'Kapoor',
    role: 'manager',
    systemRole: 'manager',
    jobTitle: 'Engineering Manager',
    department: 'Engineering',
    managerId: null,
    joinDate: '2020-07-20',
    email: 'rohan.kapoor@nimbuslabs.com',
    phone: '+91 98860 44017',
    dob: '1991-09-03',
    gender: 'Male',
    bloodGroup: 'A+',
    address: 'Koramangala, Bengaluru, Karnataka 560034',
    emergency: { name: 'Nidhi Kapoor', relation: 'Spouse', phone: '+91 98860 33571' },
    skills: ['Platform engineering', 'Team building', 'System design', 'Mentoring'],
    bio: 'Engineering manager for the platform group. Ex-Razorpay, ex-Zomato. Loves clean interfaces and faster deploys.',
    leave: { annual: { total: 18, used: 7 }, sick: { total: 10, used: 2 }, casual: { total: 6, used: 1 }, wfh: { total: 12, used: 5 } },
  }),
  person({
    id: 'EMP-003',
    firstName: 'Aarav',
    lastName: 'Mehta',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Frontend Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: '2023-06-12',
    email: 'aarav.mehta@nimbuslabs.com',
    phone: '+91 98111 27364',
    dob: '1996-11-21',
    gender: 'Male',
    bloodGroup: 'O+',
    address: 'HSR Layout, Bengaluru, Karnataka 560102',
    emergency: { name: 'Vandana Mehta', relation: 'Mother', phone: '+91 98111 88302' },
    skills: ['React', 'TypeScript', 'Design systems', 'Accessibility'],
    bio: 'Frontend engineer on the design systems squad. Currently obsessed with motion, accessibility and shortcuts that save people a click.',
    leave: { annual: { total: 18, used: 6 }, sick: { total: 10, used: 2 }, casual: { total: 6, used: 1 }, wfh: { total: 12, used: 4 } },
  }),
  person({
    id: 'EMP-004',
    firstName: 'Sneha',
    lastName: 'Iyer',
    role: 'manager',
    systemRole: 'manager',
    jobTitle: 'Design Manager',
    department: 'Design',
    managerId: null,
    joinDate: '2021-01-11',
    location: 'Mumbai, IN',
    workMode: 'Remote',
    email: 'sneha.iyer@nimbuslabs.com',
    phone: '+91 98207 66120',
    dob: '1992-04-27',
    gender: 'Female',
    bloodGroup: 'AB+',
    address: 'Bandra West, Mumbai, Maharashtra 400050',
    emergency: { name: 'Ravi Iyer', relation: 'Father', phone: '+91 98207 44198' },
    skills: ['Product design', 'Design ops', 'Brand systems', 'Research'],
    bio: 'Leads design at Nimbus Labs. Believes the best interfaces feel inevitable.',
    leave: { annual: { total: 18, used: 5 }, sick: { total: 10, used: 1 }, casual: { total: 6, used: 2 }, wfh: { total: 12, used: 7 } },
  }),
  person({
    id: 'EMP-005',
    firstName: 'Nikhil',
    lastName: 'Bansal',
    role: 'manager',
    systemRole: 'manager',
    jobTitle: 'Product Lead',
    department: 'Product',
    managerId: null,
    joinDate: '2020-11-02',
    email: 'nikhil.bansal@nimbuslabs.com',
    phone: '+91 99100 45672',
    dob: '1990-08-19',
    gender: 'Male',
    skills: ['Product strategy', 'Discovery', 'Analytics', 'Roadmapping'],
    bio: 'Product lead for Nimbus Studio and integrations.',
    emergency: { name: 'Aparna Bansal', relation: 'Spouse', phone: '+91 99100 31288' },
  }),
  person({
    id: 'EMP-006',
    firstName: 'Aditi',
    lastName: 'Nair',
    role: 'manager',
    systemRole: 'manager',
    jobTitle: 'Marketing Manager',
    department: 'Marketing',
    managerId: null,
    joinDate: '2021-08-16',
    location: 'Bengaluru, IN',
    email: 'aditi.nair@nimbuslabs.com',
    phone: '+91 99000 74312',
    dob: '1993-12-05',
    gender: 'Female',
    skills: ['Brand marketing', 'Lifecycle', 'Content strategy', 'Events'],
    bio: 'Builds the Nimbus story across product, brand and community.',
    emergency: { name: 'Suresh Nair', relation: 'Father', phone: '+91 99000 21990' },
  }),
  person({
    id: 'EMP-007',
    firstName: 'Vikram',
    lastName: 'Rao',
    role: 'manager',
    systemRole: 'manager',
    jobTitle: 'Sales Manager',
    department: 'Sales',
    managerId: null,
    joinDate: '2022-02-07',
    location: 'Hyderabad, IN',
    email: 'vikram.rao@nimbuslabs.com',
    phone: '+91 98490 33217',
    dob: '1989-05-30',
    gender: 'Male',
    skills: ['Enterprise sales', 'Revenue ops', 'Negotiation', 'Forecasting'],
    bio: 'Leads the India mid-market sales team.',
    emergency: { name: 'Lakshmi Rao', relation: 'Spouse', phone: '+91 98490 77110' },
  }),
  person({
    id: 'EMP-008',
    firstName: 'Neha',
    lastName: 'Verma',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Backend Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: '2022-03-14',
    location: 'Pune, IN',
    workMode: 'Remote',
    email: 'neha.verma@nimbuslabs.com',
    phone: '+91 97654 22108',
    dob: '1995-01-09',
    gender: 'Female',
    skills: ['Node.js', 'PostgreSQL', 'Kafka', 'API design'],
    bio: 'Backend engineer focused on the billing and notifications platform.',
  }),
  person({
    id: 'EMP-009',
    firstName: 'Kabir',
    lastName: 'Shah',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'DevOps Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: '2022-09-05',
    email: 'kabir.shah@nimbuslabs.com',
    phone: '+91 98209 11873',
    dob: '1994-07-17',
    gender: 'Male',
    skills: ['Kubernetes', 'AWS', 'Terraform', 'Observability'],
    bio: 'Keeps deploys boring and dashboards honest.',
  }),
  person({
    id: 'EMP-010',
    firstName: 'Ishaan',
    lastName: 'Rao',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Full-stack Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: addDays(TODAY, -11),
    email: 'ishaan.rao@nimbuslabs.com',
    phone: '+91 90100 56231',
    dob: '1997-03-22',
    gender: 'Male',
    skills: ['React', 'GraphQL', 'Go', 'Postgres'],
    bio: 'New to the platform squad, joining from a fintech background.',
    status: 'Probation',
  }),
  person({
    id: 'EMP-011',
    firstName: 'Tanvi',
    lastName: 'Joshi',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'QA Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: '2023-01-23',
    email: 'tanvi.joshi@nimbuslabs.com',
    phone: '+91 98330 46712',
    dob: '1996-10-11',
    gender: 'Female',
    skills: ['Test automation', 'Playwright', 'API testing', 'Release quality'],
    bio: 'Quality gatekeeper for the platform group.',
  }),
  person({
    id: 'EMP-012',
    firstName: 'Arjun',
    lastName: 'Menon',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Mobile Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: '2024-02-19',
    location: 'Bengaluru, IN',
    email: 'arjun.menon@nimbuslabs.com',
    phone: '+91 99450 38890',
    dob: '1997-12-14',
    gender: 'Male',
    skills: ['React Native', 'Swift', 'Kotlin', 'Offline sync'],
    bio: 'Mobile engineer shipping the Nimbus companion app.',
  }),
  person({
    id: 'EMP-013',
    firstName: 'Sana',
    lastName: 'Qureshi',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Data Engineer',
    department: 'Engineering',
    managerId: 'EMP-002',
    joinDate: '2023-11-06',
    location: 'Bengaluru, IN',
    email: 'sana.qureshi@nimbuslabs.com',
    phone: '+91 99802 14576',
    dob: '1995-06-28',
    gender: 'Female',
    skills: ['Python', 'Airflow', 'dbt', 'Snowflake'],
    bio: 'Builds the pipelines behind every Nimbus dashboard.',
  }),
  person({
    id: 'EMP-014',
    firstName: 'Diya',
    lastName: 'Malhotra',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Product Designer',
    department: 'Design',
    managerId: 'EMP-004',
    joinDate: '2022-05-30',
    location: 'Mumbai, IN',
    workMode: 'Remote',
    email: 'diya.malhotra@nimbuslabs.com',
    phone: '+91 98200 67341',
    dob: '1996-02-08',
    gender: 'Female',
    skills: ['Interaction design', 'Figma', 'Prototyping', 'Visual design'],
    bio: 'Designs the surfaces people see every day in Nimbus Studio.',
  }),
  person({
    id: 'EMP-015',
    firstName: 'Rhea',
    lastName: 'Sen',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'UX Researcher',
    department: 'Design',
    managerId: 'EMP-004',
    joinDate: '2024-07-08',
    employmentType: 'Contract',
    location: 'Kolkata, IN',
    workMode: 'Remote',
    email: 'rhea.sen@nimbuslabs.com',
    phone: '+91 98301 90042',
    dob: '1994-09-16',
    gender: 'Female',
    skills: ['Qualitative research', 'Usability testing', 'Journey mapping', 'Surveys'],
    bio: 'Turns customer conversations into product direction.',
  }),
  person({
    id: 'EMP-016',
    firstName: 'Meera',
    lastName: 'Pillai',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Product Manager',
    department: 'Product',
    managerId: 'EMP-005',
    joinDate: '2022-08-22',
    location: 'Bengaluru, IN',
    email: 'meera.pillai@nimbuslabs.com',
    phone: '+91 98455 20117',
    dob: '1993-03-25',
    gender: 'Female',
    skills: ['Product discovery', 'Experimentation', 'SQL', 'Go-to-market'],
    bio: 'Owns the workflows product area and the integrations roadmap.',
  }),
  person({
    id: 'EMP-017',
    firstName: 'Dev',
    lastName: 'Sharma',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Associate Product Manager',
    department: 'Product',
    managerId: 'EMP-005',
    joinDate: '2024-10-14',
    email: 'dev.sharma@nimbuslabs.com',
    phone: '+91 98999 34512',
    dob: '1998-01-30',
    gender: 'Male',
    skills: ['Product analytics', 'User stories', 'Figma', 'SQL'],
    bio: 'Associate PM on the reporting squad.',
  }),
  person({
    id: 'EMP-018',
    firstName: 'Karan',
    lastName: 'Chawla',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Content Strategist',
    department: 'Marketing',
    managerId: 'EMP-006',
    joinDate: '2023-03-20',
    location: 'Delhi, IN',
    workMode: 'Remote',
    email: 'karan.chawla@nimbuslabs.com',
    phone: '+91 98108 55320',
    dob: '1994-11-02',
    gender: 'Male',
    skills: ['Editorial', 'SEO', 'Positioning', 'Storytelling'],
    bio: 'Writes about work, tools and the people behind them.',
  }),
  person({
    id: 'EMP-019',
    firstName: 'Pooja',
    lastName: 'Reddy',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Growth Marketer',
    department: 'Marketing',
    managerId: 'EMP-006',
    joinDate: '2024-04-01',
    location: 'Bengaluru, IN',
    email: 'pooja.reddy@nimbuslabs.com',
    phone: '+91 99163 77829',
    dob: '1996-06-06',
    gender: 'Female',
    skills: ['Lifecycle marketing', 'Paid growth', 'Analytics', 'CRO'],
    bio: 'Runs growth experiments across acquisition and activation.',
  }),
  person({
    id: 'EMP-020',
    firstName: 'Farhan',
    lastName: 'Ali',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Account Executive',
    department: 'Sales',
    managerId: 'EMP-007',
    joinDate: '2023-08-14',
    location: 'Hyderabad, IN',
    email: 'farhan.ali@nimbuslabs.com',
    phone: '+91 90007 81234',
    dob: '1995-04-18',
    gender: 'Male',
    skills: ['Mid-market sales', 'Demos', 'Pipeline management', 'CRM'],
    bio: 'Helps mid-market teams get value from Nimbus Studio.',
  }),
  person({
    id: 'EMP-021',
    firstName: 'Ritika',
    lastName: 'Singh',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Sales Development Rep',
    department: 'Sales',
    managerId: 'EMP-007',
    joinDate: '2025-01-13',
    location: 'Hyderabad, IN',
    email: 'ritika.singh@nimbuslabs.com',
    phone: '+91 98181 44026',
    dob: '1999-08-24',
    gender: 'Female',
    skills: ['Prospecting', 'Outbound', 'Research', 'Salesforce'],
    bio: 'Outbound specialist for the India market.',
  }),
  person({
    id: 'EMP-022',
    firstName: 'Ananya',
    lastName: 'Bose',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'HR Executive',
    department: 'People Ops',
    managerId: 'EMP-001',
    joinDate: '2023-05-15',
    location: 'Bengaluru, IN',
    email: 'ananya.bose@nimbuslabs.com',
    phone: '+91 98310 66725',
    dob: '1997-07-07',
    gender: 'Female',
    skills: ['Onboarding', 'HR operations', 'Payroll inputs', 'Employee engagement'],
    bio: 'Runs onboarding and employee experience at Nimbus Labs.',
  }),
  person({
    id: 'EMP-023',
    firstName: 'Sanjay',
    lastName: 'Kulkarni',
    role: 'manager',
    systemRole: 'manager',
    jobTitle: 'Finance Lead',
    department: 'Finance',
    managerId: null,
    joinDate: '2021-06-01',
    location: 'Pune, IN',
    email: 'sanjay.kulkarni@nimbuslabs.com',
    phone: '+91 98220 11476',
    dob: '1988-02-11',
    gender: 'Male',
    skills: ['FP&A', 'Compliance', 'Payroll', 'Vendor management'],
    bio: 'Finance lead for Nimbus Labs.',
  }),
  person({
    id: 'EMP-024',
    firstName: 'Ira',
    lastName: 'Deshpande',
    role: 'employee',
    systemRole: 'employee',
    jobTitle: 'Payroll Specialist',
    department: 'Finance',
    managerId: 'EMP-023',
    joinDate: addDays(TODAY, -5),
    location: 'Pune, IN',
    email: 'ira.deshpande@nimbuslabs.com',
    phone: '+91 97630 28814',
    dob: '1998-10-19',
    gender: 'Female',
    skills: ['Payroll', 'Reimbursements', 'Statutory compliance'],
    bio: 'Payroll specialist, joining the finance team.',
    status: 'Probation',
  }),
];

const byId = Object.fromEntries(EMPLOYEES.map((e) => [e.id, e]));

function withManager() {
  return EMPLOYEES.map((employee) => ({
    ...employee,
    managerName: employee.managerId ? byId[employee.managerId]?.name : '—',
  }));
}

export const EMPLOYEES_WITH_MANAGERS = withManager();

export const LEAVE_REQUESTS = [
  {
    id: 'LV-2041',
    employeeId: 'EMP-003',
    type: 'annual',
    from: addDays(TODAY, 12),
    to: addDays(TODAY, 14),
    reason: 'Family function in Jaipur — travelling Thursday night and returning Sunday.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -2),
    handover: 'Neha Verma will cover the design-system release and open PR reviews.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2040',
    employeeId: 'EMP-008',
    type: 'wfh',
    from: addDays(TODAY, 3),
    to: addDays(TODAY, 3),
    reason: 'Fibre installation at home between 10am and 2pm.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -1),
    handover: 'Available on Slack, no meetings before noon.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2039',
    employeeId: 'EMP-009',
    type: 'casual',
    from: addDays(TODAY, 5),
    to: addDays(TODAY, 5),
    reason: 'Moving apartments, need the day for handover and packing.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -1),
    handover: 'On-call covered by the platform rotation.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2038',
    employeeId: 'EMP-010',
    type: 'annual',
    from: addDays(TODAY, 20),
    to: addDays(TODAY, 22),
    reason: 'Pre-booked trip to Kerala with family.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -4),
    handover: 'Sprint work handed over to Kabir before travel.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2037',
    employeeId: 'EMP-011',
    type: 'sick',
    from: addDays(TODAY, 1),
    to: addDays(TODAY, 1),
    reason: 'Migraine follow-up appointment with the neurologist.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -2),
    handover: 'Regression suite already automated, QA buddy will monitor the run.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2036',
    employeeId: 'EMP-014',
    type: 'annual',
    from: addDays(TODAY, 26),
    to: addDays(TODAY, 30),
    reason: 'Cousin’s wedding in Udaipur — five days including travel.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -3),
    handover: 'Sneha will review the design QA checklist.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2035',
    employeeId: 'EMP-020',
    type: 'casual',
    from: addDays(TODAY, 2),
    to: addDays(TODAY, 3),
    reason: 'Parents visiting from Lucknow, taking two days off to spend time.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -5),
    handover: 'Ritika covering inbound leads for the two days.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2034',
    employeeId: 'EMP-016',
    type: 'wfh',
    from: addDays(TODAY, 1),
    to: addDays(TODAY, 1),
    reason: 'Deep-work day to finalise the Q4 product narrative.',
    status: 'Pending',
    appliedOn: addDays(TODAY, -1),
    handover: 'No external meetings scheduled.',
    reviewedBy: null,
    reviewedOn: null,
    note: '',
  },
  {
    id: 'LV-2033',
    employeeId: 'EMP-017',
    type: 'casual',
    from: TODAY,
    to: TODAY,
    reason: 'Personal errand at the bank.',
    status: 'Approved',
    appliedOn: addDays(TODAY, -3),
    handover: 'Analytics dashboard handoff done yesterday.',
    reviewedBy: 'Nikhil Bansal',
    reviewedOn: addDays(TODAY, -2),
    note: 'Approved — enjoy the day.',
  },
  {
    id: 'LV-2032',
    employeeId: 'EMP-021',
    type: 'sick',
    from: addDays(TODAY, -1),
    to: TODAY,
    reason: 'Flu with a mild fever, doctor advised two days of rest.',
    status: 'Approved',
    appliedOn: addDays(TODAY, -2),
    handover: 'Sequences paused, no demos booked.',
    reviewedBy: 'Vikram Rao',
    reviewedOn: addDays(TODAY, -2),
    note: 'Take care, get well soon.',
  },
  {
    id: 'LV-2031',
    employeeId: 'EMP-003',
    type: 'annual',
    from: addDays(TODAY, -40),
    to: addDays(TODAY, -39),
    reason: 'Short break after the design-system launch.',
    status: 'Approved',
    appliedOn: addDays(TODAY, -46),
    handover: 'Release notes completed before leaving.',
    reviewedBy: 'Rohan Kapoor',
    reviewedOn: addDays(TODAY, -44),
    note: 'Well deserved.',
  },
  {
    id: 'LV-2030',
    employeeId: 'EMP-003',
    type: 'sick',
    from: addDays(TODAY, -95),
    to: addDays(TODAY, -95),
    reason: 'Fever, took a day to recover.',
    status: 'Approved',
    appliedOn: addDays(TODAY, -96),
    handover: 'Notified the squad in the morning standup.',
    reviewedBy: 'Rohan Kapoor',
    reviewedOn: addDays(TODAY, -95),
    note: '',
  },
  {
    id: 'LV-2029',
    employeeId: 'EMP-013',
    type: 'wfh',
    from: addDays(TODAY, -3),
    to: addDays(TODAY, -3),
    reason: 'Home maintenance work scheduled.',
    status: 'Approved',
    appliedOn: addDays(TODAY, -5),
    handover: 'Pipelines monitored remotely.',
    reviewedBy: 'Rohan Kapoor',
    reviewedOn: addDays(TODAY, -4),
    note: '',
  },
  {
    id: 'LV-2028',
    employeeId: 'EMP-019',
    type: 'annual',
    from: addDays(TODAY, -20),
    to: addDays(TODAY, -18),
    reason: 'Attending a friend’s wedding in Goa.',
    status: 'Approved',
    appliedOn: addDays(TODAY, -30),
    handover: 'Campaign handover to Karan.',
    reviewedBy: 'Aditi Nair',
    reviewedOn: addDays(TODAY, -28),
    note: '',
  },
  {
    id: 'LV-2027',
    employeeId: 'EMP-003',
    type: 'annual',
    from: addDays(TODAY, -25),
    to: addDays(TODAY, -24),
    reason: 'Extended weekend trip.',
    status: 'Rejected',
    appliedOn: addDays(TODAY, -32),
    handover: 'Squad would cover release review.',
    reviewedBy: 'Rohan Kapoor',
    reviewedOn: addDays(TODAY, -30),
    note: 'Clashes with the release week — can we move this to the following week?',
  },
  {
    id: 'LV-2026',
    employeeId: 'EMP-018',
    type: 'unpaid',
    from: addDays(TODAY, -12),
    to: addDays(TODAY, -8),
    reason: 'Freelance writing workshop in Goa.',
    status: 'Rejected',
    appliedOn: addDays(TODAY, -20),
    handover: 'Content calendar scheduled in advance.',
    reviewedBy: 'Priya Sharma',
    reviewedOn: addDays(TODAY, -19),
    note: 'Unpaid leave for external work isn’t covered under policy. Happy to discuss options.',
  },
];

/* ------------------------------------------------------------------ */
/* Attendance — deterministic, derived from approved leaves           */
/* ------------------------------------------------------------------ */

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function timeFromMinutes(total) {
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

const leaveLookup = (() => {
  const map = {};
  LEAVE_REQUESTS.filter((l) => l.status === 'Approved').forEach((leave) => {
    let cursor = parseISO(leave.from);
    const end = parseISO(leave.to);
    let guard = 0;
    while (cursor <= end && guard < 60) {
      const iso = isoDate(cursor);
      map[`${leave.employeeId}:${iso}`] = leave.type;
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  });
  return map;
})();

function buildRecord(employee, dateISO, isTodayRecord = false) {
  const rand = mulberry32(hashString(`${employee.id}-${dateISO}`));
  const leaveType = leaveLookup[`${employee.id}:${dateISO}`];
  const id = `ATT-${employee.id}-${dateISO}`;
  if (leaveType) {
    return {
      id,
      employeeId: employee.id,
      date: dateISO,
      status: 'On leave',
      leaveType,
      checkIn: null,
      checkOut: null,
      hours: 0,
      note: 'Approved leave',
    };
  }

  const roll = rand();
  let status = 'Present';
  if (roll > 0.955) status = 'Absent';
  else if (roll > 0.895) status = 'WFH';

  if (status === 'Absent') {
    return { id, employeeId: employee.id, date: dateISO, status, leaveType: null, checkIn: null, checkOut: null, hours: 0, note: 'No check-in recorded' };
  }

  const minuteOffset = Math.floor(rand() * 92); // 08:38 – 10:10
  const startMinutes = 8 * 60 + 38 + minuteOffset;
  const late = status === 'Present' && startMinutes > 9 * 60 + 45;
  if (late) status = 'Late';
  const endMinutes = 18 * 60 + Math.floor(rand() * 95);
  const worked = Math.max(4, (endMinutes - startMinutes) / 60 - 1);

  const hasCheckedOut = !isTodayRecord || new Date().getHours() >= 18;

  return {
    id,
    employeeId: employee.id,
    date: dateISO,
    status,
    leaveType: null,
    checkIn: timeFromMinutes(startMinutes),
    checkOut: hasCheckedOut ? timeFromMinutes(endMinutes) : null,
    hours: hasCheckedOut ? Number(worked.toFixed(1)) : 0,
    note: late ? 'Late check-in' : status === 'WFH' ? 'Working remotely' : '',
  };
}

function recordsForRange(startDate, endDate) {
  const records = [];
  const today = TODAY;
  EMPLOYEES.filter((e) => e.status !== 'Inactive').forEach((employee) => {
    let cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
      const iso = isoDate(cursor);
      if (!isWeekend(cursor) && iso <= today && iso >= employee.joinDate) {
        records.push(buildRecord(employee, iso, iso === today));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  // Keep the demo predictable: these three are always in today with sensible times.
  const forceToday = {
    'EMP-002': { status: 'Present', checkIn: '09:05', note: '' },
    'EMP-003': { status: 'Present', checkIn: '09:12', note: '' },
    'EMP-008': { status: 'WFH', checkIn: '09:26', note: 'Working remotely' },
  };
  Object.entries(forceToday).forEach(([employeeId, value]) => {
    const record = records.find((r) => r.employeeId === employeeId && r.date === today);
    if (record) Object.assign(record, value);
  });

  return records;
}

export const ATTENDANCE = [
  ...recordsForRange(LAST_MONTH, endOfMonth(LAST_MONTH)),
  ...recordsForRange(THIS_MONTH, new Date(TODAY)),
];

/* ------------------------------------------------------------------ */
/* Announcements                                                      */
/* ------------------------------------------------------------------ */

export const ANNOUNCEMENTS = [
  {
    id: 'ANN-1108',
    title: 'Q3 town hall — Thursday, 4:30 PM',
    category: 'Event',
    body:
      'Our quarterly town hall is this Thursday at 4:30 PM in the Bengaluru atrium, streamed live for remote teammates.\n\nWe’ll walk through Q3 results, share what we learned from the Nimbus Studio beta, and open the floor for questions. Send anything you’d like covered to people@nimbuslabs.com by Wednesday noon.\n\nSnacks and filter coffee after the session. Recording and notes will be shared on Friday.',
    authorId: 'EMP-001',
    authorName: 'Priya Sharma',
    authorRole: 'HR Manager',
    date: addDays(TODAY, -2),
    pinned: true,
    audience: 'Everyone',
    readBy: ['EMP-001'],
    tone: 'blue',
  },
  {
    id: 'ANN-1107',
    title: 'Updated hybrid work policy',
    category: 'Policy',
    body:
      'Starting next month, everyone on a hybrid schedule will have three anchor days in office — Tuesday, Wednesday and Thursday. Mondays and Fridays stay flexible.\n\nThe change came out of the workplace survey and the leadership offsite. Teams that need a different rhythm can request a variance through their manager; we’ll review those weekly.\n\nYou can read the full policy in the People handbook. Questions are welcome in the #people-ops channel or directly with anyone on the People team.',
    authorId: 'EMP-001',
    authorName: 'Priya Sharma',
    authorRole: 'HR Manager',
    date: addDays(TODAY, -5),
    pinned: false,
    audience: 'Everyone',
    readBy: ['EMP-001', 'EMP-002', 'EMP-003'],
    tone: 'navy',
  },
  {
    id: 'ANN-1106',
    title: 'Wellness week is here — 20 to 24 October',
    category: 'Event',
    body:
      'Five days, five small ways to reset. We’re running desk yoga, a sleep workshop, a no-meeting afternoon, eye check-ups and a guided walk through Cubbon Park.\n\nSign-ups are open on the events board — each session has limited seats. Remote teammates get access to the recorded workshops and a ₹1,500 wellness reimbursement for the week.\n\nTake the time. The work will be there on Monday, and so will you.',
    authorId: 'EMP-006',
    authorName: 'Aditi Nair',
    authorRole: 'Marketing Manager',
    date: addDays(TODAY, -1),
    pinned: true,
    audience: 'Everyone',
    readBy: ['EMP-006'],
    tone: 'teal',
  },
  {
    id: 'ANN-1105',
    title: 'New health insurance cards are on the way',
    category: 'HR',
    body:
      'Our insurance partner has reissued cards with the updated family floater limit of ₹10 lakh. Physical cards should reach your registered address within 10 days.\n\nDigital cards are already available in the benefits portal. If your dependents or address changed in the last year, please update them before the 25th so the next payroll run picks it up.',
    authorId: 'EMP-022',
    authorName: 'Ananya Bose',
    authorRole: 'HR Executive',
    date: addDays(TODAY, -9),
    pinned: false,
    audience: 'Everyone',
    readBy: ['EMP-001', 'EMP-022', 'EMP-003'],
    tone: 'violet',
  },
  {
    id: 'ANN-1104',
    title: 'Nimbus turns six 🎉',
    category: 'Celebration',
    body:
      'Six years ago we started with three people, one whiteboard and a very optimistic roadmap. Today we are 24 people shipping products used by teams in 14 countries.\n\nJoin us on the terrace at 6 PM for cake and a short photo walk down memory lane. Bring your favourite Nimbus moment — we’re collecting them for a wall in the lobby.',
    authorId: 'EMP-022',
    authorName: 'Ananya Bose',
    authorRole: 'HR Executive',
    date: addDays(TODAY, -16),
    pinned: false,
    audience: 'Everyone',
    readBy: ['EMP-022', 'EMP-003', 'EMP-002', 'EMP-001'],
    tone: 'amber',
  },
];

/* ------------------------------------------------------------------ */
/* Training                                                           */
/* ------------------------------------------------------------------ */

export const TRAININGS = [
  {
    id: 'TRN-01',
    title: 'Leading hybrid teams',
    category: 'Leadership',
    description:
      'A practical programme for people managers on running distributed rituals, giving feedback across time zones, and keeping trust high when the hallway is a Slack channel.',
    format: 'Live cohort',
    level: 'Intermediate',
    durationMins: 360,
    modules: 4,
    instructor: 'Maya Krishnan',
    instructorTitle: 'Organisation coach',
    dueDate: addDays(TODAY, 32),
    mandatory: false,
    tone: 'blue',
    enrolled: [
      { employeeId: 'EMP-002', progress: 65, status: 'In progress', assignedOn: addDays(TODAY, -14), completedOn: null },
      { employeeId: 'EMP-004', progress: 100, status: 'Completed', assignedOn: addDays(TODAY, -30), completedOn: addDays(TODAY, -6) },
      { employeeId: 'EMP-006', progress: 25, status: 'In progress', assignedOn: addDays(TODAY, -10), completedOn: null },
      { employeeId: 'EMP-007', progress: 0, status: 'Not started', assignedOn: addDays(TODAY, -8), completedOn: null },
    ],
  },
  {
    id: 'TRN-02',
    title: 'Workplace POSH awareness',
    category: 'Compliance',
    description:
      'Annual mandatory training covering the POSH Act, reporting channels, and the role each of us plays in keeping the workplace safe and respectful.',
    format: 'Self-paced',
    level: 'All levels',
    durationMins: 45,
    modules: 3,
    instructor: 'Internal · People Ops',
    instructorTitle: 'Compliance',
    dueDate: addDays(TODAY, 12),
    mandatory: true,
    tone: 'violet',
    enrolled: EMPLOYEES.map((e, index) => ({
      employeeId: e.id,
      progress: index % 4 === 0 ? 100 : index % 3 === 0 ? 60 : index % 5 === 0 ? 20 : 0,
      status: index % 4 === 0 ? 'Completed' : index % 3 === 0 ? 'In progress' : 'Not started',
      assignedOn: addDays(TODAY, -21),
      completedOn: index % 4 === 0 ? addDays(TODAY, -4) : null,
    })),
  },
  {
    id: 'TRN-03',
    title: 'Advanced React patterns',
    category: 'Engineering',
    description:
      'Composition, render props, Suspense and the patterns behind the Nimbus design system. Includes three hands-on code labs and a capstone review.',
    format: 'Self-paced',
    level: 'Advanced',
    durationMins: 160,
    modules: 6,
    instructor: 'Samir Desai',
    instructorTitle: 'Staff engineer',
    dueDate: addDays(TODAY, 24),
    mandatory: false,
    tone: 'teal',
    enrolled: [
      { employeeId: 'EMP-003', progress: 45, status: 'In progress', assignedOn: addDays(TODAY, -12), completedOn: null },
      { employeeId: 'EMP-010', progress: 15, status: 'In progress', assignedOn: addDays(TODAY, -5), completedOn: null },
      { employeeId: 'EMP-012', progress: 90, status: 'In progress', assignedOn: addDays(TODAY, -20), completedOn: null },
      { employeeId: 'EMP-008', progress: 100, status: 'Completed', assignedOn: addDays(TODAY, -40), completedOn: addDays(TODAY, -9) },
    ],
  },
  {
    id: 'TRN-04',
    title: 'Data storytelling with BI',
    category: 'Analytics',
    description:
      'Turn dashboards into decisions. Covers narrative structure, chart selection, annotation and reviewing a metric with a skeptical stakeholder.',
    format: 'Workshop',
    level: 'Beginner',
    durationMins: 120,
    modules: 3,
    instructor: 'Ira Kapoor',
    instructorTitle: 'Analytics lead',
    dueDate: addDays(TODAY, 40),
    mandatory: false,
    tone: 'amber',
    enrolled: [
      { employeeId: 'EMP-013', progress: 40, status: 'In progress', assignedOn: addDays(TODAY, -6), completedOn: null },
      { employeeId: 'EMP-016', progress: 0, status: 'Not started', assignedOn: addDays(TODAY, -3), completedOn: null },
    ],
  },
  {
    id: 'TRN-05',
    title: 'Effective 1:1 conversations',
    category: 'People skills',
    description:
      'A 90-minute clinic on structuring check-ins, coaching through problems, and handling the conversations we tend to avoid.',
    format: 'Live cohort',
    level: 'All levels',
    durationMins: 90,
    modules: 2,
    instructor: 'Dr. Neelam Joshi',
    instructorTitle: 'People scientist',
    dueDate: addDays(TODAY, 18),
    mandatory: false,
    tone: 'rose',
    enrolled: [
      { employeeId: 'EMP-002', progress: 50, status: 'In progress', assignedOn: addDays(TODAY, -4), completedOn: null },
      { employeeId: 'EMP-001', progress: 100, status: 'Completed', assignedOn: addDays(TODAY, -16), completedOn: addDays(TODAY, -2) },
      { employeeId: 'EMP-005', progress: 0, status: 'Not started', assignedOn: addDays(TODAY, -2), completedOn: null },
    ],
  },
  {
    id: 'TRN-06',
    title: 'Information security essentials',
    category: 'Compliance',
    description:
      'Passwords, phishing, device hygiene and data handling. A short annual refresher that keeps our customers’ data safe.',
    format: 'Self-paced',
    level: 'All levels',
    durationMins: 35,
    modules: 2,
    instructor: 'Internal · Security',
    instructorTitle: 'Security',
    dueDate: addDays(TODAY, 55),
    mandatory: true,
    tone: 'navy',
    enrolled: EMPLOYEES.slice(0, 16).map((e, index) => ({
      employeeId: e.id,
      progress: index % 3 === 0 ? 100 : index % 4 === 0 ? 50 : 0,
      status: index % 3 === 0 ? 'Completed' : index % 4 === 0 ? 'In progress' : 'Not started',
      assignedOn: addDays(TODAY, -18),
      completedOn: index % 3 === 0 ? addDays(TODAY, -7) : null,
    })),
  },
];

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

export const NOTIFICATIONS = [
  {
    id: 'NTF-501',
    type: 'leave',
    title: 'Aarav Mehta requested annual leave',
    body: '3 days · starts in 12 days. Needs your review.',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    audienceRoles: ['manager', 'hr'],
    href: '/leaves',
    readBy: [],
  },
  {
    id: 'NTF-502',
    type: 'announcement',
    title: 'New announcement · Wellness week',
    body: 'Five days, five small ways to reset. Sign-ups are open.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    audienceRoles: ['employee', 'manager', 'hr'],
    href: '/announcements',
    readBy: [],
  },
  {
    id: 'NTF-503',
    type: 'training',
    title: 'POSH refresher due in 12 days',
    body: 'This one is mandatory for everyone. 45 minutes, self-paced.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    audienceRoles: ['employee', 'manager', 'hr'],
    href: '/training',
    readBy: [],
  },
  {
    id: 'NTF-504',
    type: 'leave',
    title: 'Your leave was approved',
    body: 'Rohan approved your annual leave for 2 days last month.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString(),
    audienceRoles: ['employee'],
    employeeId: 'EMP-003',
    href: '/leaves',
    readBy: [],
  },
  {
    id: 'NTF-505',
    type: 'system',
    title: '2 new registrations waiting',
    body: 'New employees need your approval to activate accounts.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    audienceRoles: ['hr'],
    href: '/employees/requests',
    readBy: [],
  },
  {
    id: 'NTF-506',
    type: 'training',
    title: 'Certification completed',
    body: 'Ira Deshpande completed Information security essentials.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    audienceRoles: ['hr', 'manager'],
    href: '/training',
    readBy: [],
  },
];

/* ------------------------------------------------------------------ */
/* Registration requests (created from the public registration flow)  */
/* ------------------------------------------------------------------ */

export const REGISTRATION_REQUESTS = [
  {
    id: 'REG-3002',
    firstName: 'Ishita',
    lastName: 'Khanna',
    email: 'ishita.khanna@gmail.com',
    phone: '+91 98201 55387',
    department: 'Design',
    jobTitle: 'Product Designer',
    employmentType: 'Full-time',
    location: 'Mumbai, IN',
    systemRole: 'employee',
    appliedOn: addDays(TODAY, -1),
    status: 'Pending',
    note: 'Referred by Diya Malhotra.',
  },
  {
    id: 'REG-3001',
    firstName: 'Manav',
    lastName: 'Gupta',
    email: 'manav.gupta@gmail.com',
    phone: '+91 99715 20443',
    department: 'Engineering',
    jobTitle: 'Backend Engineer',
    employmentType: 'Full-time',
    location: 'Pune, IN',
    systemRole: 'employee',
    appliedOn: addDays(TODAY, -4),
    status: 'Pending',
    note: 'Applied via careers page.',
  },
];

/* ------------------------------------------------------------------ */
/* Attendance policies / misc                                         */
/* ------------------------------------------------------------------ */

export const WEEKLY_TREND = [
  { day: 'Mon', value: 92 },
  { day: 'Tue', value: 95 },
  { day: 'Wed', value: 89 },
  { day: 'Thu', value: 96 },
  { day: 'Fri', value: 91 },
];

export const UPCOMING_EVENTS = [
  { id: 'EVT-1', title: 'Q3 town hall', date: addDays(TODAY, 3), time: '4:30 PM', tone: 'blue' },
  { id: 'EVT-2', title: 'Wellness week', date: addDays(TODAY, 1), time: 'All week', tone: 'teal' },
  { id: 'EVT-3', title: 'Design critique', date: addDays(TODAY, 2), time: '11:00 AM', tone: 'violet' },
];
