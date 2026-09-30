import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { assets } from './assets.js';
import { users } from './users.js';

export const assetValueLogs = pgTable('asset_value_logs', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  assetId: uuid()
    .notNull()
    .references(() => assets.id),
  value: numeric({ precision: 19, scale: 4 }).notNull(),
  currency: text().notNull(),
  asOf: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
