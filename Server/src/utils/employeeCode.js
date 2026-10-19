import Employee from '../models/Employee.js';

/** Next human-readable code (EMP-025, …) shown on profiles and drawers. */
export async function nextEmployeeCode() {
  const rows = await Employee.find({ employeeCode: /^EMP-\d+$/ }).select('employeeCode').lean();
  let max = 0;
  for (const row of rows) {
    const value = Number(String(row.employeeCode).split('-')[1]);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return `EMP-${String(max + 1).padStart(3, '0')}`;
}
