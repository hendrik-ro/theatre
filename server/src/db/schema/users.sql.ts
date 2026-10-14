import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  ...timestamps,
  lastLoginAt: timestamp("last_login_at"),
  name: text("name").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at"),
  passwordHash: text("password_hash").notNull(),
  role: text("role"),
});
