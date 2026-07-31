import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const audioBucket = process.env.SUPABASE_AUDIO_BUCKET || 'line-audio';
const lineLogsTable = process.env.SUPABASE_LINE_LOGS_TABLE || 'line_webhook_logs';
const lineEventsTable = process.env.SUPABASE_LINE_EVENTS_TABLE || 'line_webhook_events';

const supabase: SupabaseClient | null = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

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

  if (!supabase) {
    return `${baseUrl}/audio/${encodeURIComponent(filename)}`;
  }

  const objectPath = `announcements/${filename}`;
  const audio = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from(audioBucket).upload(objectPath, audio, {
    cacheControl: '86400',
    contentType: 'audio/mp4',
    upsert: false,
  });
  if (error) throw new Error(`Supabase audio upload failed: ${error.message}`);

  const { data } = supabase.storage.from(audioBucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function addPersistentLineLog(logItem: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(lineLogsTable).upsert({
    id: String(logItem.id),
    timestamp: logItem.timestamp,
    payload: logItem,
  });
  if (error) throw new Error(`Supabase log insert failed: ${error.message}`);
}

export async function getPersistentLineLogs(limit = 50): Promise<Record<string, unknown>[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(lineLogsTable)
    .select('payload')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase log query failed: ${error.message}`);
  return data.map((row) => row.payload as Record<string, unknown>);
}

export async function clearPersistentLineLogs(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from(lineLogsTable).delete().not('id', 'is', null);
  if (error) throw new Error(`Supabase log cleanup failed: ${error.message}`);
  return true;
}

export async function claimWebhookEvent(webhookEventId?: string): Promise<boolean> {
  if (!webhookEventId) return true;

  if (!supabase) {
    return true;
  }

  const { error } = await supabase.from(lineEventsTable).insert({
    webhook_event_id: webhookEventId,
    received_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(`Supabase event claim failed: ${error.message}`);
}

export function removeLocalFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn('Unable to remove temporary audio file:', error);
  }
}
