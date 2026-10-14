import { pgTable, uuid, text, integer, numeric } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers.js";

export const movies = pgTable("movies", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  ...timestamps,
  name: text("name").notNull().unique(),
  year: integer("year"),
  runtime: integer("runtime"),
  imdbRating: numeric("imdb_rating", { mode: "number" }),
  genre: text("genre"),
});
