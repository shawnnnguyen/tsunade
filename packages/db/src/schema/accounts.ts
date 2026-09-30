import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const accountSourceEnum = pgEnum('account_source', ['enable_banking', 'manual']);

export const accounts = pgTable('accounts', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  name: text().notNull(),
  type: text().notNull(),
  source: accountSourceEnum().notNull(),
  enableBankingAccountId: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
