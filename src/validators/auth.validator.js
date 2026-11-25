import { z } from 'zod';

export const ROLES = ['admin', 'teacher', 'student'];

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
});

export const registerAdminSchema = registerSchema.extend({
  bootstrapSecret: z.string().min(1, 'Bootstrap secret is required'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100),
});

export const createUserSchema = registerSchema.extend({
  role: z.enum(ROLES).default('student'),
  isActive: z.boolean().optional().default(true),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(2).max(80).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});
