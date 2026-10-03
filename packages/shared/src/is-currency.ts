import { SUPPORTED_CURRENCIES, type Currency } from './types/user.js';

export const isCurrency = (value: unknown): value is Currency =>
  (SUPPORTED_CURRENCIES as readonly unknown[]).includes(value);
