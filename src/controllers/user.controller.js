import bcrypt from 'bcryptjs';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  findWhere,
  findOneByField,
  createDoc,
  updateDocById,
  deleteDocById,
  paginateAndSort,
} from '../repositories/base.repository.js';
import { sanitizeUser } from './auth.controller.js';

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, isActive } = req.body;

  const existing = await findOneByField('users', 'email', email);
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createDoc('users', {
    name,
    email,
    passwordHash,
    role,
    isActive,
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: sanitizeUser(user),
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const filters = [];
  if (role) filters.push(['role', '==', role]);

  const users = await findWhere('users', filters);
  const safeUsers = users.map(sanitizeUser);

  const result = paginateAndSort(safeUsers, {
    page,
    limit,
    search,
    searchFields: ['name', 'email', 'role'],
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (id === req.user.id && updates.role && updates.role !== req.user.role) {
    throw new AppError('You cannot change your own role', 400);
  }

  const updated = await updateDocById('users', id, updates, 'User');
  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: sanitizeUser(updated),
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    throw new AppError('You cannot delete your own account', 400);
  }

  await deleteDocById('users', id, 'User');
  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});
