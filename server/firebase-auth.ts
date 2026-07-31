import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase-admin.js';

export interface AuthenticatedRequest extends Request {
  firebaseUser?: DecodedIdToken;
}

export async function requireFirebaseUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing Firebase ID token' });
  }

  try {
    req.firebaseUser = await adminAuth.verifyIdToken(token, true);
    return next();
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
  }
}

export async function requireFirebaseAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  await requireFirebaseUser(req, res, () => {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAdmin = req.firebaseUser.admin === true;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Administrator permission required' });
    }

    return next();
  });
}
