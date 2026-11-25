import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  findById,
  findOneByField,
  findWhere,
  createDoc,
  updateDocById,
  deleteDocById,
  paginateAndSort,
} from '../repositories/base.repository.js';

export const createStudent = asyncHandler(async (req, res) => {
  const payload = req.body;

  const existingEmail = await findOneByField('students', 'email', payload.email);
  if (existingEmail) {
    throw new AppError('A student with this email already exists', 409);
  }

  const existingCode = await findOneByField(
    'students',
    'studentCode',
    payload.studentCode
  );
  if (existingCode) {
    throw new AppError('A student with this studentCode already exists', 409);
  }

  const student = await createDoc('students', {
    ...payload,
    gpa: 0,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: student,
  });
});

export const listStudents = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    status,
    department,
    semester,
    enrollmentYear,
    search,
    sortBy,
    sortOrder,
  } = req.query;

  const filters = [];
  if (status) filters.push(['status', '==', status]);
  if (department) filters.push(['department', '==', department]);
  if (semester) filters.push(['semester', '==', semester]);
  if (enrollmentYear) filters.push(['enrollmentYear', '==', enrollmentYear]);

  const students = await findWhere('students', filters);
  const result = paginateAndSort(students, {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    searchFields: ['firstName', 'lastName', 'email', 'studentCode', 'department'],
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await findById('students', req.params.id, {
    required: true,
    label: 'Student',
  });

  if (
    req.user.role === 'student' &&
    student.userId !== req.user.id &&
    student.email !== req.user.email
  ) {
    throw new AppError('You are only authorized to view your own student profile', 403);
  }

  const enrollments = await findWhere('enrollments', [
    ['studentId', '==', student.id],
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...student,
      enrollments,
    },
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const current = await findById('students', id, {
    required: true,
    label: 'Student',
  });

  if (updates.email && updates.email !== current.email) {
    const dupEmail = await findOneByField('students', 'email', updates.email);
    if (dupEmail && dupEmail.id !== id) {
      throw new AppError('Another student already uses this email', 409);
    }
  }

  if (updates.studentCode && updates.studentCode !== current.studentCode) {
    const dupCode = await findOneByField(
      'students',
      'studentCode',
      updates.studentCode
    );
    if (dupCode && dupCode.id !== id) {
      throw new AppError('Another student already uses this studentCode', 409);
    }
  }

  const updated = await updateDocById('students', id, updates, 'Student');
  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: updated,
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteDocById('students', id, 'Student');

  // Clean up related enrollments and attendance records
  const [enrollments, attendanceRecords] = await Promise.all([
    findWhere('enrollments', [['studentId', '==', id]]),
    findWhere('attendance', [['studentId', '==', id]]),
  ]);

  await Promise.all([
    ...enrollments.map((item) => deleteDocById('enrollments', item.id)),
    ...attendanceRecords.map((item) => deleteDocById('attendance', item.id)),
  ]);

  res.status(200).json({
    success: true,
    message: 'Student and associated records deleted successfully',
  });
});

export const getStudentStats = asyncHandler(async (_req, res) => {
  const students = await findWhere('students');

  const byStatus = { active: 0, inactive: 0, graduated: 0, suspended: 0 };
  const byDepartment = {};
  let gpaSum = 0;
  let gpaCount = 0;

  for (const s of students) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    if (s.department) {
      byDepartment[s.department] = (byDepartment[s.department] || 0) + 1;
    }
    if (typeof s.gpa === 'number' && s.gpa > 0) {
      gpaSum += s.gpa;
      gpaCount += 1;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      totalStudents: students.length,
      byStatus,
      byDepartment,
      averageGpa: gpaCount > 0 ? Number((gpaSum / gpaCount).toFixed(2)) : 0,
    },
  });
});
