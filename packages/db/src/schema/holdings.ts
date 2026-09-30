import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const holdings = pgTable('holdings', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  accountId: uuid()
    .notNull()
    .references(() => accounts.id),
  symbol: text().notNull(),
  quantity: numeric({ precision: 19, scale: 8 }).notNull(),
  costBasis: numeric({ precision: 19, scale: 4 }).notNull(),
  currency: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
