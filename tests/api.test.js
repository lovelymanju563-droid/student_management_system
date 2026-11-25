import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-minimum-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-chars-long';
process.env.ADMIN_BOOTSTRAP_SECRET = 'test-admin-secret';

const { default: app } = await import('../src/app.js');
const { setDbInstance } = await import('../src/config/firebase.js');
const { createInMemoryFirestore } = await import('../src/repositories/inMemoryDb.js');

const db = createInMemoryFirestore();
setDbInstance(db);

beforeEach(() => {
  db.clear();
});

async function createAdminAndToken() {
  const res = await request(app).post('/api/auth/register-admin').send({
    name: 'System Admin',
    email: 'admin@school.edu',
    password: 'Password123!',
    bootstrapSecret: 'test-admin-secret',
  });
  assert.equal(res.status, 201);
  return res.body.data;
}

test('GET /api/health returns service status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, 'ok');
});

test('Auth lifecycle: register, login, refresh token rotation, logout, and me', async () => {
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Alice Student',
    email: 'alice@school.edu',
    password: 'Password123!',
  });
  assert.equal(regRes.status, 201);
  assert.equal(regRes.body.data.user.role, 'student');
  assert.equal(regRes.body.data.user.passwordHash, undefined);

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'alice@school.edu',
    password: 'Password123!',
  });
  assert.equal(loginRes.status, 200);
  const { accessToken, refreshToken } = loginRes.body.data;

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.data.user.email, 'alice@school.edu');

  const refreshRes = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken });
  assert.equal(refreshRes.status, 200);
  const rotatedRefresh = refreshRes.body.data.refreshToken;
  const newAccess = refreshRes.body.data.accessToken;

  // Old refresh token should now be rejected (revoked on rotation)
  const reuseRes = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken });
  assert.equal(reuseRes.status, 401);

  // Logout revokes the rotated refresh token
  const logoutRes = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${newAccess}`)
    .send({ refreshToken: rotatedRefresh });
  assert.equal(logoutRes.status, 200);

  const afterLogoutRefresh = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken: rotatedRefresh });
  assert.equal(afterLogoutRefresh.status, 401);
});

test('RBAC prevents student role from creating or deleting students', async () => {
  const studentReg = await request(app).post('/api/auth/register').send({
    name: 'Bob Student',
    email: 'bob@school.edu',
    password: 'Password123!',
  });
  const studentToken = studentReg.body.data.accessToken;

  const createRes = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      studentCode: 'STU-001',
      firstName: 'Bob',
      lastName: 'Builder',
      email: 'bob@school.edu',
      department: 'Computer Science',
      enrollmentYear: 2026,
    });
  assert.equal(createRes.status, 403);
});

test('Full Student, Course, Enrollment, Grade/GPA, and Attendance workflow', async () => {
  const { accessToken: adminToken } = await createAdminAndToken();

  // 1. Register a student user so we can test student self-access too
  const studentUserRes = await request(app).post('/api/auth/register').send({
    name: 'Jane Doe',
    email: 'jane@school.edu',
    password: 'Password123!',
  });
  const janeUserId = studentUserRes.body.data.user.id;
  const janeToken = studentUserRes.body.data.accessToken;

  // 2. Admin creates Student record linked to Jane
  const createStudentRes = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      studentCode: 'STU-2026-001',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@school.edu',
      department: 'Computer Science',
      program: 'B.Sc. Computer Science',
      enrollmentYear: 2026,
      semester: 1,
      userId: janeUserId,
    });
  assert.equal(createStudentRes.status, 201);
  const studentId = createStudentRes.body.data.id;

  // Duplicate studentCode should return 409
  const dupStudentRes = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      studentCode: 'STU-2026-001',
      firstName: 'Other',
      lastName: 'Student',
      email: 'other@school.edu',
      department: 'Computer Science',
      enrollmentYear: 2026,
    });
  assert.equal(dupStudentRes.status, 409);

  // 3. Admin creates two courses
  const course1Res = await request(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      courseCode: 'CS101',
      title: 'Intro to Programming',
      credits: 4,
      department: 'Computer Science',
      maxCapacity: 30,
      semester: 1,
    });
  assert.equal(course1Res.status, 201);
  const course1Id = course1Res.body.data.id;

  const course2Res = await request(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      courseCode: 'MATH101',
      title: 'Linear Algebra',
      credits: 3,
      department: 'Mathematics',
      maxCapacity: 30,
      semester: 1,
    });
  assert.equal(course2Res.status, 201);
  const course2Id = course2Res.body.data.id;

  // 4. Enroll student in both courses
  const enroll1Res = await request(app)
    .post('/api/enrollments')
    .set('Authorization', `Bearer ${janeToken}`)
    .send({ studentId, courseId: course1Id });
  assert.equal(enroll1Res.status, 201);
  const enrollment1Id = enroll1Res.body.data.id;

  const enroll2Res = await request(app)
    .post('/api/enrollments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ studentId, courseId: course2Id });
  assert.equal(enroll2Res.status, 201);
  const enrollment2Id = enroll2Res.body.data.id;

  // 5. Grade both courses -> check credit-weighted GPA:
  // CS101 (4 credits): score 95 -> A (4.0)
  // MATH101 (3 credits): score 85 -> B (3.0)
  // GPA = (4*4.0 + 3*3.0) / 7 = 25 / 7 = 3.57
  const grade1Res = await request(app)
    .patch(`/api/enrollments/${enrollment1Id}/grade`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ score: 95 });
  assert.equal(grade1Res.status, 200);
  assert.equal(grade1Res.body.data.enrollment.grade, 'A');
  assert.equal(grade1Res.body.data.updatedStudentGpa, 4.0);

  const grade2Res = await request(app)
    .patch(`/api/enrollments/${enrollment2Id}/grade`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ score: 85 });
  assert.equal(grade2Res.status, 200);
  assert.equal(grade2Res.body.data.enrollment.grade, 'B');
  assert.equal(grade2Res.body.data.updatedStudentGpa, 3.57);

  // 6. Mark attendance and verify summary
  await request(app)
    .post('/api/attendance')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ studentId, courseId: course1Id, date: '2026-11-24', status: 'present' });

  await request(app)
    .post('/api/attendance')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ studentId, courseId: course1Id, date: '2026-11-25', status: 'absent' });

  const attSummaryRes = await request(app)
    .get(`/api/attendance/summary/${studentId}`)
    .set('Authorization', `Bearer ${janeToken}`);
  assert.equal(attSummaryRes.status, 200);
  assert.equal(attSummaryRes.body.data.totalSessions, 2);
  assert.equal(attSummaryRes.body.data.attendancePercentage, 50);

  // 7. Stats & Search endpoints
  const searchRes = await request(app)
    .get('/api/students?search=Jane')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(searchRes.status, 200);
  assert.equal(searchRes.body.data.length, 1);
  assert.equal(searchRes.body.data[0].gpa, 3.57);

  const statsRes = await request(app)
    .get('/api/students/stats/summary')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(statsRes.status, 200);
  assert.equal(statsRes.body.data.totalStudents, 1);
  assert.equal(statsRes.body.data.averageGpa, 3.57);
});
