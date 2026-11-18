import type { Movie, MovieInput, User } from "@theatre/shared";
import { createUser } from "../src/db/queries/users.js";
import { db, schema } from "../src/db/index.js";
import { getTableName, sql } from "drizzle-orm";
import { createMovie } from "../src/db/queries/movies.js";

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

export function omitUserFirstAdmin(user: User & { firstAdmin: boolean }): User {
  const { firstAdmin: _firstAdmin, ...userOmittedFirstAdmin } = user;
  return userOmittedFirstAdmin;
}
