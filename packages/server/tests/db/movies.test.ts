import { beforeEach, describe, expect, it } from "vitest";
import { createTestMovie, resetDB } from "../helpers.js";
import { createMovie } from "../../src/db/queries/movies.js";

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
