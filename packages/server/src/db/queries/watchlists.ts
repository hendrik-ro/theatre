import { and, eq } from "drizzle-orm";
import { db } from "../index.js";
import { watchlists } from "../schema/watchlists.sql.js";
import { assertUUID } from "./utils.js";

export async function addMovieToWatchlist(
  userId: string,
  movieId: string,
): Promise<void> {
  assertUUID(userId);
  assertUUID(movieId);
  await db.insert(watchlists).values({ userId, movieId }).onConflictDoNothing();
}

export async function removeMovieFromWatchlist(
  userId: string,
  movieId: string,
): Promise<void> {
  assertUUID(userId);
  assertUUID(movieId);
  await db
    .delete(watchlists)
    .where(and(eq(watchlists.userId, userId), eq(watchlists.movieId, movieId)));
}

// Query builder: getMovies embeds this as subquery via inArray(movies.id, ...)
export function getWatchlistMovieIds(userId: string) {
  assertUUID(userId);
  return db
    .select({ id: watchlists.movieId })
    .from(watchlists)
    .where(eq(watchlists.userId, userId));
}
