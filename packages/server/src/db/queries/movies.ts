import type {
  Movie,
  MovieInput,
  MovieQuery,
  MovieRated,
  MoviesPaginated,
  MovieUpdate,
} from "@theatre/shared";
import { db } from "../index.js";
import { movies } from "../schema/movies.sql.js";
import { HttpError } from "../../utils/errors.js";
import { assertUUID, firstOrUndefined } from "./utils.js";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { movieRatings } from "../schema/movieRatings.sql.js";
import {
  toMovieWithRatings,
  ratingAverages,
  buildFilterConditions,
} from "./movies.helpers.js";
import { getWatchlistMovieIds } from "./watchlists.js";

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

// watchlistOf may differ from userId
export async function getMovies(
  filter?: MovieQuery,
  userId?: string,
  watchlistOf?: string,
): Promise<MoviesPaginated> {
  const limit = filter?.limit ?? 20;
  const page = filter?.page ?? 1;
  if (
    (filter?.userRating !== undefined || filter?.sortBy === "userRating") &&
    !userId
  ) {
    throw new HttpError(
      400,
      "userRating filter/sort requires an authenticated user",
    );
  }

  const averages = ratingAverages();

  // "nullsLast": unproduced/unrated values sort last on every direction,
  // for both asc (explicit, not rely on the engine default) and desc.
  type SortColumn = {
    column: SQLWrapper;
    nullsLast?: boolean;
  };

  const sortColumnMap: Record<NonNullable<MovieQuery["sortBy"]>, SortColumn> = {
    name: { column: movies.name },
    year: { column: movies.year, nullsLast: true },
    runtime: { column: movies.runtime, nullsLast: true },
    genre: { column: movies.genre, nullsLast: true },
    averageRating: { column: averages.average, nullsLast: true },
    createdAt: { column: movies.createdAt },
    updatedAt: { column: movies.updatedAt },
    userRating: { column: movieRatings.rating, nullsLast: true },
  };

  const whereConditions = buildFilterConditions(averages, filter, userId);

  if (watchlistOf) {
    whereConditions.push(inArray(movies.id, getWatchlistMovieIds(watchlistOf)));
  }

  const countSelection = db
    .select({ count: count() })
    .from(movies)
    .leftJoin(averages, eq(averages.movieId, movies.id));
  if (userId) {
    countSelection.leftJoin(
      movieRatings,
      and(eq(movieRatings.movieId, movies.id), eq(movieRatings.userId, userId)),
    );
  }

  const countSelectionWithFilters =
    whereConditions.length > 0
      ? countSelection.where(and(...whereConditions))
      : countSelection;

  const [total] = await countSelectionWithFilters;
  if (!total) throw new HttpError(500, "Count query returned no rows");

  const sort = sortColumnMap[filter?.sortBy as keyof typeof sortColumnMap];

  const orderExpr = !sort
    ? asc(movies.name)
    : filter?.order === "desc"
      ? sort.nullsLast
        ? sql`${sort.column} desc nulls last`
        : desc(sort.column)
      : sort.nullsLast
        ? sql`${sort.column} asc nulls last`
        : asc(sort.column);

  const query = db
    .select({
      ...getTableColumns(movies),
      averageRating: averages.average,
      ratingCount: averages.count,
      ...(userId ? { userRating: movieRatings.rating } : {}),
    })
    .from(movies)
    .leftJoin(averages, eq(averages.movieId, movies.id))
    .where(and(...whereConditions))
    .orderBy(orderExpr, asc(movies.id))
    .limit(limit)
    .offset((page - 1) * limit);

  if (userId) {
    query.leftJoin(
      movieRatings,
      and(eq(movieRatings.movieId, movies.id), eq(movieRatings.userId, userId)),
    );
  }

  const rows = await query;

  return {
    movies: rows.map(toMovieWithRatings),
    page,
    limit,
    total: total.count,
    totalPages: Math.ceil(total.count / limit),
  };
}

export async function getMovieById(
  movieId: string,
  userId?: string,
): Promise<MovieRated | undefined> {
  assertUUID(movieId);
  const average = ratingAverages(movieId);

  const query = db
    .select({
      ...getTableColumns(movies),
      averageRating: average.average,
      ratingCount: average.count,
      ...(userId ? { userRating: movieRatings.rating } : {}),
    })
    .from(movies)
    .leftJoin(average, eq(average.movieId, movies.id))
    .where(eq(movies.id, movieId));

  if (userId) {
    assertUUID(userId);
    query.leftJoin(
      movieRatings,
      and(eq(movieRatings.movieId, movieId), eq(movieRatings.userId, userId)),
    );
  }
  const rows = await query;
  const movie = firstOrUndefined(rows);
  return movie ? toMovieWithRatings(movie) : undefined;
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
