import type { Movie, MovieInput, MovieUpdate } from "@theatre/shared";
import { db } from "../index.js";
import { movies } from "../schema/movies.sql.js";
import { HttpError } from "../../utils/errors.js";
import { assertUUID, firstOrUndefined } from "./utils.js";
import { eq } from "drizzle-orm";

export async function createMovie(input: MovieInput): Promise<Movie> {
  const [movie] = await db
    .insert(movies)
    .values({ ...input })
    .returning();
  if (!movie) throw new HttpError(500, "Movie insert returned no rows");
  return movie;
}

export async function deleteMovie(id: string): Promise<void> {
  assertUUID(id);
  await db.delete(movies).where(eq(movies.id, id));
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  assertUUID(id);
  const movie = await db.select().from(movies).where(eq(movies.id, id));
  return firstOrUndefined(movie);
}

export async function updateMovie(
  id: string,
  input: MovieUpdate,
): Promise<Movie | undefined> {
  assertUUID(id);
  if (!Object.keys(input).length) return getMovieById(id);
  const movie = await db
    .update(movies)
    .set({ ...input })
    .where(eq(movies.id, id))
    .returning();
  return firstOrUndefined(movie);
}
