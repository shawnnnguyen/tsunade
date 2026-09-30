export type RuleMatchField = 'description' | 'amount';

export interface Rule {
  id: string;
  userId: string;
  categoryId: string;
  matchField: RuleMatchField;
  pattern: string;
  createdAt: string;
}
