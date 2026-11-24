import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers.js";
import { sql } from "drizzle-orm";
import { users } from "./users.sql.js";
import { movies } from "./movies.sql.js";
import { RATINGS } from "@theatre/shared";

const ratingRange = sql.raw(`${RATINGS.min} and ${RATINGS.max}`);

export const movieRatings = pgTable(
  "movie_ratings",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    movieId: uuid("movie_id")
      .references(() => movies.id, {
        onDelete: "cascade",
      })
      .notNull(),
    rating: integer("rating").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.movieId] }),
    index("movie_ratings_movie_id_idx").on(table.movieId),
    check("movie_ratings_range", sql`${table.rating} between ${ratingRange}`),
  ],
);
