import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const currencyEnum = pgEnum('currency', ['EUR', 'USD']);

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  baseCurrency: currencyEnum().notNull().default('EUR'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
