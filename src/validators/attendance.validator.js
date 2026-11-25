import { z } from 'zod';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];

export const markAttendanceSchema = z.object({
  studentId: z.string().trim().min(1, 'studentId is required'),
  courseId: z.string().trim().min(1, 'courseId is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  status: z.enum(ATTENDANCE_STATUSES),
  remarks: z.string().trim().max(300).optional().default(''),
});

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  studentId: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
});
