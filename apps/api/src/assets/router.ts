import { assetValueLogs, assets, db } from '@tsunade/db';
import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { isRecord } from '../lib/is-record.js';

export const assetsRouter = Router();

assetsRouter.use(requireAuth);

interface NewAsset {
  name: string;
  type: string;
  currentValue: string;
  currency: string;
}

interface AssetPatch {
  name: string;
  type: string;
  currency: string;
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
    typeof type !== 'string' ||
    typeof currentValue !== 'string' ||
    typeof currency !== 'string'
  ) {
    return null;
  }
  return { name, type, currentValue, currency };
};

const parseNewAssetValueLog = (body: unknown): NewAssetValueLog | null => {
  if (!isRecord(body)) {
    return null;
  }
  const { value, currency, asOf } = body;
  if (typeof value !== 'string' || typeof currency !== 'string' || typeof asOf !== 'string') {
    return null;
  }
  return { value, currency, asOf };
};

assetsRouter.get('/', async (req, res) => {
  const rows = await db.query.assets.findMany({
    where: eq(assets.userId, req.userId),
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
    .values({ ...input, userId: req.userId })
    .returning();
  if (!asset) {
    throw new Error('failed to create asset');
  }
  res.status(201).json(asset);
});

assetsRouter.get('/:id', async (req, res) => {
  const asset = await db.query.assets.findFirst({
    where: and(eq(assets.id, req.params.id), eq(assets.userId, req.userId)),
  });
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }
  res.json(asset);
});

assetsRouter.patch('/:id', async (req, res) => {
  const existing = await db.query.assets.findFirst({
    where: and(eq(assets.id, req.params.id), eq(assets.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }

  const patch: Partial<AssetPatch> = {};
  if (isRecord(req.body)) {
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.type === 'string') patch.type = req.body.type;
    if (typeof req.body.currency === 'string') patch.currency = req.body.currency;
  }

  const [asset] = await db.update(assets).set(patch).where(eq(assets.id, existing.id)).returning();
  res.json(asset);
});

assetsRouter.delete('/:id', async (req, res) => {
  const existing = await db.query.assets.findFirst({
    where: and(eq(assets.id, req.params.id), eq(assets.userId, req.userId)),
  });
  if (!existing) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }
  await db.delete(assets).where(eq(assets.id, existing.id));
  res.status(204).end();
});

assetsRouter.get('/:id/value-log', async (req, res) => {
  const asset = await db.query.assets.findFirst({
    where: and(eq(assets.id, req.params.id), eq(assets.userId, req.userId)),
  });
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }

  const rows = await db.query.assetValueLogs.findMany({
    where: eq(assetValueLogs.assetId, asset.id),
    orderBy: desc(assetValueLogs.asOf),
  });
  res.json(rows);
});

assetsRouter.post('/:id/value-log', async (req, res) => {
  const asset = await db.query.assets.findFirst({
    where: and(eq(assets.id, req.params.id), eq(assets.userId, req.userId)),
  });
  if (!asset) {
    res.status(404).json({ error: 'asset not found' });
    return;
  }

  const input = parseNewAssetValueLog(req.body);
  if (!input) {
    res.status(400).json({ error: 'value, currency, and asOf are required' });
    return;
  }

  const [log] = await db
    .insert(assetValueLogs)
    .values({ ...input, asOf: new Date(input.asOf), assetId: asset.id, userId: req.userId })
    .returning();
  if (!log) {
    throw new Error('failed to create asset value log');
  }

  await db
    .update(assets)
    .set({ currentValue: input.value, currency: input.currency })
    .where(eq(assets.id, asset.id));

  res.status(201).json(log);
});
