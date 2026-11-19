CREATE TABLE "movie_ratings" (
	"user_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movie_ratings_user_id_movie_id_pk" PRIMARY KEY("user_id","movie_id"),
	CONSTRAINT "movie_ratings_range" CHECK ("movie_ratings"."rating" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "movie_ratings" ADD CONSTRAINT "movie_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_ratings" ADD CONSTRAINT "movie_ratings_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movie_ratings_movie_id_idx" ON "movie_ratings" USING btree ("movie_id");