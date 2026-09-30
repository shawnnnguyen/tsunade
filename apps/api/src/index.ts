import { db } from '@tsunade/db';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import express from 'express';

import { authRouter } from './auth/router.js';

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

app.listen(port, () => {
  console.log(`api listening on port ${String(port)}`);
});
