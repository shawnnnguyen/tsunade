import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const tags = pgTable('tags', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
