import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Credentials come from GOOGLE_APPLICATION_CREDENTIALS (a path to the downloaded
// service account JSON) locally, and from the function's own service account when
// running on Cloud Functions. Never hardcode or log the key contents.
const app = admin.apps.length
  ? admin.app()
  : admin.initializeApp({ credential: admin.credential.applicationDefault() });

export const adminAuth = admin.auth();

// This project stores data in a NAMED Firestore database, not "(default)" — the id
// must be passed explicitly or every read silently hits an empty default database.
export const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-0ea7c2e5-49c2-4214-8b5d-6b7be0148e4c';

export const adminDb = getFirestore(app, FIRESTORE_DATABASE_ID);

// Default Cloud Storage bucket. Overridable so a non-production project can
// point elsewhere without a code change.
export const STORAGE_BUCKET =
  process.env.STORAGE_BUCKET || 'gen-lang-client-0419149292.firebasestorage.app';

export const adminBucket = admin.storage().bucket(STORAGE_BUCKET);
