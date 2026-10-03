import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { holdings } from './holdings.js';
import { users } from './users.js';

export const valuationSnapshots = pgTable(
  'valuation_snapshots',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    holdingId: uuid()
      .notNull()
      .references(() => holdings.id, { onDelete: 'cascade' }),
    value: numeric({ precision: 19, scale: 4 }).notNull(),
    currency: text().notNull(),
    asOf: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('valuation_snapshots_user_id_idx').on(table.userId)],
);
