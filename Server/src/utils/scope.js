import Employee from '../models/Employee.js';
import { ApiError } from './ApiError.js';

/** Returns the set of employee ids a user may read, or null when they can read all. */
export async function visibleEmployeeIds(user) {
  if (user.role === 'hr') return null;
  if (user.role === 'manager') {
    const reports = await Employee.find({ managerId: user.employeeId }).select('_id').lean();
    return [user.employeeId, ...reports.map((row) => row._id.toString())];
  }
  return [user.employeeId];
}

export async function assertEmployeeInScope(user, employeeId) {
  const scope = await visibleEmployeeIds(user);
  if (scope === null) return;
  if (!scope.includes(String(employeeId))) {
    throw ApiError.forbidden('You can only view your own records.');
  }
}

/** True when `managerId` is the direct manager of `employeeId`. */
export async function isDirectManagerOf(managerEmployeeId, employeeId) {
  const employee = await Employee.findById(employeeId).select('managerId').lean();
  return Boolean(employee?.managerId && employee.managerId.toString() === String(managerEmployeeId));
}
