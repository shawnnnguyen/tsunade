import { isNumericString } from '@tsunade/shared';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const parseLimit = (value: unknown): number => {
  if (typeof value !== 'string' || !isNumericString(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Number.parseInt(value, 10), 0), MAX_LIMIT);
};

export const parseOffset = (value: unknown): number => {
  if (typeof value !== 'string' || !isNumericString(value)) {
    return 0;
  }
  return Math.max(Number.parseInt(value, 10), 0);
};
