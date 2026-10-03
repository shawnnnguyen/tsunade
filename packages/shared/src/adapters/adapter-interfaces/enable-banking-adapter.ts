export interface EnableBankingBalance {
  enableBankingAccountId: string;
  name: string;
  type: string;
  currentBalance: string;
  currency: string;
}

export interface EnableBankingTransaction {
  enableBankingTransactionId: string;
  enableBankingAccountId: string;
  date: string;
  description: string;
  amount: string;
  currency: string;
}

export interface EnableBankingSyncResult {
  transactions: EnableBankingTransaction[];
  cursor: string;
  hasMore: boolean;
}

export interface EnableBankingAdapter {
  getBalances(accessToken: string): Promise<EnableBankingBalance[]>;
  syncTransactions(accessToken: string, cursor?: string): Promise<EnableBankingSyncResult>;
}
