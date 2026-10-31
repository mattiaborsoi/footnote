CREATE TABLE "places" (
	"id" text NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_city_id_id_pk" PRIMARY KEY("city_id","id")
);
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "places_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "walks" ADD COLUMN "city_id" text;--> statement-breakpoint
ALTER TABLE "walks" ADD COLUMN "preset" text;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "places_lat_lon_idx" ON "places" USING btree ("lat","lon");