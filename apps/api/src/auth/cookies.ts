import type { Request, Response } from 'express';

import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from './tokens.js';

const isLocalDev = process.env.NODE_ENV === 'development';

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: 'lax',
    path: '/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/auth' });
};

export const getCookie = (req: Request, name: string): string | undefined => {
  const value: unknown = req.cookies[name];
  return typeof value === 'string' ? value : undefined;
};
