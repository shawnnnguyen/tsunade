import { db, tags } from '@tsunade/db';
import { isNonEmptyString, isRecord } from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';

export const tagsRouter = Router();

const NAME_MAX_LENGTH = 200;

interface NewTag {
  name: string;
}

const parseNewTag = (body: unknown): NewTag | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name } = body;
  if (typeof name !== 'string' || !isNonEmptyString(name, NAME_MAX_LENGTH)) {
    return null;
  }
  return { name: name.trim() };
};

tagsRouter.get('/', async (req, res) => {
  const { limit, offset } = req.query;
  const rows = await db.query.tags.findMany({
    where: eq(tags.userId, getUserId(req)),
    orderBy: [desc(tags.createdAt), desc(tags.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
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
    .values({ ...input, userId: getUserId(req) })
    .returning();
  if (!tag) {
    throw new Error('failed to create tag');
  }
  res.status(201).json(tag);
});

tagsRouter.get('/:id', async (req, res) => {
  const tag = await findOwned(
    (args) => db.query.tags.findFirst(args),
    tags.id,
    tags.userId,
    req.params.id,
    getUserId(req),
  );
  if (!tag) {
    res.status(404).json({ error: 'tag not found' });
    return;
  }
  res.json(tag);
});

tagsRouter.delete('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.tags.findFirst(args),
    tags.id,
    tags.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'tag not found' });
    return;
  }
  await db.delete(tags).where(eq(tags.id, existing.id));
  res.status(204).end();
});
