CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"south" double precision NOT NULL,
	"west" double precision NOT NULL,
	"north" double precision NOT NULL,
	"east" double precision NOT NULL,
	"scouted_at" timestamp with time zone,
	"sources" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"osm_id" text,
	"reason" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mentions" integer DEFAULT 1 NOT NULL,
	"scouted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spots" ADD CONSTRAINT "spots_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spots_city_idx" ON "spots" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "spots_lat_lon_idx" ON "spots" USING btree ("lat","lon");