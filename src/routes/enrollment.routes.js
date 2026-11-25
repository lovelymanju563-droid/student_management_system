import { Router } from 'express';
import {
  enrollStudent,
  listEnrollments,
  updateGrade,
  updateEnrollmentStatus,
} from '../controllers/enrollment.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createEnrollmentSchema,
  updateGradeSchema,
  updateEnrollmentStatusSchema,
  listEnrollmentsQuerySchema,
} from '../validators/enrollment.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createEnrollmentSchema), enrollStudent);
router.get('/', validate(listEnrollmentsQuerySchema, 'query'), listEnrollments);
router.patch(
  '/:id/grade',
  authorizeRoles('admin', 'teacher'),
  validate(updateGradeSchema),
  updateGrade
);
router.patch(
  '/:id/status',
  validate(updateEnrollmentStatusSchema),
  updateEnrollmentStatus
);

export default router;
