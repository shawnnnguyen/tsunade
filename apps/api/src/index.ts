import { db } from '@tsunade/db';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import express from 'express';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';

import { accountsRouter } from './accounts/router.js';
import { assetsRouter } from './assets/router.js';
import { requireAuth } from './auth/middleware.js';
import { authRouter } from './auth/router.js';
import { categoriesRouter } from './categories/router.js';
import { holdingsRouter } from './holdings/router.js';
import { errorHandler } from './lib/error-handler.js';
import { rulesRouter } from './rules/router.js';
import { tagsRouter } from './tags/router.js';
import { transactionsRouter } from './transactions/router.js';

const webOrigin = process.env.WEB_ORIGIN;
if (!webOrigin) {
  throw new Error('WEB_ORIGIN environment variable is required');
}

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.set('trust proxy', false);

app.use(cors({ origin: webOrigin, credentials: true }));

const healthRateLimit = rateLimit({
  windowMs: 10 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests' },
});

app.get('/health', healthRateLimit, async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ status: 'ok' });
});

app.use(
  rateLimit({
    windowMs: 30 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too many requests' },
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRouter);

app.use(requireAuth);

app.use('/accounts', accountsRouter);
app.use('/categories', categoriesRouter);
app.use('/rules', rulesRouter);
app.use('/holdings', holdingsRouter);
app.use('/assets', assetsRouter);
app.use('/tags', tagsRouter);
app.use('/transactions', transactionsRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`api listening on port ${String(port)}`);
});
