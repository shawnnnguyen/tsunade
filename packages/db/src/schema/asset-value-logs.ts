import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { assets } from './assets.js';
import { users } from './users.js';

export const assetValueLogs = pgTable(
  'asset_value_logs',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    assetId: uuid()
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    value: numeric({ precision: 19, scale: 4 }).notNull(),
    currency: text().notNull(),
    asOf: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('asset_value_logs_user_id_idx').on(table.userId),
    index('asset_value_logs_asset_id_as_of_idx').on(table.assetId, table.asOf),
  ],
);
