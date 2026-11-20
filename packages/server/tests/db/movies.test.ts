import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestMovie,
  createTestUser,
  resetDB,
  ZERO_UUID,
} from "../helpers.js";
import {
  createMovie,
  deleteMovie,
  getMovies,
  getMovieById,
  updateMovie,
} from "../../src/db/queries/movies.js";
import { rateMovie } from "../../src/db/queries/movieRatings.js";

beforeEach(async () => {
  await resetDB();
});

describe("createMovie", () => {
  it("creates a new movie and returns it", async () => {
    const movie = await createMovie({
      name: "The Matrix",
      year: 1999,
      runtime: 136,
      genre: "action",
    });

    expect(movie).toMatchObject({
      name: "The Matrix",
      year: 1999,
      runtime: 136,
      genre: "action",
    });
  });

  it("returns null values for undefined input", async () => {
    const movie = await createTestMovie({
      year: undefined,
      runtime: undefined,
      genre: undefined,
    });

    expect(movie).toMatchObject({
      name: "The Matrix",
      year: null,
      runtime: null,
      genre: null,
    });
  });

  it("rejects year outside its range", async () => {
    await expect(createTestMovie({ year: 1877 })).rejects.toMatchObject({
      cause: {
        code: "23514",
        constraint_name: "movies_year_range",
      },
    });
  });

  it("rejects runtime outside its range", async () => {
    await expect(createTestMovie({ runtime: 0 })).rejects.toMatchObject({
      cause: {
        code: "23514",
        constraint_name: "movies_runtime_range",
      },
    });
  });
});

describe("getMovies", () => {
  it("returns all movies from table", async () => {
    const movie1 = await createTestMovie();
    const movie2 = await createTestMovie({
      name: "Inception",
      year: 2010,
      runtime: 148,
      genre: "action",
    });
    const result = await getMovies({});

    expect(result).toEqual({
      movies: expect.arrayContaining([
        { ...movie1, averageRating: null, ratingCount: 0, userRating: null },
        { ...movie2, averageRating: null, ratingCount: 0, userRating: null },
      ]),
      limit: 20,
      page: 1,
      total: 2,
      totalPages: 1,
    });
  });

  it("returns an empty array for empty table", async () => {
    expect(await getMovies({})).toStrictEqual({
      movies: [],
      limit: 20,
      page: 1,
      total: 0,
      totalPages: 0,
    });
  });
});

describe("getMovieById", () => {
  it("returns a movie by id", async () => {
    const movie = await createTestMovie();
    const result = await getMovieById(movie.id);

    expect(result).toMatchObject({
      ...movie,
      averageRating: null,
      ratingCount: 0,
    });
  });

  it("returns a movie with user rating", async () => {
    const movie = await createTestMovie();
    const user = await createTestUser();
    await rateMovie({ userId: user.id, movieId: movie.id, rating: 7 });
    const result = await getMovieById(movie.id, user.id);

    expect(result).toMatchObject({
      ...movie,
      averageRating: 7,
      ratingCount: 1,
      userRating: 7,
    });
  });

  it("rejects malformed movie id", async () => {
    await expect(getMovieById("malformed-movie-id")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("returns undefined for non-existing movie", async () => {
    expect(await getMovieById(ZERO_UUID)).toBeUndefined();
  });
});

describe("deleteMovie", () => {
  it("deletes a movie by id", async () => {
    const movie = await createTestMovie();
    await deleteMovie(movie.id);
    expect(await getMovieById(movie.id)).toBeUndefined();
  });

  it("leaves other movies untouched", async () => {
    const movie1 = await createTestMovie();
    const movie2 = await createTestMovie({ name: "Inception" });
    await deleteMovie(movie2.id);

    expect(await getMovieById(movie1.id)).toMatchObject({
      ...movie1,
    });
  });

  it("rejects malformed movie id", async () => {
    await expect(deleteMovie("malformed-movie-id")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });

  it("is idempotent: zero rows is not an error", async () => {
    await expect(deleteMovie(ZERO_UUID)).resolves.toBeUndefined();
  });
});

describe("updateMovie", () => {
  it("updates a movie and returns it", async () => {
    const movie = await createTestMovie();
    const result = await updateMovie(movie.id, {
      name: "Inception",
      year: 2010,
      runtime: 148,
      genre: "action",
    });

    expect(result).toMatchObject({
      name: "Inception",
      year: 2010,
      runtime: 148,
      genre: "action",
    });
  });

  it("returns movie for an empty patch", async () => {
    const movie = await createTestMovie();
    await expect(updateMovie(movie.id, {})).resolves.toMatchObject({
      ...movie,
    });
  });

  it("partial update leaves other fields untouched", async () => {
    const movie = await createTestMovie({ year: 2001 });
    const result = await updateMovie(movie.id, { name: "Renamed" });
    expect(result).toMatchObject({ name: "Renamed", year: 2001 });
  });

  it("rejects malformed movie id", async () => {
    await expect(
      updateMovie("malformed-movie-id", { name: "Inception" }),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});
