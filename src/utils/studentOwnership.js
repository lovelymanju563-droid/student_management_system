import AppError from '../utils/appError.js';
import { findOneByField } from '../repositories/base.repository.js';

/**
 * Resolves the student document belonging to a logged-in `student` user.
 */
export async function resolveOwnStudent(user) {
  const student =
    (await findOneByField('students', 'userId', user.id)) ||
    (await findOneByField('students', 'email', user.email));

  if (!student) {
    throw new AppError('No student profile linked to your user account', 404);
  }
  return student;
}

/**
 * Verifies that a `student` role user owns the given student record.
 */
export function assertStudentOwnership(user, student) {
  if (
    user.role === 'student' &&
    student.userId !== user.id &&
    student.email !== user.email
  ) {
    throw new AppError('You are only authorized to access your own records', 403);
  }
}
