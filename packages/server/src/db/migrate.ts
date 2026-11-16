import postgres from "postgres";
import { config } from "../config.js";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { logEvent } from "../logger.js";
import { fileURLToPath } from "node:url";

// Runtime migration runner for prod image without devDep drizzle-kit:
// Same SQL migrations drizzle-kit generates, applied through prod
// drizzle-orm migrator.
// Anchored to this file's location, so path is identical regardless of cwd.

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../src/db/migrations", import.meta.url),
);

async function main() {
  const start = Date.now();
  const conn = postgres(config.dbUrl, { max: 1 });
  const db = drizzle(conn);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await conn.end();
  logEvent("migrations_applied", {
    durationMs: Date.now() - start,
  });
}

main().catch((err) => {
  logEvent("migrations_failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
