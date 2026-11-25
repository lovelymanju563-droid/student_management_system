import { z } from 'zod';
import { VALID_LETTER_GRADES } from '../utils/gpa.js';

export const ENROLLMENT_STATUSES = ['enrolled', 'completed', 'dropped'];

export const createEnrollmentSchema = z.object({
  studentId: z.string().trim().min(1, 'studentId is required'),
  courseId: z.string().trim().min(1, 'courseId is required'),
  semester: z.coerce.number().int().min(1).max(12).optional(),
});

export const updateGradeSchema = z
  .object({
    score: z.coerce.number().min(0).max(100).optional(),
    grade: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => VALID_LETTER_GRADES.includes(v), {
        message: `grade must be one of: ${VALID_LETTER_GRADES.join(', ')}`,
      })
      .optional(),
    remarks: z.string().trim().max(300).optional(),
  })
  .refine((data) => data.score !== undefined || data.grade !== undefined, {
    message: 'Provide at least score or grade',
  });

export const updateEnrollmentStatusSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES),
});

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  status: z.enum(ENROLLMENT_STATUSES).optional(),
});
