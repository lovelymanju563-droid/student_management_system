import fs from 'node:fs';
import path from 'node:path';
import {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import env from './env.js';

let firestoreInstance = null;

function resolveCredential() {
  if (env.firebase.serviceAccountJson) {
    const parsed = JSON.parse(env.firebase.serviceAccountJson);
    return cert(parsed);
  }

  if (env.firebase.serviceAccountPath) {
    const resolvedPath = path.resolve(process.cwd(), env.firebase.serviceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      return cert(JSON.parse(raw));
    }
    throw new Error(
      `Firebase service account file not found at: ${resolvedPath}`
    );
  }

  return applicationDefault();
}

export function initFirebase() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (getApps().length === 0) {
    const options = {};

    if (env.firebase.projectId) {
      options.projectId = env.firebase.projectId;
    }

    // When using the local Firestore emulator, credentials are optional.
    if (!env.firebase.emulatorHost) {
      options.credential = resolveCredential();
    }

    initializeApp(options);
  }

  const app = getApps()[0];
  firestoreInstance =
    env.firebase.databaseId && env.firebase.databaseId !== '(default)'
      ? getFirestore(app, env.firebase.databaseId)
      : getFirestore(app);

  firestoreInstance.settings({ ignoreUndefinedProperties: true });
  return firestoreInstance;
}

export function setDbInstance(customDb) {
  firestoreInstance = customDb;
}

export function getDb() {
  if (!firestoreInstance) {
    return initFirebase();
  }
  return firestoreInstance;
}
