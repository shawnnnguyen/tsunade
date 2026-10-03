import type { ExchangeRateAdapter } from '../../adapter-interfaces/exchange-rate-adapter.js';
import { isRecord } from '../../../is-record.js';
import { loadFixture } from './load-fixture.js';

// Mirrors the real exchangerate.host response shape (verified live): one `source` currency per
// response, a `quotes` map keyed by concatenated pair (e.g. "USDEUR"). The fixture only needs the
// `quotes` field — same as the real adapter, which doesn't check `success`/`timestamp` either.
interface RateQuote {
  quotes: Record<string, number>;
}

type SourceMap = Record<string, RateQuote>;

interface RatesFixture {
  live: SourceMap;
  historical: Record<string, SourceMap>;
}

const parseQuote = (value: unknown): RateQuote => {
  if (!isRecord(value) || !isRecord(value.quotes)) {
    throw new Error('Invalid exchange-rate fixture quote entry');
  }
  const quotes: Record<string, number> = {};
  for (const [pair, rate] of Object.entries(value.quotes)) {
    if (typeof rate !== 'number') {
      throw new Error(`Invalid exchange-rate fixture quote for ${pair}`);
    }
    quotes[pair] = rate;
  }
  return { quotes };
};

const parseSourceMap = (value: unknown): SourceMap => {
  if (!isRecord(value)) {
    throw new Error('Invalid exchange-rate fixture source map');
  }
  const sourceMap: SourceMap = {};
  for (const [source, quote] of Object.entries(value)) {
    sourceMap[source] = parseQuote(quote);
  }
  return sourceMap;
};

const parseRatesFixture = (value: unknown): RatesFixture => {
  if (!isRecord(value) || !isRecord(value.live) || !isRecord(value.historical)) {
    throw new Error('Invalid exchange-rates fixture');
  }
  const live = parseSourceMap(value.live);
  const historical: Record<string, SourceMap> = {};
  for (const [date, sourceMap] of Object.entries(value.historical)) {
    historical[date] = parseSourceMap(sourceMap);
  }
  return { live, historical };
};

let cachedFixture: RatesFixture | undefined;

const getRatesFixture = (): RatesFixture => {
  cachedFixture ??= parseRatesFixture(loadFixture('exchange-rates/rates.json'));
  return cachedFixture;
};

export const createFixtureExchangeRateAdapter = (): ExchangeRateAdapter => ({
  getRate: (from: string, to: string, asOf?: string): Promise<number> => {
    try {
      const fixture = getRatesFixture();
      const dateKey = asOf?.slice(0, 10);
      const sourceMap = dateKey ? fixture.historical[dateKey] : fixture.live;
      if (!sourceMap) {
        throw new Error(`No fixture exchange rates for date ${String(dateKey)}`);
      }
      const quote = sourceMap[from];
      if (!quote) {
        throw new Error(`No fixture exchange rate source ${from}`);
      }
      const pair = `${from}${to}`;
      const rate = quote.quotes[pair];
      if (rate === undefined) {
        throw new Error(`No fixture exchange rate for ${from}->${to}`);
      }
      return Promise.resolve(rate);
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
});
