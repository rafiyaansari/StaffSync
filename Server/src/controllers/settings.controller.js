import Employee from '../models/Employee.js';
import Settings, { SETTINGS_DEFAULTS } from '../models/Settings.js';
import { ApiError } from '../utils/ApiError.js';

const shape = (doc) => {
  const values = doc?.toObject ? doc.toObject() : doc || {};
  const out = { ...SETTINGS_DEFAULTS };
  for (const key of Object.keys(SETTINGS_DEFAULTS)) {
    if (typeof values[key] === 'boolean') out[key] = values[key];
  }
  return out;
};

async function assertCanAccess(req) {
  const { employeeId } = req.params;
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw ApiError.notFound('Employee not found.');
  if (req.user.role !== 'hr' && employeeId !== req.user.employeeId) {
    throw ApiError.forbidden('You can only manage your own preferences.');
  }
  return employee;
}

export async function getSettings(req, res) {
  await assertCanAccess(req);
  const doc = await Settings.findOne({ employee: req.params.employeeId }).lean();
  res.json({ data: shape(doc) });
}

export async function updateSettings(req, res) {
  await assertCanAccess(req);
  const doc = await Settings.findOneAndUpdate(
    { employee: req.params.employeeId },
    { $set: req.body, $setOnInsert: { employee: req.params.employeeId } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  res.json({ data: shape(doc) });
}
