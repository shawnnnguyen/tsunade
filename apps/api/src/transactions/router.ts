import { categories, db, tags, transactionTags, transactions } from '@tsunade/db';
import { isRecord } from '@tsunade/shared';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', async (req, res) => {
  const { accountId, categoryId, dateFrom, dateTo, minAmount, maxAmount, limit, offset } =
    req.query;

  const conditions = [eq(transactions.userId, getUserId(req))];
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
    orderBy: [desc(transactions.date), desc(transactions.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
  });
  res.json(rows);
});

transactionsRouter.patch('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.transactions.findFirst(args),
    transactions.id,
    transactions.userId,
    req.params.id,
    getUserId(req),
  );
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
    const category = await findOwned(
      (args) => db.query.categories.findFirst(args),
      categories.id,
      categories.userId,
      categoryId,
      getUserId(req),
    );
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
  if (!transaction) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }
  res.json(transaction);
});

transactionsRouter.get('/:id/tags', async (req, res) => {
  const transaction = await findOwned(
    (args) => db.query.transactions.findFirst(args),
    transactions.id,
    transactions.userId,
    req.params.id,
    getUserId(req),
  );
  if (!transaction) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }

  const rows = await db
    .select({ id: tags.id, userId: tags.userId, name: tags.name, createdAt: tags.createdAt })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(and(eq(transactionTags.transactionId, transaction.id), eq(tags.userId, getUserId(req))));
  res.json(rows);
});

transactionsRouter.post('/:id/tags', async (req, res) => {
  const transaction = await findOwned(
    (args) => db.query.transactions.findFirst(args),
    transactions.id,
    transactions.userId,
    req.params.id,
    getUserId(req),
  );
  if (!transaction) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }

  if (!isRecord(req.body) || typeof req.body.tagId !== 'string' || req.body.tagId === '') {
    res.status(400).json({ error: 'tagId is required' });
    return;
  }
  const { tagId } = req.body;

  const tag = await findOwned(
    (args) => db.query.tags.findFirst(args),
    tags.id,
    tags.userId,
    tagId,
    getUserId(req),
  );
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
    .values({ transactionId: transaction.id, tagId, userId: getUserId(req) })
    .returning();
  if (!transactionTag) {
    throw new Error('failed to attach tag');
  }
  res.status(201).json(tag);
});

transactionsRouter.delete('/:id/tags/:tagId', async (req, res) => {
  const transaction = await findOwned(
    (args) => db.query.transactions.findFirst(args),
    transactions.id,
    transactions.userId,
    req.params.id,
    getUserId(req),
  );
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
