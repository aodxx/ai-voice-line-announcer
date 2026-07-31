import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const bucketName = process.env.GCS_AUDIO_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
const firestore = projectId ? new Firestore({ projectId }) : null;
const storage = bucketName ? new Storage({ projectId }) : null;

const lineLogsCollection = process.env.FIRESTORE_LINE_LOGS_COLLECTION || 'line_webhook_logs';
const lineEventsCollection = process.env.FIRESTORE_LINE_EVENTS_COLLECTION || 'line_webhook_events';
const announcementsCollection = process.env.FIRESTORE_ANNOUNCEMENTS_COLLECTION || 'announcements';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${stderr}`));
    });
  });
}

export function getRuntimeConfiguration() {
  return {
    projectId: projectId || null,
    bucketName: bucketName || null,
    firestoreEnabled: Boolean(firestore),
    storageEnabled: Boolean(storage && bucketName),
  };
}

export function getMissingProductionConfiguration(): string[] {
  const required = [
    'GOOGLE_CLOUD_PROJECT',
    'GCS_AUDIO_BUCKET',
    'GEMINI_API_KEY',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'APP_URL',
  ];

  return required.filter((name) => !process.env[name]);
}

export async function verifyGoogleCloudDependencies(): Promise<{
  firestore: boolean;
  storage: boolean;
  errors: string[];
}> {
  const result = { firestore: false, storage: false, errors: [] as string[] };

  if (!firestore) {
    result.errors.push('Firestore is not configured');
  } else {
    try {
      await firestore.collection('_system').doc('readiness').get();
      result.firestore = true;
    } catch (error) {
      result.errors.push(`Firestore: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!storage || !bucketName) {
    result.errors.push('Cloud Storage is not configured');
  } else {
    try {
      const [exists] = await storage.bucket(bucketName).exists();
      result.storage = exists;
      if (!exists) result.errors.push(`Cloud Storage bucket not found: ${bucketName}`);
    } catch (error) {
      result.errors.push(`Cloud Storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}

export async function convertWavToM4a(wavPath: string): Promise<string> {
  const outputPath = wavPath.replace(/\.wav$/i, '.m4a');
  await run('ffmpeg', [
    '-y', '-i', wavPath,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ]);
  return outputPath;
}

export async function getAudioDurationMs(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }
      const seconds = Number.parseFloat(stdout.trim());
      resolve(Math.max(1, Math.round(seconds * 1000)));
    });
  });
}

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.wav') return 'audio/wav';
  if (extension === '.mp3') return 'audio/mpeg';
  return 'audio/mp4';
}

export async function publishAudioFile(filePath: string, baseUrl: string): Promise<string> {
  const filename = path.basename(filePath);

  if (!storage || !bucketName) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('GCS_AUDIO_BUCKET is required in production');
    }
    return `${baseUrl}/audio/${encodeURIComponent(filename)}`;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const destination = `announcements/${year}/${month}/${filename}`;

  await storage.bucket(bucketName).upload(filePath, {
    destination,
    resumable: false,
    metadata: {
      cacheControl: 'private, max-age=3600',
      contentType: contentTypeFor(filePath),
      metadata: {
        source: 'ai-voice-line-announcer',
      },
    },
  });

  return `gs://${bucketName}/${destination}`;
}

export async function createSignedAudioUrl(storageUri: string, expiresInMinutes = 60): Promise<string> {
  if (!storage || !bucketName || !storageUri.startsWith(`gs://${bucketName}/`)) return storageUri;
  const objectName = storageUri.slice(`gs://${bucketName}/`.length);
  const [url] = await storage.bucket(bucketName).file(objectName).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

export async function saveAnnouncement(item: Record<string, unknown>): Promise<string | null> {
  if (!firestore) return null;
  const id = typeof item.id === 'string' && item.id ? item.id : undefined;
  const ref = id
    ? firestore.collection(announcementsCollection).doc(id)
    : firestore.collection(announcementsCollection).doc();

  await ref.set({
    ...item,
    id: ref.id,
    createdAt: item.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return ref.id;
}

export async function getAnnouncements(limit = 100): Promise<Record<string, unknown>[] | null> {
  if (!firestore) return null;
  const snapshot = await firestore
    .collection(announcementsCollection)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(Math.max(limit, 1), 200))
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function addPersistentLineLog(logItem: Record<string, unknown>): Promise<void> {
  if (!firestore) return;
  const id = typeof logItem.id === 'string' ? logItem.id : firestore.collection(lineLogsCollection).doc().id;
  await firestore.collection(lineLogsCollection).doc(id).set({
    ...logItem,
    id,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getPersistentLineLogs(limit = 50): Promise<Record<string, unknown>[] | null> {
  if (!firestore) return null;
  const snapshot = await firestore
    .collection(lineLogsCollection)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(Math.max(limit, 1), 200))
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function clearPersistentLineLogs(): Promise<boolean> {
  if (!firestore) return false;
  const snapshot = await firestore.collection(lineLogsCollection).limit(200).get();
  if (snapshot.empty) return true;
  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return true;
}

export async function claimWebhookEvent(webhookEventId?: string): Promise<boolean> {
  if (!webhookEventId || !firestore) return true;

  try {
    await firestore.collection(lineEventsCollection).doc(webhookEventId).create({
      receivedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return true;
  } catch (error: any) {
    if (error?.code === 6 || error?.code === 'already-exists') return false;
    throw error;
  }
}

export function removeLocalFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn('Unable to remove temporary audio file:', error);
  }
}
