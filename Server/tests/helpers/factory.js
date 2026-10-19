import bcrypt from 'bcryptjs';
import request from 'supertest';
import Employee from '../../src/models/Employee.js';
import User from '../../src/models/User.js';

export const PASSWORD = 'TestPass@123';

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function makeEmployee(overrides = {}) {
  const stamp = Math.random().toString(36).slice(2, 8);
  const firstName = overrides.firstName || 'Test';
  const lastName = overrides.lastName || `User${stamp}`;
  const employee = await Employee.create({
    firstName,
    lastName,
    email: overrides.email || `test.${stamp}@nimbuslabs.test`,
    jobTitle: 'Engineer',
    department: 'Engineering',
    systemRole: overrides.systemRole || 'employee',
    joinDate: '2024-01-15',
    status: 'Active',
    ...overrides,
  });
  return employee;
}

export async function makeAccount(employee, { role = employee.systemRole, password = PASSWORD, status = 'active' } = {}) {
  const passwordHash = await bcrypt.hash(password, 4);
  return User.create({
    email: employee.email,
    passwordHash,
    role,
    status,
    employee: employee._id,
  });
}

export async function makeUser(overrides = {}) {
  const employee = await makeEmployee(overrides);
  await makeAccount(employee);
  return employee;
}

export async function login(app, email, password = PASSWORD) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  return response;
}

export async function tokenFor(app, employee) {
  const response = await login(app, employee.email);
  if (response.status !== 200) {
    throw new Error(`login failed for ${employee.email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.data.token;
}

/** HR + manager + employee + an unrelated employee (no manager). */
export async function seedTeam() {
  const hr = await makeUser({ firstName: 'Priya', lastName: 'Sharma', systemRole: 'hr', department: 'People Ops' });
  const manager = await makeUser({ firstName: 'Rohan', lastName: 'Kapoor', systemRole: 'manager' });
  const employee = await makeUser({ firstName: 'Aarav', lastName: 'Mehta', managerId: manager._id });
  const outsider = await makeUser({ firstName: 'Neha', lastName: 'Verma', managerId: manager._id });
  const unrelated = await makeUser({ firstName: 'Ira', lastName: 'Deshpande' });
  return { hr, manager, employee, outsider, unrelated };
}
