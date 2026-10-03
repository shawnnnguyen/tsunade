import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('refresh_tokens_user_id_idx').on(table.userId)],
);
