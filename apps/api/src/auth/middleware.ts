import type { NextFunction, Request, Response } from 'express';

import { getCookie } from './cookies.js';
import { verifyAccessToken } from './tokens.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = getCookie(req, 'access_token');
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    req.userId = verifyAccessToken(token).sub;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};
