import type { Movie, MovieInput, Rating, User } from "@theatre/shared";
import { createUser } from "../src/db/queries/users.js";
import { db, schema } from "../src/db/index.js";
import { getTableName, sql } from "drizzle-orm";
import { createMovie } from "../src/db/queries/movies.js";
import { rateMovie } from "../src/db/queries/movieRatings.js";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

// 22 real movies; every genre covered, spread across decades, unique names
const TEST_MOVIES: MovieInput[] = [
  { name: "The Matrix", year: 1999, runtime: 136, genre: "action" },
  { name: "Inception", year: 2010, runtime: 148, genre: "action" },
  { name: "The Godfather", year: 1972, runtime: 175, genre: "drama" },
  { name: "Schindler's List", year: 1993, runtime: 195, genre: "historical" },
  { name: "Interstellar", year: 2014, runtime: 169, genre: "drama" },
  { name: "Parasite", year: 2019, runtime: 132, genre: "drama" },
  { name: "Toy Story", year: 1995, runtime: 81, genre: "animation" },
  { name: "Spirited Away", year: 2001, runtime: 125, genre: "animation" },
  {
    name: "The Grand Budapest Hotel",
    year: 2014,
    runtime: 99,
    genre: "comedy",
  },
  {
    name: "Monty Python and the Holy Grail",
    year: 1975,
    runtime: 91,
    genre: "comedy",
  },
  { name: "Se7en", year: 1995, runtime: 127, genre: "crime" },
  { name: "Rashomon", year: 1950, runtime: 88, genre: "crime" },
  { name: "The Lord of the Rings", year: 2001, runtime: 178, genre: "fantasy" },
  { name: "Alien", year: 1979, runtime: 117, genre: "horror" },
  { name: "The Shining", year: 1980, runtime: 146, genre: "horror" },
  {
    name: "The Good, the Bad and the Ugly",
    year: 1966,
    runtime: 161,
    genre: "western",
  },
  { name: "Unforgiven", year: 1992, runtime: 130, genre: "western" },
  { name: "Before Sunrise", year: 1995, runtime: 101, genre: "romance" },
  { name: "Casablanca", year: 1942, runtime: 102, genre: "romance" },
  { name: "La La Land", year: 2016, runtime: 128, genre: "musical" },
  {
    name: "The Silence of the Lambs",
    year: 1991,
    runtime: 118,
    genre: "thriller",
  },
  {
    name: "Man with a Movie Camera",
    year: 1929,
    runtime: 68,
    genre: "experimental",
  },
];

// [movieIndex, userIdIndex, rating] - 1-based into the arrays below
const TEST_RATINGS: [movie: number, user: number, rating: number][] = [
  [1, 1, 9],
  [1, 2, 7], // The Matrix: (9+7)/2 = 8
  [3, 1, 10],
  [3, 2, 8], // The Godfather: 9
  [20, 1, 9],
  [20, 2, 9],
  [20, 3, 7],
  [20, 4, 9], // La La Land: 8.5
  [22, 2, 10],
  [22, 3, 6], // Movie Camera: 8
  // rest stays unrated: averageRating null, count 0
];

export type IntegrationTestData = {
  users: (User & { firstAdmin: boolean })[];
  movies: Movie[];
  ratings: (Rating & { movieId: string })[];
};

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

export async function populateTestData(): Promise<IntegrationTestData> {
  // Bootstrap admin alone: firstAdmin claim must not race the other users.
  const admin = await createTestUser("admin", "admin@test.com");
  const users = await Promise.all([
    createTestUser(),
    createTestUser("user2", "user2@test.com"),
    createTestUser("user3", "user3@test.com"),
  ]);
  const allUsers = [admin, ...users]; // index 1-based matches TEST_RATINGS

  // Sequential: parallel inserts give same-ms created_at stamps, making the
  // paginated-test order assertions flaky.
  const movies: Movie[] = [];
  const ratings: Rating[] = [];
  for (const input of TEST_MOVIES) movies.push(await createTestMovie(input));
  for (const [movieIdx, userIdx, rating] of TEST_RATINGS) {
    const user = allUsers.at(userIdx - 1);
    const movie = movies.at(movieIdx - 1);
    if (!user || !movie) {
      throw new Error(
        `TEST_RATINGS entry [${movieIdx}, ${userIdx}, ${rating}] references rows outside the fixture`,
      );
    }
    ratings.push(
      await rateMovie({
        userId: user.id,
        movieId: movie.id,
        rating,
      }),
    );
  }

  return { users: allUsers, movies, ratings };
}

export function omitUserFirstAdmin(user: User & { firstAdmin: boolean }): User {
  const { firstAdmin: _firstAdmin, ...userOmittedFirstAdmin } = user;
  return userOmittedFirstAdmin;
}
