import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.sql.js";
import { movies } from "./movies.sql.js";
import { timestamps } from "./columns.helpers.js";

export const watchlists = pgTable(
  "watchlists",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.movieId] }),
    index("watchlists_movie_id_idx").on(table.movieId), // For cascaded movie deletion
  ],
);
