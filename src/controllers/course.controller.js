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

export const createCourse = asyncHandler(async (req, res) => {
  const payload = req.body;

  const existing = await findOneByField('courses', 'courseCode', payload.courseCode);
  if (existing) {
    throw new AppError('A course with this courseCode already exists', 409);
  }

  const course = await createDoc('courses', {
    ...payload,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: course,
  });
});

export const listCourses = asyncHandler(async (req, res) => {
  const { page, limit, department, semester, status, search, sortBy, sortOrder } =
    req.query;

  const filters = [];
  if (department) filters.push(['department', '==', department]);
  if (semester) filters.push(['semester', '==', semester]);
  if (status) filters.push(['status', '==', status]);

  const courses = await findWhere('courses', filters);
  const result = paginateAndSort(courses, {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    searchFields: ['courseCode', 'title', 'department', 'instructorName'],
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getCourseById = asyncHandler(async (req, res) => {
  const course = await findById('courses', req.params.id, {
    required: true,
    label: 'Course',
  });

  const activeEnrollments = await findWhere('enrollments', [
    ['courseId', '==', course.id],
    ['status', '==', 'enrolled'],
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...course,
      enrolledCount: activeEnrollments.length,
    },
  });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const current = await findById('courses', id, {
    required: true,
    label: 'Course',
  });

  if (updates.courseCode && updates.courseCode !== current.courseCode) {
    const dup = await findOneByField('courses', 'courseCode', updates.courseCode);
    if (dup && dup.id !== id) {
      throw new AppError('Another course already uses this courseCode', 409);
    }
  }

  const updated = await updateDocById('courses', id, updates, 'Course');
  res.status(200).json({
    success: true,
    message: 'Course updated successfully',
    data: updated,
  });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  await findById('courses', id, { required: true, label: 'Course' });

  const enrollments = await findWhere('enrollments', [['courseId', '==', id]]);
  const hasActive = enrollments.some((e) => e.status === 'enrolled');
  if (hasActive && !force) {
    throw new AppError(
      'Course has active enrollments. Pass ?force=true to delete anyway.',
      409
    );
  }

  await deleteDocById('courses', id, 'Course');
  if (force && enrollments.length > 0) {
    await Promise.all(
      enrollments.map((item) => deleteDocById('enrollments', item.id))
    );
  }

  res.status(200).json({
    success: true,
    message: 'Course deleted successfully',
  });
});
