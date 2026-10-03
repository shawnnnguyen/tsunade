CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_name_idx" ON "tags" USING btree ("userId","name");