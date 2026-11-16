import { pgTable, varchar } from "drizzle-orm/pg-core";

export const bootstrap = pgTable("bootstrap", {
  key: varchar("key").primaryKey(),
});
