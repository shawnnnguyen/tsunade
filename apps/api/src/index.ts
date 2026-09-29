import { db } from '@tsunade/db';
import { sql } from 'drizzle-orm';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get('/health', async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`api listening on port ${String(port)}`);
});
