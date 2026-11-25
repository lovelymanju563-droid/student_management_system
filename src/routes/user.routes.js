import { Router } from 'express';
import {
  createUser,
  listUsers,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createUserSchema,
  updateUserRoleSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.post('/', validate(createUserSchema), createUser);
router.get('/', listUsers);
router.patch('/:id', validate(updateUserRoleSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
