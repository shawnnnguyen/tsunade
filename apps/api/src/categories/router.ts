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

categoriesRouter.patch('/:id', async (req, res) => {
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

  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'request body must be an object' });
    return;
  }

  const patch: Partial<NewCategory> = {};
  if ('name' in req.body) {
    if (typeof req.body.name !== 'string' || !isNonEmptyString(req.body.name, NAME_MAX_LENGTH)) {
      res
        .status(400)
        .json({ error: `name must be a non-empty string up to ${String(NAME_MAX_LENGTH)} chars` });
      return;
    }
    patch.name = req.body.name.trim();
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'no valid fields to update' });
    return;
  }

  const [category] = await db
    .update(categories)
    .set(patch)
    .where(eq(categories.id, existing.id))
    .returning();
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
