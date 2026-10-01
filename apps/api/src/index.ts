import { db } from '@tsunade/db';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import express from 'express';

import { accountsRouter } from './accounts/router.js';
import { assetsRouter } from './assets/router.js';
import { authRouter } from './auth/router.js';
import { categoriesRouter } from './categories/router.js';
import { holdingsRouter } from './holdings/router.js';
import { rulesRouter } from './rules/router.js';
import { tagsRouter } from './tags/router.js';
import { transactionsRouter } from './transactions/router.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/categories', categoriesRouter);
app.use('/rules', rulesRouter);
app.use('/holdings', holdingsRouter);
app.use('/assets', assetsRouter);
app.use('/tags', tagsRouter);
app.use('/transactions', transactionsRouter);

app.listen(port, () => {
  console.log(`api listening on port ${String(port)}`);
});
