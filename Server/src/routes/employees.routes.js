import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from '../controllers/employees.controller.js';
import { requireAuth } from '../middleware/auth.js';
import requireRole, { requireHr } from '../middleware/roles.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createEmployeeSchema,
  employeeListQuerySchema,
  updateEmployeeSchema,
} from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: employeeListQuerySchema }), asyncHandler(listEmployees));
router.post('/', requireHr, validate({ body: createEmployeeSchema }), asyncHandler(createEmployee));
router.get('/:id', asyncHandler(getEmployee));
router.put('/:id', validate({ body: updateEmployeeSchema }), asyncHandler(updateEmployee));
router.delete('/:id', requireHr, asyncHandler(deleteEmployee));

export { requireRole };
export default router;
