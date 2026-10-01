import { db, tags } from '@tsunade/db';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const tagsRouter = Router();

tagsRouter.use(requireAuth);

interface NewTag {
  name: string;
}

const parseNewTag = (body: unknown): NewTag | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name } = body;
  if (typeof name !== 'string') {
    return null;
  }
  return { name };
};

tagsRouter.get('/', async (req, res) => {
  const rows = await db.query.tags.findMany({
    where: eq(tags.userId, req.userId),
  });
  res.json(rows);
});

tagsRouter.post('/', async (req, res) => {
  const input = parseNewTag(req.body);
  if (!input) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const [tag] = await db
    .insert(tags)
    .values({ ...input, userId: req.userId })
    .returning();
  if (!tag) {
    throw new Error('failed to create tag');
  }
  res.status(201).json(tag);
});

tagsRouter.get('/:id', async (req, res) => {
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, req.params.id), eq(tags.userId, req.userId)),
  });
  if (!tag) {
    res.status(404).json({ error: 'tag not found' });
    return;
  }
  res.json(tag);
});

tagsRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.id, req.params.id), eq(tags.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'tag not found' });
    return;
  }

  const patch: Partial<NewTag> = {};
  if (isRecord(req.body) && typeof req.body.name === 'string') {
    patch.name = req.body.name;
  }

  const [tag] = await db.update(tags).set(patch).where(eq(tags.id, existing.id)).returning();
  res.json(tag);
});

tagsRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.id, req.params.id), eq(tags.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'tag not found' });
    return;
  }
  await db.delete(tags).where(eq(tags.id, existing.id));
  res.status(204).end();
});
