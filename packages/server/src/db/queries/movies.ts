import type { Movie, MovieInput } from "@theatre/shared";
import { db } from "../index.js";
import { movies } from "../schema/movies.sql.js";
import { HttpError } from "../../utils/errors.js";

export async function createMovie(input: MovieInput): Promise<Movie> {
  const [movie] = await db
    .insert(movies)
    .values({ ...input })
    .returning();
  if (!movie) throw new HttpError(500, "Movie insert returned no rows");
  return movie;
}
