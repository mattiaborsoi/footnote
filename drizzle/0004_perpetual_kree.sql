CREATE TABLE "login_codes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email_key" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"link_hash" text NOT NULL,
	"next" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"stripe_customer_id" text,
	"plan" text DEFAULT 'none' NOT NULL,
	"plan_status" text DEFAULT 'none' NOT NULL,
	"plan_starts_at" timestamp with time zone,
	"plan_ends_at" timestamp with time zone,
	"subscription_id" text,
	CONSTRAINT "users_email_key_unique" UNIQUE("email_key")
);
--> statement-breakpoint
ALTER TABLE "walks" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_codes_email_idx" ON "login_codes" USING btree ("email_key","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "walks_user_idx" ON "walks" USING btree ("user_id","created_at");