import { Router } from 'express';
import {
  markAttendance,
  listAttendance,
  getAttendanceSummary,
} from '../controllers/attendance.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  markAttendanceSchema,
  listAttendanceQuerySchema,
} from '../validators/attendance.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles('admin', 'teacher'),
  validate(markAttendanceSchema),
  markAttendance
);
router.get('/', validate(listAttendanceQuerySchema, 'query'), listAttendance);
router.get('/summary/:studentId', getAttendanceSummary);

export default router;
