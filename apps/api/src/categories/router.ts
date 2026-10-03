import { categories, db } from '@tsunade/db';
import { isNonEmptyString, isRecord } from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';

export const categoriesRouter = Router();

const NAME_MAX_LENGTH = 200;

interface NewCategory {
  name: string;
}

const parseNewCategory = (body: unknown): NewCategory | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name } = body;
  if (typeof name !== 'string' || !isNonEmptyString(name, NAME_MAX_LENGTH)) {
    return null;
  }
  return { name: name.trim() };
};

categoriesRouter.get('/', async (req, res) => {
  const { limit, offset } = req.query;
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, getUserId(req)),
    orderBy: [desc(categories.createdAt), desc(categories.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
  });
  res.json(rows);
});

categoriesRouter.post('/', async (req, res) => {
  const input = parseNewCategory(req.body);
  if (!input) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const [category] = await db
    .insert(categories)
    .values({ ...input, userId: getUserId(req) })
    .returning();
  if (!category) {
    throw new Error('failed to create category');
  }
  res.status(201).json(category);
});

categoriesRouter.get('/:id', async (req, res) => {
  const category = await findOwned(
    (args) => db.query.categories.findFirst(args),
    categories.id,
    categories.userId,
    req.params.id,
    getUserId(req),
  );
  if (!category) {
    res.status(404).json({ error: 'category not found' });
    return;
  }
  res.json(category);
});

categoriesRouter.delete('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.categories.findFirst(args),
    categories.id,
    categories.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'category not found' });
    return;
  }
  await db.delete(categories).where(eq(categories.id, existing.id));
  res.status(204).end();
});
