import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDrAQT7v3mTt-NmCE0s7GK1YVr1Yv3Kwk4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-voice-line-announcer.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ai-voice-line-announcer',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-voice-line-announcer.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '889050815495',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:889050815495:web:4b3733bcc2a91813d09a55',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XHQJDPSGKC',
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

export function initializeFirebaseAnalytics(): Promise<Analytics | null> {
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}
