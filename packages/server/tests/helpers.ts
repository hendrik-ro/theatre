import type { Movie, MovieInput, Rating, User } from "@theatre/shared";
import { createUser } from "../src/db/queries/users.js";
import { db, schema } from "../src/db/index.js";
import { getTableName, sql } from "drizzle-orm";
import { createMovie } from "../src/db/queries/movies.js";
import { rateMovie } from "../src/db/queries/movieRatings.js";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export async function resetDB(): Promise<void> {
  const tables = Object.values(schema);
  await db.execute(
    sql`TRUNCATE TABLE ${sql.join(
      tables.map((t) => sql.identifier(getTableName(t))),
      sql`, `,
    )}`,
  );
}

export async function createTestUser(
  username?: string,
  email?: string,
  passwordHash?: string,
): Promise<User & { firstAdmin: boolean }> {
  return await createUser(
    username ?? "user",
    email ?? "user@test.com",
    passwordHash ?? "password123",
  );
}

export async function createTestMovie(
  overrides?: Partial<MovieInput>,
): Promise<Movie> {
  return await createMovie({
    name: "The Matrix",
    year: 1999,
    runtime: 136,
    genre: "action",
    ...overrides,
  });
}

export async function populateTestData(): Promise<{
  users: User[];
  movies: Movie[];
  ratings: Rating[];
}> {
  const admin = await createTestUser("admin", "admin@test.com");
  const user = await createTestUser();

  const movie1 = await createTestMovie();
  const movie2 = await createTestMovie({
    name: "Inception",
    year: 2010,
    runtime: 148,
    genre: "action",
  });
  const movie3 = await createTestMovie({
    name: "The Godfather",
    year: 1976,
    runtime: 120,
    genre: "drama",
  });
  const movie4 = await createTestMovie({
    name: "Interstellar",
    year: 2014,
    runtime: 201,
    genre: "action",
  });
  const movie5 = await createTestMovie({
    name: "Toy Story",
    year: 1992,
    runtime: 72,
    genre: "animation",
  });
  const movie6 = await createTestMovie({ name: "M6" });
  const movie7 = await createTestMovie({ name: "M7" });
  const movie8 = await createTestMovie({ name: "M8" });
  const movie9 = await createTestMovie({ name: "M9" });
  const movie10 = await createTestMovie({ name: "M10" });
  const movie11 = await createTestMovie({ name: "M11" });
  const movie12 = await createTestMovie({ name: "M12" });
  const movie13 = await createTestMovie({ name: "M13" });
  const movie14 = await createTestMovie({ name: "M14" });
  const movie15 = await createTestMovie({ name: "M15" });
  const movie16 = await createTestMovie({ name: "M16" });
  const movie17 = await createTestMovie({ name: "M17" });
  const movie18 = await createTestMovie({ name: "M18" });
  const movie19 = await createTestMovie({ name: "M19" });
  const movie20 = await createTestMovie({ name: "M20" });
  const movie21 = await createTestMovie({ name: "M21" });
  const movie22 = await createTestMovie({ name: "M22" });

  const rating1 = await rateMovie({
    userId: admin.id,
    movieId: movie1.id,
    rating: 9,
  });
  const rating2 = await rateMovie({
    userId: user.id,
    movieId: movie1.id,
    rating: 7,
  });

  return {
    users: [admin, user],
    movies: [
      movie1,
      movie2,
      movie3,
      movie4,
      movie5,
      movie6,
      movie7,
      movie8,
      movie9,
      movie10,
      movie11,
      movie12,
      movie13,
      movie14,
      movie15,
      movie16,
      movie17,
      movie18,
      movie19,
      movie20,
      movie21,
      movie22,
    ],
    ratings: [rating1, rating2],
  };
}

export function omitUserFirstAdmin(user: User & { firstAdmin: boolean }): User {
  const { firstAdmin: _firstAdmin, ...userOmittedFirstAdmin } = user;
  return userOmittedFirstAdmin;
}
