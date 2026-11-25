import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import env from '../config/env.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt.js';
import {
  findById,
  findOneByField,
  createDoc,
  updateDocById,
} from '../repositories/base.repository.js';

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash: _removed, ...safeUser } = user;
  return safeUser;
}

async function issueTokens(user) {
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const { token: refreshToken, jti } = signRefreshToken(payload);

  await createDoc(
    'refreshTokens',
    {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      revoked: false,
    },
    jti
  );

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

function safeCompareSecret(provided, expected) {
  if (!expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await findOneByField('users', 'email', email);
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createDoc('users', {
    name,
    email,
    passwordHash,
    role: 'student',
    isActive: true,
  });

  const authData = await issueTokens(user);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: authData,
  });
});

export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, bootstrapSecret } = req.body;

  if (!env.adminBootstrapSecret) {
    throw new AppError('Admin bootstrap is not enabled on this server', 403);
  }

  if (!safeCompareSecret(bootstrapSecret, env.adminBootstrapSecret)) {
    throw new AppError('Invalid admin bootstrap secret', 403);
  }

  const existing = await findOneByField('users', 'email', email);
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createDoc('users', {
    name,
    email,
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  const authData = await issueTokens(user);
  res.status(201).json({
    success: true,
    message: 'Admin user registered successfully',
    data: authData,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await findOneByField('users', 'email', email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.isActive === false) {
    throw new AppError('Account has been deactivated', 403);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const authData = await issueTokens(user);
  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: authData,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = verifyRefreshToken(refreshToken);

  const storedToken = await findById('refreshTokens', decoded.jti);
  if (
    !storedToken ||
    storedToken.revoked ||
    storedToken.tokenHash !== hashToken(refreshToken)
  ) {
    throw new AppError('Refresh token is invalid or has been revoked', 401);
  }

  const user = await findById('users', decoded.sub);
  if (!user || user.isActive === false) {
    throw new AppError('User account is inactive or no longer exists', 401);
  }

  await updateDocById('refreshTokens', decoded.jti, { revoked: true });
  const authData = await issueTokens(user);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: authData,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = verifyRefreshToken(refreshToken);

  const storedToken = await findById('refreshTokens', decoded.jti);
  if (storedToken && storedToken.userId === req.user.id) {
    await updateDocById('refreshTokens', decoded.jti, { revoked: true });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await findById('users', req.user.id, {
    required: true,
    label: 'User',
  });

  let studentProfile = null;
  if (user.role === 'student') {
    studentProfile =
      (await findOneByField('students', 'userId', user.id)) ||
      (await findOneByField('students', 'email', user.email));
  }

  res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(user),
      studentProfile,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await findById('users', req.user.id, {
    required: true,
    label: 'User',
  });

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateDocById('users', user.id, { passwordHash }, 'User');

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});
