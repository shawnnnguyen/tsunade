import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { categories } from './categories.js';
import { users } from './users.js';

export const ruleMatchFieldEnum = pgEnum('rule_match_field', ['description', 'amount', 'merchant']);

export const rules = pgTable('rules', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  categoryId: uuid()
    .notNull()
    .references(() => categories.id),
  matchField: ruleMatchFieldEnum().notNull(),
  pattern: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
