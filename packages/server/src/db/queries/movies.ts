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
  gte,
  isNull,
  like,
  sql,
} from "drizzle-orm";
import { movieRatings } from "../schema/movieRatings.sql.js";

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

function ratingAverages(movieId?: string) {
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

function toMovieWithRatings(
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

function buildFilterConditions(
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
        : like(movies.genre, `%${filter.genre}`),
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
    whereConditions.push(sql`${movies.name} ILIKE ${`%${filter.search}%`}`);
  }

  return whereConditions;
}

export async function getMovies(
  filter: MovieQuery,
  userId?: string,
): Promise<MoviesPaginated> {
  const limit = filter?.limit ?? 20;
  const page = filter.page ?? 1;
  if (
    (filter.userRating !== undefined || filter.sortBy === "userRating") &&
    !userId
  ) {
    throw new HttpError(
      400,
      "userRating filter/sort requires an authenticated user",
    );
  }

  const averages = ratingAverages();

  const sortColumnMap = {
    name: movies.name,
    year: movies.year,
    runtime: movies.runtime,
    genre: movies.genre,
    averageRating: averages.average,
    ...(userId ? { userRating: movieRatings.rating } : {}),
  };

  const whereConditions = buildFilterConditions(averages, filter, userId);

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

  const column = sortColumnMap[filter.sortBy as keyof typeof sortColumnMap];

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
    .orderBy(
      column
        ? filter.order === "asc"
          ? asc(column)
          : desc(column)
        : asc(movies.name),
    )
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
    total: total!.count,
    totalPages: Math.ceil(total!.count / limit),
  };
}

export async function getMovieById(
  movieId: string,
  userId?: string,
): Promise<Movie | undefined> {
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
