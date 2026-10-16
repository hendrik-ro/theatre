import { db } from "../index.js";
import { appBootstrap } from "../schema/appBootstrap.sql.js";

export async function firstAdmin(): Promise<string | null> {
  const [boot] = await db
    .insert(appBootstrap)
    .values({ key: "first_admin" })
    .onConflictDoNothing()
    .returning();
  return boot.key;
}
