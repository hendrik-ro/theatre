import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { config } from "../config.js";
import { bootstrap } from "./schema/bootstrap.sql.js";
import { users } from "./schema/users.sql.js";
import { refreshTokens } from "./schema/refreshTokens.sql.js";
import { movies } from "./schema/movies.sql.js";

export const schema = {
  bootstrap,
  users,
  refreshTokens,
  movies,
};

const conn = postgres(config.dbUrl);
export const db = drizzle(conn, { schema });
export const closeDB = () => conn.end({ timeout: 5 });
