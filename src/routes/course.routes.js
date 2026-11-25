import { Router } from 'express';
import {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from '../controllers/course.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
} from '../validators/course.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles('admin', 'teacher'),
  validate(createCourseSchema),
  createCourse
);
router.get('/', validate(listCoursesQuerySchema, 'query'), listCourses);
router.get('/:id', getCourseById);
router.patch(
  '/:id',
  authorizeRoles('admin', 'teacher'),
  validate(updateCourseSchema),
  updateCourse
);
router.delete('/:id', authorizeRoles('admin'), deleteCourse);

export default router;
