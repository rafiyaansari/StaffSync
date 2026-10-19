/**
 * Mock database for the StaffSync prototype.
 * Persists to localStorage so every interaction survives a refresh.
 *
 * This file exists ONLY to make the prototype self-contained. The UI never
 * imports it directly — it talks to `services/api.js`, which can switch to
 * your Express/MongoDB backend via VITE_API_MODE=live.
 */
import { getSession, setSession } from './session';
import {
  ANNOUNCEMENTS,
  ATTENDANCE,
  DEMO_ACCOUNTS,
  EMPLOYEES_WITH_MANAGERS,
  LEAVE_REQUESTS,
  NOTIFICATIONS,
  REGISTRATION_REQUESTS,
  TODAY,
  TRAININGS,
} from '../data/seed';

export { getSession, setSession };


const DB_KEY = 'staffsync.db.v1';
const DB_VERSION = 3;

const clone = (value) => JSON.parse(JSON.stringify(value));

function seedDatabase() {
  const accounts = EMPLOYEES_WITH_MANAGERS.map((employee) => ({
    employeeId: employee.id,
    email: employee.email.toLowerCase(),
    password: 'StaffSync@123',
    status: 'active',
  }));

  return {
    version: DB_VERSION,
    createdAt: new Date().toISOString(),
    company: {
      name: 'Nimbus Labs',
      domain: 'nimbuslabs.com',
    },
    employees: clone(EMPLOYEES_WITH_MANAGERS),
    accounts,
    leaveRequests: clone(LEAVE_REQUESTS),
    attendance: clone(ATTENDANCE),
    announcements: clone(ANNOUNCEMENTS),
    trainings: clone(TRAININGS),
    notifications: clone(NOTIFICATIONS),
    registrationRequests: clone(REGISTRATION_REQUESTS),
    preferences: {},
    activity: [
      { id: 'ACT-1', employeeId: 'EMP-001', text: 'approved Dev Sharma’s casual leave', at: new Date(Date.now() - 2 * 36e5).toISOString(), type: 'leave' },
      { id: 'ACT-2', employeeId: 'EMP-022', text: 'posted “New health insurance cards”', at: new Date(Date.now() - 26 * 36e5).toISOString(), type: 'announcement' },
      { id: 'ACT-3', employeeId: 'EMP-002', text: 'completed 65% of Leading hybrid teams', at: new Date(Date.now() - 29 * 36e5).toISOString(), type: 'training' },
      { id: 'ACT-4', employeeId: 'EMP-010', text: 'joined the Engineering team', at: new Date(Date.now() - 50 * 36e5).toISOString(), type: 'people' },
    ],
  };
}

export function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seeded = seedDatabase();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.version || parsed.version !== DB_VERSION) {
      const seeded = seedDatabase();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch (error) {
    console.warn('[StaffSync] Could not read mock DB, reseeding.', error);
    const seeded = seedDatabase();
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    } catch {
      /* storage may be unavailable */
    }
    return seeded;
  }
}

export function writeDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.warn('[StaffSync] Could not persist mock DB.', error);
  }
  return db;
}

export function updateDb(mutator) {
  const db = readDb();
  const result = mutator(db);
  if (result !== false) writeDb(db);
  return db;
}

export function resetDb() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  return readDb();
}

export function getDemoPassword() {
  return DEMO_ACCOUNTS[0].password;
}

export function delay(ms = 240) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextId(prefix, items, start = 1000) {
  const numbers = items
    .map((item) => Number(String(item.id).split('-')[1]))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length ? Math.max(...numbers) + 1 : start;
  return `${prefix}-${next}`;
}

export function makeEmployeeId(db) {
  const numbers = db.employees
    .map((employee) => Number(String(employee.id).split('-')[1]))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `EMP-${String(next).padStart(3, '0')}`;
}

export function addNotification(db, notification) {
  db.notifications.unshift({
    id: nextId('NTF', db.notifications, 501),
    createdAt: new Date().toISOString(),
    readBy: [],
    ...notification,
  });
}

export function addActivity(db, entry) {
  db.activity.unshift({
    id: nextId('ACT', db.activity, 10),
    at: new Date().toISOString(),
    ...entry,
  });
  db.activity = db.activity.slice(0, 40);
}
