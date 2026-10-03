import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const assets = pgTable(
  'assets',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    name: text().notNull(),
    type: text().notNull(),
    currentValue: numeric({ precision: 19, scale: 4 }).notNull(),
    currency: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('assets_user_id_idx').on(table.userId)],
);
