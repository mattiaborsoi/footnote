ALTER TABLE "cities" ADD COLUMN "places_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "scout_version" integer DEFAULT 0 NOT NULL;