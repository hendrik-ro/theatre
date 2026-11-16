import type { db } from "../index.js";
import { bootstrap } from "../schema/bootstrap.sql.js";

// Parameterized by the caller's transaction client: the claim only
// participates in createUsers's atomicity when it runs inside the same
// transaction as the user insert.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Atomically claims the first-admin bootstrap slot. Returns the row when
// this call won the claim, an empty array when already claimed.
export async function firstAdmin(tx: Tx) {
  return tx
    .insert(bootstrap)
    .values({ key: "first_admin" })
    .onConflictDoNothing()
    .returning();
}
