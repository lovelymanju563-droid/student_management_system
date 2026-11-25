import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertStudentOwnership, resolveOwnStudent } from '../utils/studentOwnership.js';
import {
  findById,
  findWhere,
  createDoc,
  updateDocById,
  paginateAndSort,
} from '../repositories/base.repository.js';

export const markAttendance = asyncHandler(async (req, res) => {
  const { studentId, courseId, date, status, remarks } = req.body;

  const [student, course] = await Promise.all([
    findById('students', studentId, { required: true, label: 'Student' }),
    findById('courses', courseId, { required: true, label: 'Course' }),
  ]);

  const docId = `${studentId}_${courseId}_${date}`;
  const existing = await findById('attendance', docId);

  let record;
  if (existing) {
    record = await updateDocById(
      'attendance',
      docId,
      {
        status,
        remarks,
        markedBy: req.user.id,
      },
      'Attendance'
    );
  } else {
    record = await createDoc(
      'attendance',
      {
        studentId: student.id,
        courseId: course.id,
        studentCode: student.studentCode,
        studentName: `${student.firstName} ${student.lastName}`,
        courseCode: course.courseCode,
        courseTitle: course.title,
        date,
        status,
        remarks,
        markedBy: req.user.id,
      },
      docId
    );
  }

  res.status(existing ? 200 : 201).json({
    success: true,
    message: existing ? 'Attendance updated' : 'Attendance marked',
    data: record,
  });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, studentId, courseId, date, status } = req.query;

  let effectiveStudentId = studentId;
  if (req.user.role === 'student') {
    const ownStudent = await resolveOwnStudent(req.user);
    effectiveStudentId = ownStudent.id;
  }

  const filters = [];
  if (effectiveStudentId) filters.push(['studentId', '==', effectiveStudentId]);
  if (courseId) filters.push(['courseId', '==', courseId]);
  if (date) filters.push(['date', '==', date]);
  if (status) filters.push(['status', '==', status]);

  const records = await findWhere('attendance', filters);
  const result = paginateAndSort(records, {
    page,
    limit,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await findById('students', studentId, {
    required: true,
    label: 'Student',
  });

  assertStudentOwnership(req.user, student);

  const records = await findWhere('attendance', [['studentId', '==', studentId]]);
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  const byCourse = {};

  for (const rec of records) {
    counts[rec.status] = (counts[rec.status] || 0) + 1;
    if (!byCourse[rec.courseId]) {
      byCourse[rec.courseId] = {
        courseId: rec.courseId,
        courseCode: rec.courseCode,
        courseTitle: rec.courseTitle,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
    }
    byCourse[rec.courseId].total += 1;
    byCourse[rec.courseId][rec.status] += 1;
  }

  const total = records.length;
  const attended = counts.present + counts.late;
  const attendancePercentage =
    total > 0 ? Number(((attended / total) * 100).toFixed(2)) : 0;

  res.status(200).json({
    success: true,
    data: {
      studentId: student.id,
      studentCode: student.studentCode,
      totalSessions: total,
      counts,
      attendancePercentage,
      courses: Object.values(byCourse),
    },
  });
});
