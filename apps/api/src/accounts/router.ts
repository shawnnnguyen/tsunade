import { accounts, db } from '@tsunade/db';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

interface NewAccount {
  name: string;
  type: string;
  source: 'enable_banking' | 'manual';
}

const parseNewAccount = (body: unknown): NewAccount | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name, type, source } = body;
  if (typeof name !== 'string' || typeof type !== 'string') {
    return null;
  }
  if (source !== 'enable_banking' && source !== 'manual') {
    return null;
  }
  return { name, type, source };
};

accountsRouter.get('/', async (req, res) => {
  const rows = await db.query.accounts.findMany({
    where: eq(accounts.userId, req.userId),
  });
  res.json(rows);
});

accountsRouter.post('/', async (req, res) => {
  const input = parseNewAccount(req.body);
  if (!input) {
    res.status(400).json({ error: 'name, type, and source are required' });
    return;
  }

  const [account] = await db
    .insert(accounts)
    .values({ ...input, userId: req.userId })
    .returning();
  if (!account) {
    throw new Error('failed to create account');
  }
  res.status(201).json(account);
});

accountsRouter.get('/:id', async (req, res) => {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)),
  });
  if (!account) {
    res.status(404).json({ error: 'account not found' });
    return;
  }
  res.json(account);
});

accountsRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'account not found' });
    return;
  }

  const patch: Partial<NewAccount> = {};
  if (isRecord(req.body)) {
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.type === 'string') patch.type = req.body.type;
  }

  const [account] = await db
    .update(accounts)
    .set(patch)
    .where(eq(accounts.id, existing.id))
    .returning();
  res.json(account);
});

accountsRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'account not found' });
    return;
  }
  await db.delete(accounts).where(eq(accounts.id, existing.id));
  res.status(204).end();
});
