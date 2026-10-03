import { isRecord } from '@tsunade/shared';
import type { NextFunction, Request, Response } from 'express';

const isPgError = (err: unknown): err is { code: string; table?: string; detail?: string } =>
  isRecord(err) && typeof err.code === 'string' && typeof err.severity === 'string';

const isHttpError = (err: unknown): err is { status?: number; statusCode?: number } =>
  isRecord(err) && (typeof err.status === 'number' || typeof err.statusCode === 'number');

const isDrizzleQueryError = (
  err: unknown,
): err is { query: unknown; params: unknown; cause?: unknown } =>
  isRecord(err) && 'query' in err && 'params' in err;

const PG_ERROR_STATUS: Record<string, number> = {
  '23503': 409, // foreign_key_violation
  '23505': 409, // unique_violation
  '22P02': 400, // invalid_text_representation (bad uuid/numeric/enum literal)
  '22007': 400, // invalid_datetime_format
  '22008': 400, // invalid_datetime_format
  '22003': 400, // numeric_value_out_of_range
  '22021': 400, // character_not_in_repertoire (e.g. a NUL byte in text)
};

const FOREIGN_KEY_CONFLICT_REASON: Record<string, string> = {
  rules: 'category_in_use_by_rule',
  transactions: 'account_in_use_by_transaction',
  holdings: 'account_in_use_by_holding',
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const pgError = isPgError(err)
    ? err
    : err instanceof Error && isPgError(err.cause)
      ? err.cause
      : undefined;
  if (pgError) {
    const status = PG_ERROR_STATUS[pgError.code];
    if (status !== undefined) {
      if (pgError.code === '23503') {
        const isBlockedDelete = pgError.detail?.includes('is still referenced from table');
        if (!isBlockedDelete) {
          res.status(400).json({ error: 'invalid request' });
          return;
        }
        const reason =
          pgError.table !== undefined ? FOREIGN_KEY_CONFLICT_REASON[pgError.table] : undefined;
        res.status(status).json({ error: 'conflict', ...(reason !== undefined && { reason }) });
        return;
      }
      res.status(status).json({ error: status === 409 ? 'conflict' : 'invalid request' });
      return;
    }
  }

  if (isHttpError(err)) {
    const status = err.status ?? err.statusCode;
    if (status !== undefined && status >= 400 && status < 500) {
      res.status(status).json({ error: 'invalid request' });
      return;
    }
  }

  if (pgError) {
    console.error('unhandled database error', pgError.code);
  } else if (isDrizzleQueryError(err)) {
    console.error(
      'unhandled database error',
      err.cause instanceof Error ? err.cause.message : 'unknown cause',
    );
  } else {
    console.error(err);
  }
  res.status(500).json({ error: 'internal server error' });
};
