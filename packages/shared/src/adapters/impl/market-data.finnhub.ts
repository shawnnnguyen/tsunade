import type { MarketDataAdapter, MarketPrice } from '../adapter-interfaces/market-data-adapter.js';
import { isRecord } from '../../is-record.js';

export const createFinnhubMarketDataAdapter = (
  apiKey: string,
  baseUrl: string,
): MarketDataAdapter => {
  const getPrice = async (symbol: string): Promise<MarketPrice> => {
    const token = encodeURIComponent(apiKey);
    const quoteUrl = `${baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const profileUrl = `${baseUrl}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const [quoteResponse, profileResponse] = await Promise.all([
      fetch(quoteUrl),
      fetch(profileUrl).catch(() => undefined),
    ]);
    if (!quoteResponse.ok) {
      throw new Error(
        `Finnhub quote request failed for ${symbol}: ${String(quoteResponse.status)}`,
      );
    }
    const quote: unknown = await quoteResponse.json();
    if (
      !isRecord(quote) ||
      typeof quote.c !== 'number' ||
      typeof quote.h !== 'number' ||
      typeof quote.l !== 'number'
    ) {
      throw new Error(`Unexpected Finnhub quote response for ${symbol}`);
    }
    if (quote.c === 0 && quote.h === 0 && quote.l === 0) {
      throw new Error(`Unknown symbol ${symbol}`);
    }

    let currency = 'USD';
    if (profileResponse?.ok) {
      const profile: unknown = await profileResponse.json();
      if (isRecord(profile) && typeof profile.currency === 'string') {
        currency = profile.currency;
      }
    }

    return {
      symbol,
      price: quote.c.toString(),
      currency,
      asOf: new Date().toISOString(),
    };
  };

  return {
    getPrice,
    getPrices: (symbols: string[]) => Promise.all(symbols.map(getPrice)),
  };
};
