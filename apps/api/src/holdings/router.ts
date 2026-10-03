import { accounts, db, holdings } from '@tsunade/db';
import {
  isCurrency,
  isNonEmptyString,
  isNumericString,
  isRecord,
  isWithinNumericBounds,
} from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';

export const holdingsRouter = Router();

const SYMBOL_MAX_LENGTH = 32;
const QUANTITY_PRECISION = 19;
const QUANTITY_SCALE = 8;
const COST_BASIS_PRECISION = 19;
const COST_BASIS_SCALE = 4;

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
    !isNonEmptyString(symbol, SYMBOL_MAX_LENGTH) ||
    typeof quantity !== 'string' ||
    !isNumericString(quantity) ||
    quantity.startsWith('-') ||
    !isWithinNumericBounds(quantity, QUANTITY_PRECISION, QUANTITY_SCALE) ||
    typeof costBasis !== 'string' ||
    !isNumericString(costBasis) ||
    costBasis.startsWith('-') ||
    !isWithinNumericBounds(costBasis, COST_BASIS_PRECISION, COST_BASIS_SCALE) ||
    !isCurrency(currency)
  ) {
    return null;
  }
  return { accountId, symbol: symbol.trim(), quantity, costBasis, currency };
};

holdingsRouter.get('/', async (req, res) => {
  const { limit, offset } = req.query;
  const rows = await db.query.holdings.findMany({
    where: eq(holdings.userId, getUserId(req)),
    orderBy: [desc(holdings.createdAt), desc(holdings.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
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

  const account = await findOwned(
    (args) => db.query.accounts.findFirst(args),
    accounts.id,
    accounts.userId,
    input.accountId,
    getUserId(req),
  );
  if (!account) {
    res.status(400).json({ error: 'accountId not found' });
    return;
  }

  const [holding] = await db
    .insert(holdings)
    .values({ ...input, userId: getUserId(req) })
    .returning();
  if (!holding) {
    throw new Error('failed to create holding');
  }
  res.status(201).json(holding);
});

holdingsRouter.get('/:id', async (req, res) => {
  const holding = await findOwned(
    (args) => db.query.holdings.findFirst(args),
    holdings.id,
    holdings.userId,
    req.params.id,
    getUserId(req),
  );
  if (!holding) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }
  res.json(holding);
});

holdingsRouter.patch('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.holdings.findFirst(args),
    holdings.id,
    holdings.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }

  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'request body must be an object' });
    return;
  }

  const patch: Partial<HoldingPatch> = {};
  for (const field of ['symbol', 'quantity', 'costBasis', 'currency'] as const) {
    if (field in req.body) {
      const value = req.body[field];
      if (typeof value !== 'string') {
        res.status(400).json({ error: `${field} must be a string` });
        return;
      }
      if (field === 'symbol' && !isNonEmptyString(value, SYMBOL_MAX_LENGTH)) {
        res.status(400).json({
          error: `symbol must be a non-empty string up to ${String(SYMBOL_MAX_LENGTH)} chars`,
        });
        return;
      }
      if (field === 'quantity') {
        if (
          !isNumericString(value) ||
          value.startsWith('-') ||
          !isWithinNumericBounds(value, QUANTITY_PRECISION, QUANTITY_SCALE)
        ) {
          res
            .status(400)
            .json({ error: 'quantity must be a non-negative numeric string within range' });
          return;
        }
      }
      if (field === 'costBasis') {
        if (
          !isNumericString(value) ||
          value.startsWith('-') ||
          !isWithinNumericBounds(value, COST_BASIS_PRECISION, COST_BASIS_SCALE)
        ) {
          res
            .status(400)
            .json({ error: 'costBasis must be a non-negative numeric string within range' });
          return;
        }
      }
      if (field === 'currency' && !isCurrency(value)) {
        res.status(400).json({ error: 'currency is not supported' });
        return;
      }
      patch[field] = field === 'symbol' ? value.trim() : value;
    }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'no valid fields to update' });
    return;
  }

  const [holding] = await db
    .update(holdings)
    .set(patch)
    .where(eq(holdings.id, existing.id))
    .returning();
  if (!holding) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }
  res.json(holding);
});

holdingsRouter.delete('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.holdings.findFirst(args),
    holdings.id,
    holdings.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'holding not found' });
    return;
  }
  await db.delete(holdings).where(eq(holdings.id, existing.id));
  res.status(204).end();
});
