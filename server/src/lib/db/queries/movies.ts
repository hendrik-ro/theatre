import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { movies } from "../schema.js";
import { firstOrUndefined } from "./utils.js";

export async function createMovie(
  name: string,
  year?: number,
  runtime?: number,
  imdbRating?: number,
  genre?: string,
) {
  const [result] = await db.insert(movies).values({
    name,
    year,
    runtime,
    imdb_rating: imdbRating,
    genre,
  });
  return result;
}

export async function getAllMovies() {
  const result = await db.select().from(movies);
  return result;
}

export async function getMovieByName(name: string) {
  const result = await db.select().from(movies).where(eq(movies.name, name));
  return firstOrUndefined(result);
}
