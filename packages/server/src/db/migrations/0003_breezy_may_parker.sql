CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"year" integer,
	"runtime" integer,
	"genre" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_genres_values" CHECK ("movies"."genre" in ('action', 'animation', 'comedy', 'crime', 'drama', 'experimental', 'fantasy', 'historical', 'horror', 'romance', 'thriller', 'western', 'musical')),
	CONSTRAINT "movies_year_range" CHECK ("movies"."year" is null or "movies"."year" between 1878 and extract(year from now())),
	CONSTRAINT "movies_runtime_range" CHECK ("movies"."runtime" is null or "movies"."runtime" between 1 and 9999)
);
