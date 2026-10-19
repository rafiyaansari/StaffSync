import Activity from '../models/Activity.js';
import { visibleEmployeeIds } from '../utils/scope.js';
import { serializeActivity } from '../utils/serialize.js';

export async function listActivity(req, res) {
  const limit = req.query.limit || 10;
  const scope = await visibleEmployeeIds(req.user);

  const filter = scope === null ? {} : { $or: [{ employee: { $in: scope } }, { employee: null }] };

  const rows = await Activity.find(filter)
    .populate('employee', 'name firstName lastName jobTitle department avatar systemRole')
    .sort({ at: -1 })
    .limit(limit)
    .lean();

  res.json({ data: rows.map(serializeActivity) });
}
