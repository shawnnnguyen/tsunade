ALTER TABLE "transactions" DROP CONSTRAINT "transactions_categoryId_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "valuation_snapshots" DROP CONSTRAINT "valuation_snapshots_holdingId_holdings_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_value_logs" DROP CONSTRAINT "asset_value_logs_assetId_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_tags" DROP CONSTRAINT "transaction_tags_transactionId_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_tags" DROP CONSTRAINT "transaction_tags_tagId_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuation_snapshots" ADD CONSTRAINT "valuation_snapshots_holdingId_holdings_id_fk" FOREIGN KEY ("holdingId") REFERENCES "public"."holdings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_value_logs" ADD CONSTRAINT "asset_value_logs_assetId_assets_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transactionId_transactions_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "rules_user_id_idx" ON "rules" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transactions_user_id_date_idx" ON "transactions" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "holdings_user_id_idx" ON "holdings" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "valuation_snapshots_user_id_idx" ON "valuation_snapshots" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "assets_user_id_idx" ON "assets" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "asset_value_logs_user_id_idx" ON "asset_value_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "asset_value_logs_asset_id_as_of_idx" ON "asset_value_logs" USING btree ("assetId","asOf");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transaction_tags_user_id_idx" ON "transaction_tags" USING btree ("userId");