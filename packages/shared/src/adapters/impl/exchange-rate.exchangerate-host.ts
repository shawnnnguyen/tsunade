import type { ExchangeRateAdapter } from '../adapter-interfaces/exchange-rate-adapter.js';
import { isRecord } from '../../is-record.js';

export const createExchangeRateHostAdapter = (
  apiKey: string,
  baseUrl: string,
): ExchangeRateAdapter => ({
  getRate: async (from: string, to: string, asOf?: string): Promise<number> => {
    const key = encodeURIComponent(apiKey);
    const source = encodeURIComponent(from);
    const currencies = encodeURIComponent(to);
    const url = asOf
      ? `${baseUrl}/historical?date=${encodeURIComponent(asOf.slice(0, 10))}&source=${source}&currencies=${currencies}&access_key=${key}`
      : `${baseUrl}/live?source=${source}&currencies=${currencies}&access_key=${key}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `exchangerate.host request failed for ${from}->${to}: ${String(response.status)}`,
      );
    }
    const body: unknown = await response.json();
    const pair = `${from}${to}`;
    if (!isRecord(body) || !isRecord(body.quotes) || typeof body.quotes[pair] !== 'number') {
      throw new Error(`Unexpected exchangerate.host response for ${from}->${to}`);
    }
    return body.quotes[pair];
  },
});
