import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tags } from './tags.js';
import { transactions } from './transactions.js';
import { users } from './users.js';

export const transactionTags = pgTable(
  'transaction_tags',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('transaction_tags_transaction_tag_unique').on(table.transactionId, table.tagId),
    index('transaction_tags_user_id_idx').on(table.userId),
  ],
);
