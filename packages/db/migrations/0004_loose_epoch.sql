CREATE TYPE "public"."currency" AS ENUM('EUR', 'USD');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "baseCurrency" "currency" DEFAULT 'EUR' NOT NULL;