import type { ExchangeRateAdapter } from '../adapter-interfaces/exchange-rate-adapter.js';
import type { MarketDataAdapter } from '../adapter-interfaces/market-data-adapter.js';
import { createExchangeRateHostAdapter } from './exchange-rate.exchangerate-host.js';
import { createFixtureExchangeRateAdapter } from './fixtures/exchange-rate.fixture.js';
import { createFixtureMarketDataAdapter } from './fixtures/market-data.fixture.js';
import { createFinnhubMarketDataAdapter } from './market-data.finnhub.js';

export const createMarketDataAdapter = (): MarketDataAdapter => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return createFixtureMarketDataAdapter();
  }
  const baseUrl = process.env.FINNHUB_API_BASE_URL ?? 'https://finnhub.io/api/v1';
  return createFinnhubMarketDataAdapter(apiKey, baseUrl);
};

export const createExchangeRateAdapter = (): ExchangeRateAdapter => {
  const apiKey = process.env.EXCHANGERATE_HOST_API_KEY;
  if (!apiKey) {
    return createFixtureExchangeRateAdapter();
  }
  const baseUrl = process.env.EXCHANGERATE_HOST_API_BASE_URL ?? 'https://api.exchangerate.host';
  return createExchangeRateHostAdapter(apiKey, baseUrl);
};
