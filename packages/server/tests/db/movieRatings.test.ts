import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestMovie,
  createTestUser,
  resetDB,
  ZERO_UUID,
} from "../helpers.js";
import {
  deleteMovieRating,
  getMovieRatingsTEST,
  rateMovie,
} from "../../src/db/queries/movieRatings.js";

beforeEach(async () => {
  await resetDB();
});

describe("rateMovie", () => {
  it("creates a new rating and returns it", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    const result = await rateMovie({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });

    expect(result).toMatchObject({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });
  });

  it("updates an existing rating", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    const rating = await rateMovie({
      userId: user.id,
      movieId: movie.id,
      rating: 5,
    });
    await new Promise((r) => setTimeout(r, 5)); // test $onUpdateFn - no fake timers
    const result = await rateMovie({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });

    expect(result).toMatchObject({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });

    expect(result.updatedAt.getTime()).toBeGreaterThan(
      rating.updatedAt.getTime(),
    );
  });

  it("rejects malformed user id", async () => {
    await expect(
      rateMovie({ userId: "malformed-user-id", movieId: ZERO_UUID, rating: 7 }),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("rejects malformed movie id", async () => {
    await expect(
      rateMovie({
        userId: ZERO_UUID,
        movieId: "malformed-movie-id",
        rating: 7,
      }),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("rejects non-existing user id", async () => {
    const movie = await createTestMovie();
    await expect(
      rateMovie({
        userId: ZERO_UUID,
        movieId: movie.id,
        rating: 7,
      }),
    ).rejects.toMatchObject({
      cause: {
        code: "23503",
        constraint_name: "movie_ratings_user_id_users_id_fk",
      },
    });
  });

  it("rejects non-existing movie id", async () => {
    const user = await createTestUser();
    await expect(
      rateMovie({ userId: user.id, movieId: ZERO_UUID, rating: 7 }),
    ).rejects.toMatchObject({
      cause: {
        code: "23503",
        constraint_name: "movie_ratings_movie_id_movies_id_fk",
      },
    });
  });

  it("rejects rating outside its range", async () => {
    await expect(
      rateMovie({ userId: ZERO_UUID, movieId: ZERO_UUID, rating: 0 }),
    ).rejects.toMatchObject({
      cause: {
        code: "23514",
        constraint_name: "movie_ratings_range",
      },
    });
    await expect(
      rateMovie({ userId: ZERO_UUID, movieId: ZERO_UUID, rating: 11 }),
    ).rejects.toMatchObject({
      cause: {
        code: "23514",
        constraint_name: "movie_ratings_range",
      },
    });
  });
});

describe("getMovieRatingsTEST", () => {
  it("returns all movie ratings", async () => {
    const user = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    const rating = await rateMovie({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });
    const rating2 = await rateMovie({
      userId: user.id,
      movieId: movie2.id,
      rating: 7,
    });
    const rating3 = await rateMovie({
      userId: user2.id,
      movieId: movie.id,
      rating: 7,
    });

    expect(await getMovieRatingsTEST()).toMatchObject([
      rating,
      rating2,
      rating3,
    ]);
  });

  it("returns all ratings by user id", async () => {
    const user = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    const rating = await rateMovie({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });
    const rating2 = await rateMovie({
      userId: user.id,
      movieId: movie2.id,
      rating: 7,
    });
    await rateMovie({ userId: user2.id, movieId: movie.id, rating: 7 });

    const result = await getMovieRatingsTEST({ userId: user.id });

    expect(result).toMatchObject([rating, rating2]);
    expect(result).toHaveLength(2);
  });

  it("returns all ratings by movie id", async () => {
    const user = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    const rating = await rateMovie({
      userId: user.id,
      movieId: movie.id,
      rating: 7,
    });
    await rateMovie({ userId: user.id, movieId: movie2.id, rating: 7 });
    const rating3 = await rateMovie({
      userId: user2.id,
      movieId: movie.id,
      rating: 7,
    });

    const result = await getMovieRatingsTEST({ movieId: movie.id });

    expect(result).toMatchObject([rating, rating3]);
    expect(result).toHaveLength(2);
  });

  it("rejects malformed user id", async () => {
    await expect(
      getMovieRatingsTEST({ userId: "malformed-user-id" }),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("rejects malformed movie id", async () => {
    await expect(
      getMovieRatingsTEST({ movieId: "malformed-movie-id" }),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("returns no results for non-existing user id", async () => {
    const user = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    await rateMovie({ userId: user.id, movieId: movie.id, rating: 7 });
    await rateMovie({ userId: user.id, movieId: movie2.id, rating: 7 });
    await rateMovie({ userId: user2.id, movieId: movie.id, rating: 7 });

    expect(await getMovieRatingsTEST({ userId: ZERO_UUID })).toHaveLength(0);
  });

  it("returns no results for non-existing movie id", async () => {
    const user = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    await rateMovie({ userId: user.id, movieId: movie.id, rating: 7 });
    await rateMovie({ userId: user.id, movieId: movie2.id, rating: 7 });
    await rateMovie({ userId: user2.id, movieId: movie.id, rating: 7 });

    expect(await getMovieRatingsTEST({ movieId: ZERO_UUID })).toHaveLength(0);
  });
});

describe("deleteMovieRating", () => {
  it("deletes a rating", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    await rateMovie({ userId: user.id, movieId: movie.id, rating: 7 });
    await deleteMovieRating(user.id, movie.id);

    expect(
      await getMovieRatingsTEST({ userId: user.id, movieId: movie.id }),
    ).toHaveLength(0);
  });

  it("leaves other movie ratings untouched", async () => {
    const user = await createTestUser();
    const movie = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    await rateMovie({ userId: user.id, movieId: movie.id, rating: 7 });
    const rating2 = await rateMovie({
      userId: user.id,
      movieId: movie2.id,
      rating: 7,
    });
    await deleteMovieRating(user.id, movie.id);

    expect(
      await getMovieRatingsTEST({ userId: user.id, movieId: movie2.id }),
    ).toMatchObject([rating2]);
  });

  it("rejects malformed movie id", async () => {
    await expect(
      deleteMovieRating(ZERO_UUID, "malformed-movie-id"),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("rejects malformed user id", async () => {
    await expect(
      deleteMovieRating("malformed-user-id", ZERO_UUID),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("is idempotent: zero rows is not an error", async () => {
    await expect(
      deleteMovieRating(ZERO_UUID, ZERO_UUID),
    ).resolves.toBeUndefined();
  });
});
