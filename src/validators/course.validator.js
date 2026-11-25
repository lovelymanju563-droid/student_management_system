import { z } from 'zod';

export const COURSE_STATUSES = ['active', 'archived'];

export const createCourseSchema = z.object({
  courseCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .toUpperCase(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(''),
  credits: z.coerce.number().min(0.5).max(12).default(3),
  department: z.string().trim().min(2).max(80),
  instructorName: z.string().trim().min(2).max(100).optional(),
  instructorId: z.string().trim().min(1).optional(),
  maxCapacity: z.coerce.number().int().min(1).max(1000).default(60),
  semester: z.coerce.number().int().min(1).max(12).default(1),
  status: z.enum(COURSE_STATUSES).default('active'),
});

export const updateCourseSchema = createCourseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  department: z.string().trim().optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'courseCode', 'title', 'credits']).default('courseCode'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
