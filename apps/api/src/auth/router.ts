import { db, refreshTokens, users } from '@tsunade/db';
import { eq } from 'drizzle-orm';
import { Router, type Response } from 'express';

import { clearAuthCookies, getCookie, setAuthCookies } from './cookies.js';
import { requireAuth } from './middleware.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './tokens.js';

export const authRouter = Router();

interface Credentials {
  email: string;
  password: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseCredentials = (body: unknown): Credentials | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { email, password } = body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  if (!email.includes('@') || password.length < 8) {
    return null;
  }
  return { email, password };
};

const issueSession = async (res: Response, userId: string): Promise<void> => {
  const accessToken = signAccessToken(userId);
  const refresh = generateRefreshToken();
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
  });
  setAuthCookies(res, accessToken, refresh.token);
};

authRouter.post('/register', async (req, res) => {
  const credentials = parseCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: 'email and password (min 8 chars) are required' });
    return;
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, credentials.email) });
  if (existing) {
    res.status(409).json({ error: 'email already registered' });
    return;
  }

  const passwordHash = await hashPassword(credentials.password);
  const [user] = await db
    .insert(users)
    .values({ email: credentials.email, passwordHash })
    .returning();
  if (!user) {
    throw new Error('failed to create user');
  }

  await issueSession(res, user.id);
  res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
});

authRouter.post('/login', async (req, res) => {
  const credentials = parseCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, credentials.email) });
  if (!user || !(await verifyPassword(credentials.password, user.passwordHash))) {
    res.status(401).json({ error: 'invalid email or password' });
    return;
  }

  await issueSession(res, user.id);
  res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
});

authRouter.post('/refresh', async (req, res) => {
  const token = getCookie(req, 'refresh_token');
  if (!token) {
    res.status(401).json({ error: 'missing refresh token' });
    return;
  }

  const tokenHash = hashRefreshToken(token);
  const stored = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.tokenHash, tokenHash),
  });

  if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'invalid refresh token' });
    return;
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, stored.id));
  await issueSession(res, stored.userId);
  res.status(204).end();
});

authRouter.post('/logout', async (req, res) => {
  const token = getCookie(req, 'refresh_token');
  if (token) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(token)));
  }
  clearAuthCookies(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.userId) });
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
});
