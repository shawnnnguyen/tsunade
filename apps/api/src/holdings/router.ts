import { accounts, db, holdings } from '@tsunade/db';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const holdingsRouter = Router();

holdingsRouter.use(requireAuth);

interface NewHolding {
  accountId: string;
  symbol: string;
  quantity: string;
  costBasis: string;
  currency: string;
}

interface HoldingPatch {
  symbol: string;
  quantity: string;
  costBasis: string;
  currency: string;
}

const parseNewHolding = (body: unknown): NewHolding | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { accountId, symbol, quantity, costBasis, currency } = body;
  if (
    typeof accountId !== 'string' ||
    typeof symbol !== 'string' ||
    typeof quantity !== 'string' ||
    typeof costBasis !== 'string' ||
    typeof currency !== 'string'
  ) {
    return null;
  }
  return { accountId, symbol, quantity, costBasis, currency };
};

holdingsRouter.get('/', async (req, res) => {
  const rows = await db.query.holdings.findMany({
    where: eq(holdings.userId, req.userId),
  });
  res.json(rows);
});

holdingsRouter.post('/', async (req, res) => {
  const input = parseNewHolding(req.body);
  if (!input) {
    res
      .status(400)
      .json({ error: 'accountId, symbol, quantity, costBasis, and currency are required' });
    return;
  }

  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, input.accountId), eq(accounts.userId, req.userId)),
  });
  if (!account) {
    res.status(400).json({ error: 'accountId not found' });
    return;
  }

  const [holding] = await db
    .insert(holdings)
    .values({ ...input, userId: req.userId })
    .returning();
  if (!holding) {
    throw new Error('failed to create holding');
  }
  res.status(201).json(holding);
});

holdingsRouter.get('/:id', async (req, res) => {
  const holding = await db.query.holdings.findFirst({
    where: and(eq(holdings.id, req.params.id), eq(holdings.userId, req.userId)),
  });
  if (!holding) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }
  res.json(holding);
});

holdingsRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.holdings.findFirst({
    where: and(eq(holdings.id, req.params.id), eq(holdings.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }

  const patch: Partial<HoldingPatch> = {};
  if (isRecord(req.body)) {
    if (typeof req.body.symbol === 'string') patch.symbol = req.body.symbol;
    if (typeof req.body.quantity === 'string') patch.quantity = req.body.quantity;
    if (typeof req.body.costBasis === 'string') patch.costBasis = req.body.costBasis;
    if (typeof req.body.currency === 'string') patch.currency = req.body.currency;
  }

  const [holding] = await db
    .update(holdings)
    .set(patch)
    .where(eq(holdings.id, existing.id))
    .returning();
  res.json(holding);
});

holdingsRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.holdings.findFirst({
    where: and(eq(holdings.id, req.params.id), eq(holdings.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }
  await db.delete(holdings).where(eq(holdings.id, existing.id));
  res.status(204).end();
});
