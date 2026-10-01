import { categories, db, tags, transactionTags, transactions } from '@tsunade/db';
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

transactionsRouter.get('/:id/tags', async (req, res) => {
  const transaction = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, req.params.id), eq(transactions.userId, req.userId)),
  });
  if (!transaction) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }

  const rows = await db
    .select({ id: tags.id, userId: tags.userId, name: tags.name, createdAt: tags.createdAt })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(eq(transactionTags.transactionId, transaction.id));
  res.json(rows);
});

transactionsRouter.post('/:id/tags', async (req, res) => {
  const transaction = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, req.params.id), eq(transactions.userId, req.userId)),
  });
  if (!transaction) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }

  if (!isRecord(req.body) || typeof req.body.tagId !== 'string' || req.body.tagId === '') {
    res.status(400).json({ error: 'tagId is required' });
    return;
  }
  const { tagId } = req.body;

  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, req.userId)),
  });
  if (!tag) {
    res.status(400).json({ error: 'tagId not found' });
    return;
  }

  const existingAttachment = await db.query.transactionTags.findFirst({
    where: and(eq(transactionTags.transactionId, transaction.id), eq(transactionTags.tagId, tagId)),
  });
  if (existingAttachment) {
    res.status(409).json({ error: 'tag already attached to transaction' });
    return;
  }

  const [transactionTag] = await db
    .insert(transactionTags)
    .values({ transactionId: transaction.id, tagId, userId: req.userId })
    .returning();
  if (!transactionTag) {
    throw new Error('failed to attach tag');
  }
  res.status(201).json(tag);
});

transactionsRouter.delete('/:id/tags/:tagId', async (req, res) => {
  const transaction = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, req.params.id), eq(transactions.userId, req.userId)),
  });
  if (!transaction) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }

  const existing = await db.query.transactionTags.findFirst({
    where: and(
      eq(transactionTags.transactionId, transaction.id),
      eq(transactionTags.tagId, req.params.tagId),
    ),
  });
  if (!existing) {
    res.status(404).json({ error: 'tag not attached to transaction' });
    return;
  }

  await db.delete(transactionTags).where(eq(transactionTags.id, existing.id));
  res.status(204).end();
});
