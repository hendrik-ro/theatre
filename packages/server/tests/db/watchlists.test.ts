import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestMovie,
  createTestUser,
  resetDB,
  ZERO_UUID,
} from "../helpers.js";
import {
  addMovieToWatchlist,
  removeMovieFromWatchlist,
} from "../../src/db/queries/watchlists.js";
import { getMovies } from "../../src/db/queries/movies.js";

beforeEach(async () => {
  await resetDB();
});

describe("addMovieToWatchlist", () => {
  it("adds a movie to a user's watchlist", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    await addMovieToWatchlist(user.id, movie.id);

    const result = await getMovies({}, user.id, user.id);

    expect(result.movies).toHaveLength(1);
    expect(result.movies).toMatchObject([
      {
        id: movie.id,
      },
    ]);
  });

  it("does nothing on conflict", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    await addMovieToWatchlist(user.id, movie.id); // 1
    await addMovieToWatchlist(user.id, movie.id); // 2

    const result = await getMovies({}, user.id, user.id);

    expect(result.movies).toHaveLength(1);
    expect(result.movies).toMatchObject([
      {
        id: movie.id,
      },
    ]);
  });

  it("throws when adding a non-existing movie", async () => {
    const user = await createTestUser();
    await expect(addMovieToWatchlist(user.id, ZERO_UUID)).rejects.toMatchObject(
      {
        cause: {
          code: "23503",
          constraint_name: "watchlists_movie_id_movies_id_fk",
        },
      },
    );
  });

  it("rejects malformed user id", async () => {
    await expect(
      addMovieToWatchlist("malformed-user-id", ZERO_UUID),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("rejects malformed movie id", async () => {
    await expect(
      addMovieToWatchlist(ZERO_UUID, "malformed-movie-id"),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});

describe("watchlist via getMovies", () => {
  it("returns a watchlist when watchlistOf is specified", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    await addMovieToWatchlist(user.id, movie.id);
    await addMovieToWatchlist(user.id, movie2.id);

    const watchlist = await getMovies({}, user.id, user.id);
    expect(watchlist).toEqual({
      movies: expect.arrayContaining([
        { ...movie, averageRating: null, ratingCount: 0, userRating: null },
        { ...movie2, averageRating: null, ratingCount: 0, userRating: null },
      ]),
      limit: 20,
      page: 1,
      total: 2,
      totalPages: 1,
    });
  });
});

describe("removeMovieFromWatchlist", () => {
  it("removes a specific movie", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    await addMovieToWatchlist(user.id, movie.id);
    await addMovieToWatchlist(user.id, movie2.id);

    const watchlist = await getMovies({}, user.id, user.id);
    expect(watchlist.movies).toHaveLength(2);

    await removeMovieFromWatchlist(user.id, movie.id);

    const result = await getMovies({}, user.id, user.id);
    expect(result.movies).toMatchObject([{ id: movie2.id }]);
  });

  it("rejects malformed user id", async () => {
    await expect(
      removeMovieFromWatchlist("malformed-user-id", ZERO_UUID),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("rejects malformed movie id", async () => {
    await expect(
      removeMovieFromWatchlist(ZERO_UUID, "malformed-movie-id"),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});
