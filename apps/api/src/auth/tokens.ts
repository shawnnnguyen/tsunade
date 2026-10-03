import crypto from 'node:crypto';

// eslint-disable-next-line import-x/default -- jsonwebtoken is CJS (`export =`); default import is the correct runtime usage
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const JWT_SECRET_MIN_LENGTH = 32;

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (jwtSecret.length < JWT_SECRET_MIN_LENGTH) {
  throw new Error(`JWT_SECRET must be at least ${String(JWT_SECRET_MIN_LENGTH)} characters`);
}

export const signAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId }, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });

export const verifyAccessToken = (token: string): { sub: string } => {
  const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('invalid access token payload');
  }
  return { sub: payload.sub };
};

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateRefreshToken = (): { token: string; tokenHash: string; expiresAt: Date } => {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
};
