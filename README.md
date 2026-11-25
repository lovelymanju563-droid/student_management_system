# Student Management System Backend

A complete, production-ready REST API backend for a **Student Management System** built with **Node.js**, **Express.js**, **JWT authentication (Access + Refresh Token rotation)**, **Role-Based Access Control (RBAC)**, and **Firebase Cloud Firestore** (`firebase-admin`).

## Features

- **Authentication & Security**
  - User registration, login, password hashing (`bcryptjs`), and password change
  - Stateless JWT Access Tokens + stateful Refresh Token rotation & revocation stored in Firestore (`refreshTokens` collection)
  - Role-Based Access Control (`admin`, `teacher`, `student`)
  - Protected Admin bootstrap endpoint (`POST /api/auth/register-admin`)
  - Request validation with `zod`, security headers (`helmet`), CORS, and auth rate limiting
- **Student Management (`/api/students`)**
  - Full CRUD with unique `email` and `studentCode` validation
  - Filtering (`status`, `department`, `semester`, `enrollmentYear`), search, sorting, and pagination
  - Student stats summary endpoint (`GET /api/students/stats/summary`)
  - Automatic cascade cleanup of enrollments & attendance on deletion
- **Course Management (`/api/courses`)**
  - Full CRUD with unique `courseCode`, capacity tracking, and active enrollment protection on delete
- **Enrollments & Grades (`/api/enrollments`)**
  - Course capacity & duplicate-enrollment validation
  - Grade recording (numeric `score` and/or letter `grade`) with automatic credit-weighted **GPA recalculation** on the student record
- **Attendance Tracking (`/api/attendance`)**
  - Idempotent daily attendance marking (`present`, `absent`, `late`, `excused`) per student & course
  - Student attendance summary & percentage breakdown per course

## Project Structure

```text
src/
  config/         # Env config and Firebase Admin initialization
  controllers/    # Route handlers for auth, users, students, courses, enrollments, attendance
  middleware/     # JWT auth, RBAC, Zod validation, error & 404 handlers
  repositories/   # Shared Firestore CRUD/query helpers & test in-memory store
  routes/         # Express routers mounted under /api
  utils/          # AppError, asyncHandler, JWT helpers, GPA calculator, ownership checks
  validators/     # Zod schemas
  app.js          # Express app configuration
  server.js       # Server entrypoint
tests/
  api.test.js     # Integration tests covering auth, RBAC, CRUD, GPA, attendance
firestore.rules   # Prototype Firestore security rules
firestore.indexes.json
firebase.json
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with strong JWT secrets and your Firebase credentials:

#### Connecting to Firebase Cloud Firestore
Choose **one** of these options:
1. **Service Account JSON File (Recommended for local dev)**:
   - In the Firebase Console: **Project Settings → Service accounts → Generate new private key**.
   - Save the file as `serviceAccountKey.json` in the project root (already gitignored).
   - Set `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json` and `FIREBASE_PROJECT_ID=your-project-id`.
2. **Inline JSON (Recommended for deployment)**:
   - Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the minified service account JSON string.
3. **Local Firebase Emulator**:
   - Uncomment `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, set `FIREBASE_PROJECT_ID=demo-student-mgmt`, and run:
     ```bash
     npx -y firebase-tools@latest emulators:start --only firestore
     ```

### 3. Run the Server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

### 4. Run Automated Tests
```bash
npm test
```

## API Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Health check |
| `POST` | `/api/auth/register` | Public | Register a new `student` user |
| `POST` | `/api/auth/register-admin` | Bootstrap Secret | Create initial `admin` user |
| `POST` | `/api/auth/login` | Public | Login and obtain access + refresh JWTs |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token & issue new access token |
| `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token |
| `GET` | `/api/auth/me` | Authenticated | Current user + linked student profile |
| `PATCH` | `/api/auth/change-password` | Authenticated | Update own password |
| `POST` | `/api/users` | `admin` | Create user with any role |
| `GET` | `/api/users` | `admin` | List users |
| `PATCH` | `/api/users/:id` | `admin` | Update user role / active status |
| `DELETE` | `/api/users/:id` | `admin` | Delete user |
| `POST` | `/api/students` | `admin`, `teacher` | Create student |
| `GET` | `/api/students` | `admin`, `teacher` | List/search/filter/paginate students |
| `GET` | `/api/students/stats/summary` | `admin`, `teacher` | Aggregate student statistics |
| `GET` | `/api/students/:id` | `admin`, `teacher`, own `student` | Get student details & enrollments |
| `PUT/PATCH` | `/api/students/:id` | `admin`, `teacher` | Update student |
| `DELETE` | `/api/students/:id` | `admin` | Delete student & related records |
| `POST` | `/api/courses` | `admin`, `teacher` | Create course |
| `GET` | `/api/courses` | Authenticated | List/filter courses |
| `GET` | `/api/courses/:id` | Authenticated | Get course details & enrolled count |
| `PATCH` | `/api/courses/:id` | `admin`, `teacher` | Update course |
| `DELETE` | `/api/courses/:id` | `admin` | Delete course |
| `POST` | `/api/enrollments` | `admin`, `teacher`, own `student` | Enroll student in course |
| `GET` | `/api/enrollments` | Authenticated (scoped for `student`) | List enrollments |
| `PATCH` | `/api/enrollments/:id/grade` | `admin`, `teacher` | Record grade & recalculate student GPA |
| `PATCH` | `/api/enrollments/:id/status` | `admin`, `teacher`, own `student` (drop) | Update enrollment status |
| `POST` | `/api/attendance` | `admin`, `teacher` | Mark or update daily attendance |
| `GET` | `/api/attendance` | Authenticated (scoped for `student`) | List attendance records |
| `GET` | `/api/attendance/summary/:studentId` | `admin`, `teacher`, own `student` | Attendance stats & percentage |
