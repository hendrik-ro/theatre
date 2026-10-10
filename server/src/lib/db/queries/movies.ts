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
  const [result] = await db
    .insert(movies)
    .values({
      name,
      year,
      runtime,
      imdb_rating: imdbRating,
      genre,
    })
    .returning();
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

export async function deleteMovie(id: string) {
  try {
    await db.delete(movies).where(eq(movies.id, id));
  } catch (err) {
    console.error(`Failed to delete movie ${id}: ${err}`);
  }
}

export async function resetMovies() {
  try {
    await db.delete(movies);
  } catch (err) {
    console.error(`Failed to delete table 'movies': ${err}`);
  }
}
