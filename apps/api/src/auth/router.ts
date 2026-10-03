import { db, refreshTokens, users } from '@tsunade/db';
import { isCurrency, isNonEmptyString, isRecord, SUPPORTED_CURRENCIES } from '@tsunade/shared';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { clearAuthCookies, getCookie, setAuthCookies } from './cookies.js';
import { getUserId, requireAuth } from './middleware.js';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './passwords.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './tokens.js';

export const authRouter = Router();

const credentialsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests' },
});

const refreshRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests' },
});

const EMAIL_MAX_LENGTH = 254;

interface Credentials {
  email: string;
  password: string;
}

const parseCredentials = (body: unknown): Credentials | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { email, password } = body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (
    !isNonEmptyString(normalizedEmail, EMAIL_MAX_LENGTH) ||
    !normalizedEmail.includes('@') ||
    passwordBytes < 8 ||
    passwordBytes > 72
  ) {
    return null;
  }
  return { email: normalizedEmail, password };
};

type Executor = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown ? T : never;

interface Session {
  accessToken: string;
  refreshToken: string;
}

const createSession = async (executor: typeof db | Executor, userId: string): Promise<Session> => {
  const accessToken = signAccessToken(userId);
  const refresh = generateRefreshToken();
  await executor.insert(refreshTokens).values({
    userId,
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
  });
  return { accessToken, refreshToken: refresh.token };
};

authRouter.post('/register', credentialsRateLimit, async (req, res) => {
  const credentials = parseCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: 'email and password (8-72 chars) are required' });
    return;
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, credentials.email) });
  if (existing) {
    res.status(409).json({ error: 'email already registered' });
    return;
  }

  const passwordHash = await hashPassword(credentials.password);
  const { user, session } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: credentials.email, passwordHash })
      .returning();
    if (!user) {
      throw new Error('failed to create user');
    }
    const session = await createSession(tx, user.id);
    return { user, session };
  });

  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.status(201).json({
    id: user.id,
    email: user.email,
    baseCurrency: user.baseCurrency,
    createdAt: user.createdAt,
  });
});

authRouter.post('/login', credentialsRateLimit, async (req, res) => {
  const credentials = parseCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, credentials.email) });
  const valid = await verifyPassword(
    credentials.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !valid) {
    res.status(401).json({ error: 'invalid email or password' });
    return;
  }

  const session = await createSession(db, user.id);
  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json({
    id: user.id,
    email: user.email,
    baseCurrency: user.baseCurrency,
    createdAt: user.createdAt,
  });
});

authRouter.post('/refresh', refreshRateLimit, async (req, res) => {
  const token = getCookie(req, 'refresh_token');
  if (!token) {
    res.status(401).json({ error: 'missing refresh token' });
    return;
  }

  const tokenHash = hashRefreshToken(token);
  const now = new Date();

  const session = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .returning();
    if (!row) {
      return undefined;
    }
    return createSession(tx, row.userId);
  });

  if (!session) {
    const stored = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, tokenHash),
    });
    if (stored?.revokedAt !== null && stored?.revokedAt !== undefined) {
      // Already-rotated token reused: someone else holds a copy. Revoke the whole session.
      await db
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(and(eq(refreshTokens.userId, stored.userId), isNull(refreshTokens.revokedAt)));
    }
    clearAuthCookies(res);
    res.status(401).json({ error: 'invalid refresh token' });
    return;
  }

  setAuthCookies(res, session.accessToken, session.refreshToken);
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
  const user = await db.query.users.findFirst({ where: eq(users.id, getUserId(req)) });
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    baseCurrency: user.baseCurrency,
    createdAt: user.createdAt,
  });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  if (!isRecord(req.body) || !isCurrency(req.body.baseCurrency)) {
    res
      .status(400)
      .json({ error: `baseCurrency must be one of ${SUPPORTED_CURRENCIES.join(', ')}` });
    return;
  }

  const [user] = await db
    .update(users)
    .set({ baseCurrency: req.body.baseCurrency })
    .where(eq(users.id, getUserId(req)))
    .returning();
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    baseCurrency: user.baseCurrency,
    createdAt: user.createdAt,
  });
});
