import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { config } from "../config.js";
import { bootstrap } from "./schema/bootstrap.sql.js";

export const schema = {
  bootstrap,
};

const conn = postgres(config.dbUrl);
export const db = drizzle(conn, { schema });
export const closeDB = () => conn.end({ timeout: 5 });
