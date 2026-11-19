import type { Rating, RatingValue, RatingQuery } from "@theatre/shared";
import { db } from "../index.js";
import { movieRatings } from "../schema/movieRatings.sql.js";
import { HttpError } from "../../utils/errors.js";
import { assertUUID } from "./utils.js";
import { and, eq } from "drizzle-orm";

// Upsert on primary key: changing a rating replaces the single row
export async function rateMovie(input: RatingValue): Promise<Rating> {
  const { userId, movieId, rating } = input;
  assertUUID(userId);
  assertUUID(movieId);
  const [newRating] = await db
    .insert(movieRatings)
    .values({ userId, movieId, rating })
    .onConflictDoUpdate({
      target: [movieRatings.userId, movieRatings.movieId],
      set: { rating },
    })
    .returning();
  if (!newRating)
    throw new HttpError(500, "Movie rating insert returned now row");
  return newRating;
}

// Internal query for testing with potential high compute cost - do not expose
export async function getMovieRatingsTEST(
  input?: RatingQuery,
): Promise<Rating[]> {
  if (input?.userId) assertUUID(input.userId);
  if (input?.movieId) assertUUID(input.movieId);

  return await db
    .select()
    .from(movieRatings)
    .where(
      and(
        input?.userId !== undefined
          ? eq(movieRatings.userId, input.userId)
          : undefined,
        input?.movieId !== undefined
          ? eq(movieRatings.movieId, input.movieId)
          : undefined,
      ),
    );
}

export async function deleteMovieRating(
  userId: string,
  movieId: string,
): Promise<void> {
  assertUUID(userId);
  assertUUID(movieId);
  await db
    .delete(movieRatings)
    .where(
      and(eq(movieRatings.userId, userId), eq(movieRatings.movieId, movieId)),
    );
}
