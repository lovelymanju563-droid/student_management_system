import { Router } from 'express';
import {
  createStudent,
  listStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentStats,
} from '../controllers/student.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema,
} from '../validators/student.validator.js';

const router = Router();

router.use(authenticate);

router.get('/stats/summary', authorizeRoles('admin', 'teacher'), getStudentStats);
router.post(
  '/',
  authorizeRoles('admin', 'teacher'),
  validate(createStudentSchema),
  createStudent
);
router.get(
  '/',
  authorizeRoles('admin', 'teacher'),
  validate(listStudentsQuerySchema, 'query'),
  listStudents
);
router.get('/:id', getStudentById);
router.put(
  '/:id',
  authorizeRoles('admin', 'teacher'),
  validate(updateStudentSchema),
  updateStudent
);
router.patch(
  '/:id',
  authorizeRoles('admin', 'teacher'),
  validate(updateStudentSchema),
  updateStudent
);
router.delete('/:id', authorizeRoles('admin'), deleteStudent);

export default router;
