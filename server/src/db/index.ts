import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { movies } from "./schema/movies.sql.js";
import { users } from "./schema/users.sql.js";
import { config } from "../config.js";

const schema = { movies, users };

const conn = postgres(config.dbURL);
export const db = drizzle(conn, { schema });
export const closeDB = () => conn.end({ timeout: 5 });
