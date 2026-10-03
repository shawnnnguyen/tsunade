import { assetValueLogs, assets, db } from '@tsunade/db';
import {
  isCurrency,
  isNonEmptyString,
  isNumericString,
  isRecord,
  isWithinNumericBounds,
} from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { parseLimit, parseOffset } from '../lib/pagination.js';

export const assetsRouter = Router();

const NAME_MAX_LENGTH = 200;
const TYPE_MAX_LENGTH = 100;
const VALUE_PRECISION = 19;
const VALUE_SCALE = 4;

interface NewAsset {
  name: string;
  type: string;
  currentValue: string;
  currency: string;
}

interface AssetPatch {
  name: string;
  type: string;
}

interface NewAssetValueLog {
  value: string;
  currency: string;
  asOf: string;
}

const parseNewAsset = (body: unknown): NewAsset | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { name, type, currentValue, currency } = body;
  if (
    typeof name !== 'string' ||
    !isNonEmptyString(name, NAME_MAX_LENGTH) ||
    typeof type !== 'string' ||
    !isNonEmptyString(type, TYPE_MAX_LENGTH) ||
    typeof currentValue !== 'string' ||
    !isNumericString(currentValue) ||
    !isWithinNumericBounds(currentValue, VALUE_PRECISION, VALUE_SCALE) ||
    !isCurrency(currency)
  ) {
    return null;
  }
  return { name: name.trim(), type: type.trim(), currentValue, currency };
};

const parseNewAssetValueLog = (body: unknown): NewAssetValueLog | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { value, currency, asOf } = body;
  if (
    typeof value !== 'string' ||
    !isNumericString(value) ||
    !isWithinNumericBounds(value, VALUE_PRECISION, VALUE_SCALE) ||
    !isCurrency(currency) ||
    typeof asOf !== 'string'
  ) {
    return null;
  }
  const parsedAsOf = Date.parse(asOf);
  if (Number.isNaN(parsedAsOf) || parsedAsOf > Date.now()) {
    return null;
  }
  return { value, currency, asOf };
};

assetsRouter.get('/', async (req, res) => {
  const { limit, offset } = req.query;
  const rows = await db.query.assets.findMany({
    where: eq(assets.userId, getUserId(req)),
    orderBy: [desc(assets.createdAt), desc(assets.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
  });
  res.json(rows);
});

assetsRouter.post('/', async (req, res) => {
  const input = parseNewAsset(req.body);
  if (!input) {
    res.status(400).json({ error: 'name, type, currentValue, and currency are required' });
    return;
  }

  const [asset] = await db
    .insert(assets)
    .values({ ...input, userId: getUserId(req) })
    .returning();
  if (!asset) {
    throw new Error('failed to create asset');
  }
  res.status(201).json(asset);
});

assetsRouter.get('/:id', async (req, res) => {
  const asset = await findOwned(
    (args) => db.query.assets.findFirst(args),
    assets.id,
    assets.userId,
    req.params.id,
    getUserId(req),
  );
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }
  res.json(asset);
});

assetsRouter.patch('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.assets.findFirst(args),
    assets.id,
    assets.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }

  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'request body must be an object' });
    return;
  }

  const patch: Partial<AssetPatch> = {};
  const maxLengths = { name: NAME_MAX_LENGTH, type: TYPE_MAX_LENGTH };
  for (const field of ['name', 'type'] as const) {
    if (field in req.body) {
      const value = req.body[field];
      if (typeof value !== 'string' || !isNonEmptyString(value, maxLengths[field])) {
        res.status(400).json({
          error: `${field} must be a non-empty string up to ${String(maxLengths[field])} chars`,
        });
        return;
      }
      patch[field] = value.trim();
    }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'no valid fields to update' });
    return;
  }

  const [asset] = await db.update(assets).set(patch).where(eq(assets.id, existing.id)).returning();
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }
  res.json(asset);
});

assetsRouter.delete('/:id', async (req, res) => {
  const existing = await findOwned(
    (args) => db.query.assets.findFirst(args),
    assets.id,
    assets.userId,
    req.params.id,
    getUserId(req),
  );
  if (!existing) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }
  await db.delete(assets).where(eq(assets.id, existing.id));
  res.status(204).end();
});

assetsRouter.get('/:id/value-log', async (req, res) => {
  const asset = await findOwned(
    (args) => db.query.assets.findFirst(args),
    assets.id,
    assets.userId,
    req.params.id,
    getUserId(req),
  );
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }

  const { limit, offset } = req.query;
  const rows = await db.query.assetValueLogs.findMany({
    where: eq(assetValueLogs.assetId, asset.id),
    orderBy: [desc(assetValueLogs.asOf), desc(assetValueLogs.createdAt), desc(assetValueLogs.id)],
    limit: parseLimit(limit),
    offset: parseOffset(offset),
  });
  res.json(rows);
});

assetsRouter.post('/:id/value-log', async (req, res) => {
  const asset = await findOwned(
    (args) => db.query.assets.findFirst(args),
    assets.id,
    assets.userId,
    req.params.id,
    getUserId(req),
  );
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }

  const input = parseNewAssetValueLog(req.body);
  if (!input) {
    res.status(400).json({ error: 'value, currency, and asOf are required' });
    return;
  }

  const log = await db.transaction(async (tx) => {
    await tx.select().from(assets).where(eq(assets.id, asset.id)).for('update');

    const [log] = await tx
      .insert(assetValueLogs)
      .values({ ...input, asOf: new Date(input.asOf), assetId: asset.id, userId: getUserId(req) })
      .returning();
    if (!log) {
      throw new Error('failed to create asset value log');
    }

    const latest = await tx.query.assetValueLogs.findFirst({
      where: eq(assetValueLogs.assetId, asset.id),
      orderBy: [desc(assetValueLogs.asOf), desc(assetValueLogs.createdAt), desc(assetValueLogs.id)],
    });
    if (latest?.id === log.id) {
      await tx
        .update(assets)
        .set({ currentValue: input.value, currency: input.currency })
        .where(eq(assets.id, asset.id));
    }

    return log;
  });

  res.status(201).json(log);
});
