export const SUPPORTED_CURRENCIES = ['EUR', 'USD'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface User {
  id: string;
  email: string;
  baseCurrency: Currency;
  createdAt: string;
}
