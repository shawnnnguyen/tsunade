ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "parentId";