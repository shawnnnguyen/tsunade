export type TransactionSource = 'enable_banking' | 'csv';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  date: string;
  description: string;
  cleanedDescription: string | null;
  merchant: string | null;
  amount: string;
  currency: string;
  source: TransactionSource;
  enableBankingTransactionId: string | null;
  createdAt: string;
}
