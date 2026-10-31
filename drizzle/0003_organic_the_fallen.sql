ALTER TABLE "walks" ADD COLUMN "fingerprint" text;--> statement-breakpoint
CREATE INDEX "walks_fingerprint_idx" ON "walks" USING btree ("fingerprint","created_at");