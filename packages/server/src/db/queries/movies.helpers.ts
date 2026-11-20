import { count, eq, gte, isNull, like, sql } from "drizzle-orm";
import { db } from "../index.js";
import { movieRatings } from "../schema/movieRatings.sql.js";
import { assertUUID, escapeLikeWildcards } from "./utils.js";
import type { Movie, MovieQuery, MovieRated } from "@theatre/shared";
import { movies } from "../schema/movies.sql.js";

export function ratingAverages(movieId?: string) {
  const query = db
    .select({
      movieId: movieRatings.movieId,
      average: sql<number>`ROUND(AVG(${movieRatings.rating}), 1)::float8`.as(
        "average",
      ),
      count: count().as("count"),
    })
    .from(movieRatings);

  const filtered =
    movieId !== undefined
      ? (assertUUID(movieId), query.where(eq(movieRatings.movieId, movieId)))
      : query;

  return filtered.groupBy(movieRatings.movieId).as("avg_rating");
}

export function toMovieWithRatings(
  row: Movie & {
    averageRating: number | null;
    ratingCount: number | null;
    userRating?: number | null;
  },
): MovieRated {
  return {
    ...row,
    averageRating: row.averageRating ?? null,
    ratingCount: row.ratingCount ?? 0,
    userRating: row.userRating ?? null,
  };
}

export function buildFilterConditions(
  averages: ReturnType<typeof ratingAverages>,
  filter: MovieQuery,
  userId?: string,
) {
  const whereConditions = [];

  if (filter?.year !== undefined) {
    whereConditions.push(
      filter.year === null ? isNull(movies.year) : eq(movies.year, filter.year),
    );
  }
  if (filter?.genre !== undefined) {
    whereConditions.push(
      filter.genre === null
        ? isNull(movies.genre)
        : like(movies.genre, `%${escapeLikeWildcards(filter.genre)}`),
    );
  }
  if (filter?.averageRating !== undefined) {
    whereConditions.push(
      filter.averageRating === null
        ? isNull(averages.average)
        : gte(averages.average, filter.averageRating),
    );
  }
  if (filter.userRating !== undefined && userId) {
    whereConditions.push(eq(movieRatings.rating, filter.userRating));
  }
  if (filter?.search) {
    whereConditions.push(
      sql`${movies.name} ILIKE ${`%${escapeLikeWildcards(filter.search)}%`}`,
    );
  }

  return whereConditions;
}
