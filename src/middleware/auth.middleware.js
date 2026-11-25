import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { findById } from '../repositories/base.repository.js';

/**
 * Verifies the Bearer JWT access token and attaches `req.user`.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Provide a Bearer token.', 401);
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyAccessToken(token);

  const user = await findById('users', decoded.sub);
  if (!user || user.isActive === false) {
    throw new AppError('User account is inactive or no longer exists', 401);
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  next();
});

/**
 * Restricts route access to one of the allowed RBAC roles.
 * @param  {...string} allowedRoles
 */
export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          403
        )
      );
    }
    return next();
  };
}
