import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers.js";

export const refreshTokens = pgTable("refresh_tokens", {
  userId: uuid("user_id").primaryKey().notNull(),
  ...timestamps,
  refreshToken: text("refresh_token").notNull().unique(),
});
