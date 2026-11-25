import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { resolveGrade, calculateGpa } from '../utils/gpa.js';
import { assertStudentOwnership, resolveOwnStudent } from '../utils/studentOwnership.js';
import {
  findById,
  findWhere,
  createDoc,
  updateDocById,
  paginateAndSort,
} from '../repositories/base.repository.js';

export const enrollStudent = asyncHandler(async (req, res) => {
  const { studentId, courseId, semester } = req.body;

  const [student, course] = await Promise.all([
    findById('students', studentId, { required: true, label: 'Student' }),
    findById('courses', courseId, { required: true, label: 'Course' }),
  ]);

  assertStudentOwnership(req.user, student);

  if (course.status !== 'active') {
    throw new AppError('Cannot enroll in an archived course', 400);
  }

  const existingForStudent = await findWhere('enrollments', [
    ['studentId', '==', studentId],
    ['courseId', '==', courseId],
  ]);

  const activeOrCompleted = existingForStudent.find(
    (e) => e.status === 'enrolled' || e.status === 'completed'
  );
  if (activeOrCompleted) {
    throw new AppError(
      `Student already has an ${activeOrCompleted.status} record for this course`,
      409
    );
  }

  const courseEnrollments = await findWhere('enrollments', [
    ['courseId', '==', courseId],
    ['status', '==', 'enrolled'],
  ]);
  if (courseEnrollments.length >= course.maxCapacity) {
    throw new AppError('Course has reached maximum capacity', 409);
  }

  const enrollment = await createDoc('enrollments', {
    studentId: student.id,
    courseId: course.id,
    studentCode: student.studentCode,
    studentName: `${student.firstName} ${student.lastName}`,
    courseCode: course.courseCode,
    courseTitle: course.title,
    credits: course.credits,
    semester: semester ?? course.semester ?? student.semester,
    status: 'enrolled',
    score: null,
    grade: null,
    gradePoints: null,
    remarks: '',
    enrolledBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully',
    data: enrollment,
  });
});

export const listEnrollments = asyncHandler(async (req, res) => {
  const { page, limit, studentId, courseId, status } = req.query;

  let effectiveStudentId = studentId;
  if (req.user.role === 'student') {
    const ownStudent = await resolveOwnStudent(req.user);
    effectiveStudentId = ownStudent.id;
  }

  const filters = [];
  if (effectiveStudentId) filters.push(['studentId', '==', effectiveStudentId]);
  if (courseId) filters.push(['courseId', '==', courseId]);
  if (status) filters.push(['status', '==', status]);

  const enrollments = await findWhere('enrollments', filters);
  const result = paginateAndSort(enrollments, {
    page,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const updateGrade = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { score, grade, remarks } = req.body;

  const enrollment = await findById('enrollments', id, {
    required: true,
    label: 'Enrollment',
  });

  if (enrollment.status === 'dropped') {
    throw new AppError('Cannot assign a grade to a dropped enrollment', 400);
  }

  const resolved = resolveGrade({ score, grade });
  const updated = await updateDocById(
    'enrollments',
    id,
    {
      score: resolved.score,
      grade: resolved.grade,
      gradePoints: resolved.gradePoints,
      status: 'completed',
      remarks: remarks ?? enrollment.remarks ?? '',
      gradedBy: req.user.id,
      gradedAt: new Date().toISOString(),
    },
    'Enrollment'
  );

  // Recalculate student GPA from all graded enrollments
  const studentEnrollments = await findWhere('enrollments', [
    ['studentId', '==', enrollment.studentId],
  ]);
  const gpa = calculateGpa(studentEnrollments);
  await updateDocById('students', enrollment.studentId, { gpa }, 'Student');

  res.status(200).json({
    success: true,
    message: 'Grade recorded and student GPA updated',
    data: {
      enrollment: updated,
      updatedStudentGpa: gpa,
    },
  });
});

export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const enrollment = await findById('enrollments', id, {
    required: true,
    label: 'Enrollment',
  });

  if (req.user.role === 'student') {
    const ownStudent = await resolveOwnStudent(req.user);
    if (enrollment.studentId !== ownStudent.id) {
      throw new AppError('You can only update your own enrollments', 403);
    }
    if (status !== 'dropped') {
      throw new AppError('Students can only drop an enrollment', 403);
    }
  }

  const updated = await updateDocById('enrollments', id, { status }, 'Enrollment');
  res.status(200).json({
    success: true,
    message: 'Enrollment status updated',
    data: updated,
  });
});
