import { eq, count } from "drizzle-orm";
import { db } from "../index.js";
import { movies } from "../schema.js";
import { firstOrUndefined, isUUID } from "./utils.js";
import { Movie, MoviesMeta } from "../../models/movies.js";

class DBError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, DBError.prototype);
  }
}

export async function createMovie(
  name: string,
  year?: number,
  runtime?: number,
  imdbRating?: number,
  genre?: string,
): Promise<Movie> {
  const [result] = await db
    .insert(movies)
    .values({
      name,
      year,
      runtime,
      imdbRating,
      genre,
    })
    .returning();
  return result as Movie;
}

export async function getAllMovies(): Promise<Movie[]> {
  const result = await db.select().from(movies);
  return result as Movie[];
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  if (!isUUID(id)) return undefined;
  const result = await db.select().from(movies).where(eq(movies.id, id));
  return firstOrUndefined(result) as Movie;
}

export async function deleteMovie(id: string): Promise<void> {
  if (!isUUID(id)) throw new DBError("Invalid UUID");
  await db.delete(movies).where(eq(movies.id, id));
}

export async function updateMovie(
  id: string,
  name: string,
  year: number,
  runtime: number,
  imdbRating: number,
  genre: string,
): Promise<Movie> {
  const [result] = await db
    .update(movies)
    .set({
      name,
      year,
      runtime,
      imdbRating: imdbRating,
      genre,
    })
    .where(eq(movies.id, id))
    .returning();
  return result as Movie;
}

export async function resetMovies(): Promise<void> {
  await db.delete(movies);
}

export async function getCountperGenre(): Promise<
  { genre: string | null; count: number }[]
> {
  const genres = await db
    .select({
      genre: movies.genre,
      count: count(),
    })
    .from(movies)
    .groupBy(movies.genre);
  return genres;
}

export async function getMoviesMetaData(): Promise<MoviesMeta> {
  const [totalMovies] = await db.select({ count: count() }).from(movies);
  const moviesPerYear = await db
    .select({
      year: movies.year,
      count: count(),
    })
    .from(movies)
    .groupBy(movies.year);
  const moviesPerGenre = await db
    .select({
      genre: movies.genre,
      count: count(),
    })
    .from(movies)
    .groupBy(movies.genre);
  const meta: MoviesMeta = {
    totalMovies: totalMovies.count,
    moviesPerYear,
    moviesPerGenre,
  };
  return meta;
}
