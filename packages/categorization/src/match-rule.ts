import type { Rule } from '@tsunade/shared';

import { cleanDescription } from './clean-description.js';

export interface MatchableTransaction {
  description: string;
  merchant: string | null;
  amount: string;
}

type MatchableRule = Pick<Rule, 'categoryId' | 'matchField' | 'pattern'>;

const includesCaseInsensitive = (haystack: string, needle: string): boolean =>
  cleanDescription(haystack).toLowerCase().includes(cleanDescription(needle).toLowerCase());

const ruleMatches = (transaction: MatchableTransaction, rule: MatchableRule): boolean => {
  switch (rule.matchField) {
    case 'description':
      return includesCaseInsensitive(transaction.description, rule.pattern);
    case 'merchant':
      return (
        transaction.merchant !== null && includesCaseInsensitive(transaction.merchant, rule.pattern)
      );
    case 'amount': {
      const transactionAmount = Number(transaction.amount);
      const patternAmount = Number(rule.pattern);
      return (
        Number.isFinite(transactionAmount) &&
        Number.isFinite(patternAmount) &&
        transactionAmount === patternAmount
      );
    }
  }
};

export const matchRule = (
  transaction: MatchableTransaction,
  rules: MatchableRule[],
): string | null => {
  for (const rule of rules) {
    if (ruleMatches(transaction, rule)) {
      return rule.categoryId;
    }
  }
  return null;
};
