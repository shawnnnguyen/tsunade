import { categories, db, rules } from '@tsunade/db';
import { isNonEmptyString, isRecord } from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';
import { backfillCategories } from './backfill.js';

export const rulesRouter = Router();

const PATTERN_MAX_LENGTH = 500;

interface NewRule {
  categoryId: string;
  matchField: 'description' | 'amount' | 'merchant';
  pattern: string;
}

const isMatchField = (value: unknown): value is NewRule['matchField'] =>
  value === 'description' || value === 'amount' || value === 'merchant';

const parseNewRule = (body: unknown): NewRule | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { categoryId, matchField, pattern } = body;
  if (
    typeof categoryId !== 'string' ||
    typeof pattern !== 'string' ||
    !isNonEmptyString(pattern, PATTERN_MAX_LENGTH)
  ) {
    return null;
  }
  if (!isMatchField(matchField)) {
    return null;
  }
  return { categoryId, matchField, pattern: pattern.trim() };
};

rulesRouter.get('/', async (req, res) => {
  const { limit, offset } = req.query;
  const rows = await db.query.rules.findMany({
    where: eq(rules.userId, getUserId(req)),
    orderBy: [desc(rules.createdAt), desc(rules.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
  });
  res.json(rows);
});

rulesRouter.post('/', async (req, res) => {
  const input = parseNewRule(req.body);
  if (!input) {
    res.status(400).json({ error: 'categoryId, matchField, and pattern are required' });
    return;
  }

  const category = await findOwned(
    (args) => db.query.categories.findFirst(args),
    categories.id,
    categories.userId,
    input.categoryId,
    getUserId(req),
  );
  if (!category) {
    res.status(400).json({ error: 'categoryId not found' });
    return;
  }

  const rule = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(rules)
      .values({ ...input, userId: getUserId(req) })
      .returning();
    if (!inserted) {
      throw new Error('failed to create rule');
    }
    await backfillCategories(tx, getUserId(req));
    return inserted;
  });
  res.status(201).json(rule);
});

rulesRouter.get('/:id', async (req, res) => {
  const rule = await findOwned(
    (args) => db.query.rules.findFirst(args),
    rules.id,
    rules.userId,
    req.params.id,
    getUserId(req),
  );
  if (!rule) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }
  res.json(rule);
});

rulesRouter.patch('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.rules.findFirst(args),
    rules.id,
    rules.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }

  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'request body must be an object' });
    return;
  }

  const patch: Partial<NewRule> = {};
  if ('categoryId' in req.body) {
    if (typeof req.body.categoryId !== 'string') {
      res.status(400).json({ error: 'categoryId must be a string' });
      return;
    }
    const category = await findOwned(
      (args) => db.query.categories.findFirst(args),
      categories.id,
      categories.userId,
      req.body.categoryId,
      getUserId(req),
    );
    if (!category) {
      res.status(400).json({ error: 'categoryId not found' });
      return;
    }
    patch.categoryId = req.body.categoryId;
  }
  if ('matchField' in req.body) {
    if (!isMatchField(req.body.matchField)) {
      res.status(400).json({ error: 'matchField must be one of description, amount, merchant' });
      return;
    }
    patch.matchField = req.body.matchField;
  }
  if ('pattern' in req.body) {
    if (
      typeof req.body.pattern !== 'string' ||
      !isNonEmptyString(req.body.pattern, PATTERN_MAX_LENGTH)
    ) {
      res.status(400).json({
        error: `pattern must be a non-empty string up to ${String(PATTERN_MAX_LENGTH)} chars`,
      });
      return;
    }
    patch.pattern = req.body.pattern.trim();
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'no valid fields to update' });
    return;
  }

  const rule = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(rules)
      .set(patch)
      .where(eq(rules.id, existing.id))
      .returning();
    if (!updated) {
      return null;
    }
    await backfillCategories(tx, getUserId(req));
    return updated;
  });
  if (!rule) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }
  res.json(rule);
});

rulesRouter.delete('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.rules.findFirst(args),
    rules.id,
    rules.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }
  await db.delete(rules).where(eq(rules.id, existing.id));
  res.status(204).end();
});
