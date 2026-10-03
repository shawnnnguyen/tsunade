import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const tags = pgTable(
  'tags',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    name: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tags_user_id_idx').on(table.userId),
    uniqueIndex('tags_user_id_name_idx').on(table.userId, table.name),
  ],
);
