import { categories, db } from '@tsunade/db';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

interface NewCategory {
  name: string;
  parentId: string | null;
}

const parseNewCategory = (body: unknown): NewCategory | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name, parentId } = body;
  if (typeof name !== 'string') {
    return null;
  }
  if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
    return null;
  }
  return { name, parentId: parentId ?? null };
};

categoriesRouter.get('/', async (req, res) => {
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, req.userId),
  });
  res.json(rows);
});

categoriesRouter.post('/', async (req, res) => {
  const input = parseNewCategory(req.body);
  if (!input) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  if (input.parentId !== null) {
    const parent = await db.query.categories.findFirst({
      where: and(eq(categories.id, input.parentId), eq(categories.userId, req.userId)),
    });
    if (!parent) {
      res.status(400).json({ error: 'parentId not found' });
      return;
    }
  }

  const [category] = await db
    .insert(categories)
    .values({ ...input, userId: req.userId })
    .returning();
  if (!category) {
    throw new Error('failed to create category');
  }
  res.status(201).json(category);
});

categoriesRouter.get('/:id', async (req, res) => {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, req.params.id), eq(categories.userId, req.userId)),
  });
  if (!category) {
    res.status(404).json({ error: 'category not found' });
    return;
  }
  res.json(category);
});

categoriesRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.id, req.params.id), eq(categories.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'category not found' });
    return;
  }

  const patch: Partial<NewCategory> = {};
  if (isRecord(req.body)) {
    if (typeof req.body.name === 'string') {
      patch.name = req.body.name;
    }
    if (req.body.parentId === null || typeof req.body.parentId === 'string') {
      if (req.body.parentId === existing.id) {
        res.status(400).json({ error: 'parentId cannot be its own category' });
        return;
      }
      if (req.body.parentId !== null) {
        const parent = await db.query.categories.findFirst({
          where: and(eq(categories.id, req.body.parentId), eq(categories.userId, req.userId)),
        });
        if (!parent) {
          res.status(400).json({ error: 'parentId not found' });
          return;
        }
      }
      patch.parentId = req.body.parentId;
    }
  }

  const [category] = await db
    .update(categories)
    .set(patch)
    .where(eq(categories.id, existing.id))
    .returning();
  res.json(category);
});

categoriesRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.id, req.params.id), eq(categories.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'category not found' });
    return;
  }
  await db.delete(categories).where(eq(categories.id, existing.id));
  res.status(204).end();
});
