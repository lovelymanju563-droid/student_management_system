import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import env from '../config/env.js';
import AppError from './appError.js';

/**
 * Generates a signed JWT access token.
 * @param {{ userId: string, email: string, role: string }} payload
 */
export function signAccessToken(payload) {
  if (!env.jwt.accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }
  return jwt.sign(
    { sub: payload.userId, email: payload.email, role: payload.role, type: 'access' },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

/**
 * Generates a signed JWT refresh token with a unique token ID (jti).
 * @param {{ userId: string, email: string, role: string }} payload
 */
export function signRefreshToken(payload) {
  if (!env.jwt.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      jti,
      type: 'refresh',
    },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
  return { token, jti };
}

/**
 * Verifies a JWT access token and returns its decoded payload.
 * @param {string} token
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired access token', 401);
  }
}

/**
 * Verifies a JWT refresh token and returns its decoded payload.
 * @param {string} token
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, env.jwt.refreshSecret);
    if (decoded.type !== 'refresh' || !decoded.jti) {
      throw new AppError('Invalid refresh token type', 401);
    }
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

/**
 * Computes a SHA-256 hash of a token string for secure storage.
 * @param {string} token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
