import type {
  MarketDataAdapter,
  MarketPrice,
} from '../../adapter-interfaces/market-data-adapter.js';
import { isRecord } from '../../../is-record.js';
import { loadFixture } from './load-fixture.js';
import { parseArray } from './parse-array.js';

const parsePrice = (value: unknown): MarketPrice => {
  if (
    !isRecord(value) ||
    typeof value.symbol !== 'string' ||
    typeof value.price !== 'string' ||
    typeof value.currency !== 'string' ||
    typeof value.asOf !== 'string'
  ) {
    throw new Error('Invalid MarketPrice fixture entry');
  }
  return {
    symbol: value.symbol,
    price: value.price,
    currency: value.currency,
    asOf: value.asOf,
  };
};

let cachedPrices: MarketPrice[] | undefined;

const getPricesFixture = (): MarketPrice[] => {
  cachedPrices ??= parseArray(loadFixture('market-data/prices.json'), parsePrice);
  return cachedPrices;
};

export const createFixtureMarketDataAdapter = (): MarketDataAdapter => ({
  getPrice: (symbol: string): Promise<MarketPrice> => {
    try {
      const price = getPricesFixture().find((p) => p.symbol === symbol);
      if (!price) {
        throw new Error(`No fixture price for symbol ${symbol}`);
      }
      return Promise.resolve({ ...price });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },

  getPrices: (symbols: string[]): Promise<MarketPrice[]> => {
    try {
      const prices = getPricesFixture();
      return Promise.resolve(
        symbols.map((symbol) => {
          const price = prices.find((p) => p.symbol === symbol);
          if (!price) {
            throw new Error(`No fixture price for symbol ${symbol}`);
          }
          return { ...price };
        }),
      );
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
});
