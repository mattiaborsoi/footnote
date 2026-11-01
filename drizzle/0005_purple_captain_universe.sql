CREATE TABLE "admin_marks" (
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_marks_kind_key_pk" PRIMARY KEY("kind","key")
);
