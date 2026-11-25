import dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      (isTest ? 'test-access-secret-key-minimum-32-chars-long' : ''),
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      (isTest ? 'test-refresh-secret-key-minimum-32-chars-long' : ''),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST || '',
  },
  adminBootstrapSecret:
    process.env.ADMIN_BOOTSTRAP_SECRET || (isTest ? 'test-admin-secret' : ''),
  useInMemoryDb: process.env.USE_IN_MEMORY_DB === 'true',
};

export function validateEnv() {
  const missing = [];
  if (!env.jwt.accessSecret) missing.push('JWT_ACCESS_SECRET');
  if (!env.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Check your .env file.`
    );
  }
}

export default env;
