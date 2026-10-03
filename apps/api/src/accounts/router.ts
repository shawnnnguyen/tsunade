import { accounts, db } from '@tsunade/db';
import { isNonEmptyString, isRecord } from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';

export const accountsRouter = Router();

const NAME_MAX_LENGTH = 200;
const TYPE_MAX_LENGTH = 100;

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
  if (
    typeof name !== 'string' ||
    !isNonEmptyString(name, NAME_MAX_LENGTH) ||
    typeof type !== 'string' ||
    !isNonEmptyString(type, TYPE_MAX_LENGTH)
  ) {
    return null;
  }
  if (source !== 'enable_banking' && source !== 'manual') {
    return null;
  }
  return { name: name.trim(), type: type.trim(), source };
};

accountsRouter.get('/', async (req, res) => {
  const { limit, offset } = req.query;
  const rows = await db.query.accounts.findMany({
    where: eq(accounts.userId, getUserId(req)),
    orderBy: [desc(accounts.createdAt), desc(accounts.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
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
    .values({ ...input, userId: getUserId(req) })
    .returning();
  if (!account) {
    throw new Error('failed to create account');
  }
  res.status(201).json(account);
});

accountsRouter.get('/:id', async (req, res) => {
  const account = await findOwned(
    (args) => db.query.accounts.findFirst(args),
    accounts.id,
    accounts.userId,
    req.params.id,
    getUserId(req),
  );
  if (!account) {
    res.status(404).json({ error: 'account not found' });
    return;
  }
  res.json(account);
});

accountsRouter.patch('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.accounts.findFirst(args),
    accounts.id,
    accounts.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'account not found' });
    return;
  }

  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'request body must be an object' });
    return;
  }

  const patch: Partial<NewAccount> = {};
  if ('name' in req.body) {
    if (typeof req.body.name !== 'string' || !isNonEmptyString(req.body.name, NAME_MAX_LENGTH)) {
      res
        .status(400)
        .json({ error: `name must be a non-empty string up to ${String(NAME_MAX_LENGTH)} chars` });
      return;
    }
    patch.name = req.body.name.trim();
  }
  if ('type' in req.body) {
    if (typeof req.body.type !== 'string' || !isNonEmptyString(req.body.type, TYPE_MAX_LENGTH)) {
      res
        .status(400)
        .json({ error: `type must be a non-empty string up to ${String(TYPE_MAX_LENGTH)} chars` });
      return;
    }
    patch.type = req.body.type.trim();
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'no valid fields to update' });
    return;
  }

  const [account] = await db
    .update(accounts)
    .set(patch)
    .where(eq(accounts.id, existing.id))
    .returning();
  if (!account) {
    res.status(404).json({ error: 'account not found' });
    return;
  }
  res.json(account);
});

accountsRouter.delete('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.accounts.findFirst(args),
    accounts.id,
    accounts.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'account not found' });
    return;
  }
  await db.delete(accounts).where(eq(accounts.id, existing.id));
  res.status(204).end();
});
