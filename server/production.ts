import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

const firestore = process.env.GOOGLE_CLOUD_PROJECT ? new Firestore() : null;
const storage = process.env.GCS_AUDIO_BUCKET ? new Storage() : null;
const lineLogsCollection = process.env.FIRESTORE_LINE_LOGS_COLLECTION || 'line_webhook_logs';
const lineEventsCollection = process.env.FIRESTORE_LINE_EVENTS_COLLECTION || 'line_webhook_events';

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

export async function convertWavToM4a(wavPath: string): Promise<string> {
  const outputPath = wavPath.replace(/\.wav$/i, '.m4a');
  await run('ffmpeg', [
    '-y',
    '-i',
    wavPath,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath,
  ]);
  return outputPath;
}

export async function getAudioDurationMs(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
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

export async function publishAudioFile(filePath: string, baseUrl: string): Promise<string> {
  const filename = path.basename(filePath);
  const bucketName = process.env.GCS_AUDIO_BUCKET;

  if (!storage || !bucketName) {
    return `${baseUrl}/audio/${encodeURIComponent(filename)}`;
  }

  const destination = `line-audio/${filename}`;
  await storage.bucket(bucketName).upload(filePath, {
    destination,
    metadata: {
      cacheControl: 'public, max-age=86400',
      contentType: 'audio/mp4',
    },
  });

  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

export async function addPersistentLineLog(logItem: Record<string, unknown>): Promise<void> {
  if (!firestore) return;
  await firestore.collection(lineLogsCollection).doc(String(logItem.id)).set(logItem);
}

export async function getPersistentLineLogs(limit = 50): Promise<Record<string, unknown>[] | null> {
  if (!firestore) return null;
  const snapshot = await firestore
    .collection(lineLogsCollection)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function clearPersistentLineLogs(): Promise<boolean> {
  if (!firestore) return false;
  const snapshot = await firestore.collection(lineLogsCollection).limit(200).get();
  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return true;
}

export async function claimWebhookEvent(webhookEventId?: string): Promise<boolean> {
  if (!webhookEventId) return true;

  if (!firestore) {
    return true;
  }

  try {
    await firestore.collection(lineEventsCollection).doc(webhookEventId).create({
      receivedAt: new Date().toISOString(),
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
