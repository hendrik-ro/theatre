import { check, integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers.js";
import {
  FIRST_MOVIE_YEAR,
  genres,
  MOVIE_RUNTIME,
  type Genre,
} from "@theatre/shared";
import { sql } from "drizzle-orm";

const genreList = sql.raw(genres.map((g) => `'${g}'`).join(", "));
const yearLowerBound = sql.raw(String(FIRST_MOVIE_YEAR));
const runtimeRange = sql.raw(`${MOVIE_RUNTIME.min} and ${MOVIE_RUNTIME.max}`);

export const movies = pgTable(
  "movies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name").notNull(),
    year: integer("year"),
    runtime: integer("runtime"),
    genre: varchar("genre").$type<Genre>(),
    ...timestamps,
  },
  (table) => [
    check("movies_genres_values", sql`${table.genre} in (${genreList})`),
    check(
      "movies_year_range",
      sql`${table.year} is null or ${table.year} between ${yearLowerBound} and extract(year from now())`,
    ),
    check(
      "movies_runtime_range",
      sql`${table.runtime} is null or ${table.runtime} between ${runtimeRange}`,
    ),
  ],
);
