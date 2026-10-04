import { accounts, db, rules, transactions } from '@tsunade/db';
import { cleanDescription, matchRule } from '@tsunade/categorization';
import {
  isCurrency,
  isNonEmptyString,
  isNumericString,
  isRecord,
  isWithinNumericBounds,
} from '@tsunade/shared';
import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';

import { getUserId } from '../auth/middleware.js';
import { findOwned } from '../lib/find-owned.js';
import { normalizeCsvDate, parseCsvPreview, parseCsvRows } from './csv.js';

export const importsRouter = Router();

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DESCRIPTION_MAX_LENGTH = 500;
const MERCHANT_MAX_LENGTH = 200;
const AMOUNT_PRECISION = 19;
const AMOUNT_SCALE = 4;
const INSERT_CHUNK_SIZE = 1000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 8, parts: 10, fieldSize: 64 * 1024 },
});

interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
  merchant?: number;
}

const parseColumnMapping = (raw: unknown): ColumnMapping | null => {
  if (typeof raw !== 'string') {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const { date, description, amount, merchant } = parsed;
  if (typeof date !== 'number' || typeof description !== 'number' || typeof amount !== 'number') {
    return null;
  }
  if (merchant !== undefined && typeof merchant !== 'number') {
    return null;
  }
  return { date, description, amount, ...(merchant !== undefined && { merchant }) };
};

importsRouter.post('/csv/preview', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  const preview = parseCsvPreview(req.file.buffer);
  if (!preview) {
    res.status(400).json({ error: 'csv file could not be parsed' });
    return;
  }
  res.json(preview);
});

importsRouter.post('/csv/commit', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'request body must be an object' });
    return;
  }

  const { accountId, currency } = req.body;
  if (typeof accountId !== 'string' || typeof currency !== 'string' || !isCurrency(currency)) {
    res.status(400).json({ error: 'accountId and a supported currency are required' });
    return;
  }

  const mapping = parseColumnMapping(req.body.mapping);
  if (!mapping) {
    res.status(400).json({
      error:
        'mapping must map date, description, amount (and optionally merchant) to column indices',
    });
    return;
  }

  const rows = parseCsvRows(req.file.buffer);
  if (rows === null) {
    res.status(400).json({ error: 'csv file could not be parsed' });
    return;
  }

  const account = await findOwned(
    (args) => db.query.accounts.findFirst(args),
    accounts.id,
    accounts.userId,
    accountId,
    getUserId(req),
  );
  if (!account) {
    res.status(400).json({ error: 'accountId not found' });
    return;
  }

  const userRules = await db.query.rules.findMany({
    where: eq(rules.userId, getUserId(req)),
    orderBy: [desc(rules.createdAt), desc(rules.id)],
  });

  const newTransactions: (typeof transactions.$inferInsert)[] = [];
  const errors: { row: number; reason: string }[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for the header row, +1 to make it 1-indexed
    const date = row[mapping.date];
    const description = row[mapping.description];
    const amount = row[mapping.amount];
    const merchant = mapping.merchant !== undefined ? row[mapping.merchant] : undefined;

    if (date === undefined || date === '') {
      errors.push({ row: rowNumber, reason: 'date is required' });
      return;
    }
    const normalizedDate = normalizeCsvDate(date);
    if (normalizedDate === null) {
      errors.push({ row: rowNumber, reason: 'date is not a valid date' });
      return;
    }
    if (description === undefined || !isNonEmptyString(description, DESCRIPTION_MAX_LENGTH)) {
      errors.push({
        row: rowNumber,
        reason: `description must be a non-empty string up to ${String(DESCRIPTION_MAX_LENGTH)} chars`,
      });
      return;
    }
    if (
      amount === undefined ||
      !isNumericString(amount) ||
      !isWithinNumericBounds(amount, AMOUNT_PRECISION, AMOUNT_SCALE)
    ) {
      errors.push({ row: rowNumber, reason: 'amount must be a numeric string within range' });
      return;
    }
    if (
      merchant !== undefined &&
      merchant !== '' &&
      !isNonEmptyString(merchant, MERCHANT_MAX_LENGTH)
    ) {
      errors.push({
        row: rowNumber,
        reason: `merchant must be up to ${String(MERCHANT_MAX_LENGTH)} chars`,
      });
      return;
    }

    const merchantValue = merchant !== undefined && merchant !== '' ? merchant.trim() : null;
    const cleanedDescription = cleanDescription(description);
    const categoryId = matchRule(
      { description: cleanedDescription, merchant: merchantValue, amount },
      userRules,
    );

    newTransactions.push({
      userId: getUserId(req),
      accountId,
      categoryId,
      categoryIsManual: false,
      date: normalizedDate,
      description: description.trim(),
      cleanedDescription,
      merchant: merchantValue,
      amount,
      currency,
      source: 'csv',
    });
  });

  for (let i = 0; i < newTransactions.length; i += INSERT_CHUNK_SIZE) {
    await db.insert(transactions).values(newTransactions.slice(i, i + INSERT_CHUNK_SIZE));
  }

  res.status(201).json({ created: newTransactions.length, errors });
});
