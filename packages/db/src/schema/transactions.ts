import { date, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { categories } from './categories.js';
import { users } from './users.js';

export const transactionSourceEnum = pgEnum('transaction_source', ['enable_banking', 'csv']);

export const transactions = pgTable('transactions', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  accountId: uuid()
    .notNull()
    .references(() => accounts.id),
  categoryId: uuid().references(() => categories.id),
  date: date().notNull(),
  description: text().notNull(),
  cleanedDescription: text(),
  amount: numeric({ precision: 19, scale: 4 }).notNull(),
  currency: text().notNull(),
  source: transactionSourceEnum().notNull(),
  enableBankingTransactionId: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
