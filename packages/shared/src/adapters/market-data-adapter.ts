export interface MarketPrice {
  symbol: string;
  price: string;
  currency: string;
  asOf: string;
}

export interface MarketDataAdapter {
  getPrice(symbol: string): Promise<MarketPrice>;
  getPrices(symbols: string[]): Promise<MarketPrice[]>;
}
