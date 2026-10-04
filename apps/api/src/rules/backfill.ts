import { db, rules, transactions } from '@tsunade/db';
import { matchRule } from '@tsunade/categorization';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

type Executor = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown ? T : never;

const isEligibleForBackfill = and(
  isNull(transactions.categoryId),
  eq(transactions.categoryIsManual, false),
);

export const backfillCategories = async (tx: Executor, userId: string): Promise<void> => {
  const userRules = await tx.query.rules.findMany({
    where: eq(rules.userId, userId),
    orderBy: [desc(rules.createdAt), desc(rules.id)],
  });
  const eligibleTransactions = await tx.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), isEligibleForBackfill),
  });

  const idsByNewCategory = new Map<string, string[]>();
  for (const transaction of eligibleTransactions) {
    const categoryId = matchRule(
      {
        description: transaction.cleanedDescription ?? transaction.description,
        merchant: transaction.merchant,
        amount: transaction.amount,
      },
      userRules,
    );
    if (categoryId !== null) {
      const ids = idsByNewCategory.get(categoryId) ?? [];
      ids.push(transaction.id);
      idsByNewCategory.set(categoryId, ids);
    }
  }

  for (const [categoryId, ids] of idsByNewCategory) {
    await tx
      .update(transactions)
      .set({ categoryId })
      .where(
        and(inArray(transactions.id, ids), eq(transactions.userId, userId), isEligibleForBackfill),
      );
  }
};
