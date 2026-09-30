export interface ExchangeRateAdapter {
  getRate(from: string, to: string, asOf?: string): Promise<number>;
}
