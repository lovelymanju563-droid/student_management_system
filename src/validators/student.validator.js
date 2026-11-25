import { z } from 'zod';

export const STUDENT_STATUSES = ['active', 'inactive', 'graduated', 'suspended'];
export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

export const createStudentSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'studentCode must be alphanumeric with - or _'),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().toLowerCase(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
    .optional(),
  gender: z.enum(GENDERS).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  address: z.string().trim().max(250).optional(),
  department: z.string().trim().min(2).max(80),
  program: z.string().trim().min(2).max(100).optional(),
  enrollmentYear: z.coerce.number().int().min(1990).max(2100),
  semester: z.coerce.number().int().min(1).max(12).default(1),
  status: z.enum(STUDENT_STATUSES).default('active'),
  guardianName: z.string().trim().max(100).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
  userId: z.string().trim().min(1).optional(),
});

export const updateStudentSchema = createStudentSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(STUDENT_STATUSES).optional(),
  department: z.string().trim().optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  enrollmentYear: z.coerce.number().int().min(1990).max(2100).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'studentCode', 'gpa', 'enrollmentYear'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
