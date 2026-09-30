import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const categories = pgTable('categories', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  name: text().notNull(),
  parentId: uuid().references((): AnyPgColumn => categories.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
