import { categories, db, rules } from '@tsunade/db';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const rulesRouter = Router();

rulesRouter.use(requireAuth);

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
  if (typeof categoryId !== 'string' || typeof pattern !== 'string') {
    return null;
  }
  if (!isMatchField(matchField)) {
    return null;
  }
  return { categoryId, matchField, pattern };
};

rulesRouter.get('/', async (req, res) => {
  const rows = await db.query.rules.findMany({
    where: eq(rules.userId, req.userId),
  });
  res.json(rows);
});

rulesRouter.post('/', async (req, res) => {
  const input = parseNewRule(req.body);
  if (!input) {
    res.status(400).json({ error: 'categoryId, matchField, and pattern are required' });
    return;
  }

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, input.categoryId), eq(categories.userId, req.userId)),
  });
  if (!category) {
    res.status(400).json({ error: 'categoryId not found' });
    return;
  }

  const [rule] = await db
    .insert(rules)
    .values({ ...input, userId: req.userId })
    .returning();
  if (!rule) {
    throw new Error('failed to create rule');
  }
  res.status(201).json(rule);
});

rulesRouter.get('/:id', async (req, res) => {
  const rule = await db.query.rules.findFirst({
    where: and(eq(rules.id, req.params.id), eq(rules.userId, req.userId)),
  });
  if (!rule) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }
  res.json(rule);
});

rulesRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.rules.findFirst({
    where: and(eq(rules.id, req.params.id), eq(rules.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }

  const patch: Partial<NewRule> = {};
  if (isRecord(req.body)) {
    if (typeof req.body.categoryId === 'string') {
      const category = await db.query.categories.findFirst({
        where: and(eq(categories.id, req.body.categoryId), eq(categories.userId, req.userId)),
      });
      if (!category) {
        res.status(400).json({ error: 'categoryId not found' });
        return;
      }
      patch.categoryId = req.body.categoryId;
    }
    if (isMatchField(req.body.matchField)) {
      patch.matchField = req.body.matchField;
    }
    if (typeof req.body.pattern === 'string') {
      patch.pattern = req.body.pattern;
    }
  }

  const [rule] = await db.update(rules).set(patch).where(eq(rules.id, existing.id)).returning();
  res.json(rule);
});

rulesRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.rules.findFirst({
    where: and(eq(rules.id, req.params.id), eq(rules.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'rule not found' });
    return;
  }
  await db.delete(rules).where(eq(rules.id, existing.id));
  res.status(204).end();
});
