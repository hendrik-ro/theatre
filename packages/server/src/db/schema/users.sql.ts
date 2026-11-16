import { check, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers.js";
import { sql } from "drizzle-orm";
import { userRoles, type UserRole } from "@theatre/shared";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...timestamps,
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 255 })
      .$type<UserRole>()
      .notNull()
      .default("user"),
  },
  (table) => [
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
    check(
      "users_role_values",
      sql`${table.role} in (${sql.raw(userRoles.map((r) => `'${r}'`).join(", "))})`,
    ),
  ],
);
