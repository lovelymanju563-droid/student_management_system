import app from './app.js';
import env, { validateEnv } from './config/env.js';
import { initFirebase, setDbInstance } from './config/firebase.js';
import { createInMemoryFirestore } from './repositories/inMemoryDb.js';

async function startServer() {
  validateEnv();

  if (env.useInMemoryDb) {
    console.warn('[DB] Running with in-memory Firestore store (USE_IN_MEMORY_DB=true)');
    setDbInstance(createInMemoryFirestore());
  } else {
    initFirebase();
    console.log('[DB] Firebase Admin Firestore initialized');
  }

  const server = app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
