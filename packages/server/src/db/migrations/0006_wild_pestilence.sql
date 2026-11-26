ALTER TABLE "users" DROP CONSTRAINT "users_role_values";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_values" CHECK ("users"."role" in ('user', 'admin', 'super'));