import type { Express, Request, Response } from 'express';
import {
  getMissingProductionConfiguration,
  getRuntimeConfiguration,
  verifyGoogleCloudDependencies,
} from './production.js';

const serviceName = 'ai-voice-line-announcer';

export function registerHealthRoutes(app: Express): void {
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    const missing = getMissingProductionConfiguration();
    const runtime = getRuntimeConfiguration();

    if (missing.length > 0) {
      res.status(503).json({
        status: 'not_ready',
        service: serviceName,
        missingConfiguration: missing,
        runtime,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const dependencies = await verifyGoogleCloudDependencies();
    const ready = dependencies.firestore && dependencies.storage;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      service: serviceName,
      runtime,
      dependencies,
      timestamp: new Date().toISOString(),
    });
  });
}
