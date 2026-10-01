import { categories, db, transactions } from '@tsunade/db';
import { and, eq, gte, lte } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

transactionsRouter.get('/', async (req, res) => {
  const { accountId, categoryId, dateFrom, dateTo, minAmount, maxAmount } = req.query;

  const conditions = [eq(transactions.userId, req.userId)];
  if (typeof accountId === 'string') {
    conditions.push(eq(transactions.accountId, accountId));
  }
  if (typeof categoryId === 'string') {
    conditions.push(eq(transactions.categoryId, categoryId));
  }
  if (typeof dateFrom === 'string') {
    conditions.push(gte(transactions.date, dateFrom));
  }
  if (typeof dateTo === 'string') {
    conditions.push(lte(transactions.date, dateTo));
  }
  if (typeof minAmount === 'string') {
    conditions.push(gte(transactions.amount, minAmount));
  }
  if (typeof maxAmount === 'string') {
    conditions.push(lte(transactions.amount, maxAmount));
  }

  const rows = await db.query.transactions.findMany({
    where: and(...conditions),
  });
  res.json(rows);
});

transactionsRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, req.params.id), eq(transactions.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }

  if (!isRecord(req.body) || !('categoryId' in req.body)) {
    res.status(400).json({ error: 'categoryId is required' });
    return;
  }

  const { categoryId } = req.body;
  if (categoryId !== null && typeof categoryId !== 'string') {
    res.status(400).json({ error: 'categoryId must be a string or null' });
    return;
  }

  if (categoryId !== null) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.userId, req.userId)),
    });
    if (!category) {
      res.status(400).json({ error: 'categoryId not found' });
      return;
    }
  }

  const [transaction] = await db
    .update(transactions)
    .set({ categoryId })
    .where(eq(transactions.id, existing.id))
    .returning();
  res.json(transaction);
});
