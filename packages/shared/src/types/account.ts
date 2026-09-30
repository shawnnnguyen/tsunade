export type AccountSource = 'enable_banking' | 'manual';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: string;
  source: AccountSource;
  enableBankingAccountId: string | null;
  createdAt: string;
}
