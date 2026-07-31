import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const storageBucket = process.env.GCS_AUDIO_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;

export const firebaseAdminApp = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket,
});

export const adminAuth = getAuth(firebaseAdminApp);
export const adminFirestore = getFirestore(firebaseAdminApp);
export const adminStorage = getStorage(firebaseAdminApp);
