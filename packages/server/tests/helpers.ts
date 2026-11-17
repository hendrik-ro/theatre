import type { User } from "@theatre/shared";
import { createUser } from "../src/db/queries/users.js";
import { db, schema } from "../src/db/index.js";
import { getTableName, sql } from "drizzle-orm";

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
  password?: string,
): Promise<User & { firstAdmin: boolean }> {
  return await createUser(
    username ?? "user",
    email ?? "user@test.com",
    password ?? "password123",
  );
}
