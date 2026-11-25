import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import studentRoutes from './student.routes.js';
import courseRoutes from './course.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import attendanceRoutes from './attendance.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'student-management-backend',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/attendance', attendanceRoutes);

export default router;
