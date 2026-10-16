import { db } from "../index.js";
import { appBootstrap } from "../schema/appBootstrap.sql.js";

export async function firstAdmin(): Promise<object[]> {
  const bootstrap = await db
    .insert(appBootstrap)
    .values({ key: "first_admin" })
    .onConflictDoNothing()
    .returning();
  return bootstrap;
}
