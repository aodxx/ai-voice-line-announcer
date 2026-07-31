import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireFirebaseAdmin } from './firebase-auth.js';
import {
  createSignedAudioUrl,
  getAnnouncements,
  getMissingProductionConfiguration,
  getRuntimeConfiguration,
  publishAudioFile,
  saveAnnouncement,
  verifyGoogleCloudDependencies,
} from './production.js';

const originalUse = express.application.use;
const injectedApps = new WeakSet<object>();

function isPublicApi(pathname: string): boolean {
  return pathname === '/health'
    || pathname === '/healthz'
    || pathname === '/ready'
    || pathname === '/api/line/webhook'
    || pathname === '/api/v1/tts';
}

async function resolveAnnouncementUrls(items: Record<string, unknown>[]) {
  return Promise.all(items.map(async (item) => {
    const storageUri = typeof item.storageUri === 'string' ? item.storageUri : '';
    if (!storageUri) return item;
    try {
      return { ...item, url: await createSignedAudioUrl(storageUri, 60) };
    } catch (error) {
      console.error('Unable to sign announcement URL:', error);
      return item;
    }
  }));
}

function runtimeRouter() {
  const router = express.Router();

  router.get(['/health', '/healthz'], (_req, res) => {
    res.json({
      ok: true,
      service: 'ai-voice-line-announcer',
      timestamp: new Date().toISOString(),
      runtime: getRuntimeConfiguration(),
    });
  });

  router.get('/ready', async (_req, res) => {
    const missing = getMissingProductionConfiguration();
    const dependencies = await verifyGoogleCloudDependencies();
    const ready = missing.length === 0 && dependencies.firestore && dependencies.storage;
    res.status(ready ? 200 : 503).json({ ready, missing, dependencies });
  });

  router.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const pathname = `/api${req.path}`;
    if (isPublicApi(pathname)) return next();
    return requireFirebaseAdmin(req, res, next);
  });

  router.get('/api/history', async (_req, res, next) => {
    try {
      const announcements = await getAnnouncements(100);
      if (!announcements) return next();
      return res.json(await resolveAnnouncementUrls(announcements));
    } catch (error) {
      console.error('Unable to load Firestore history:', error);
      return res.status(500).json({ error: 'Failed to fetch announcement history' });
    }
  });

  router.use('/api/generate-voice', (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = ((body: any) => {
      if (!body?.success || !body?.metadata || !body?.filename) {
        return originalJson(body);
      }

      void (async () => {
        try {
          const filePath = path.join(process.cwd(), 'audio', path.basename(body.filename));
          if (!fs.existsSync(filePath)) return originalJson(body);

          const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
          const storageUri = await publishAudioFile(filePath, baseUrl);
          const audioUrl = storageUri.startsWith('gs://')
            ? await createSignedAudioUrl(storageUri, 60)
            : storageUri;

          const metadata = {
            ...body.metadata,
            id: String(body.metadata.id || Date.now()),
            date: body.metadata.date || new Date().toISOString(),
            createdAt: new Date(),
            storageUri,
            url: audioUrl,
          };

          await saveAnnouncement(metadata);
          return originalJson({ ...body, audioUrl, metadata });
        } catch (error) {
          console.error('Unable to persist generated announcement:', error);
          return originalJson(body);
        }
      })();

      return res;
    }) as typeof res.json;

    next();
  });

  return router;
}

express.application.use = function patchedUse(this: express.Application, ...args: any[]) {
  if (!injectedApps.has(this)) {
    injectedApps.add(this);
    originalUse.call(this, runtimeRouter());
  }
  return originalUse.apply(this, args as any);
};

void import('../server.ts').catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
