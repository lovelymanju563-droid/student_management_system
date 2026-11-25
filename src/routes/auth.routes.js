import { Router } from 'express';
import {
  register,
  registerAdmin,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  registerAdminSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/register-admin', validate(registerAdminSchema), registerAdmin);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', authenticate, validate(refreshSchema), logout);
router.get('/me', authenticate, getMe);
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

export default router;
