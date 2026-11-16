import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  SERVER_PORT: z.coerce.number().int().min(0).max(65535),
  ALLOWED_ORIGINS: z
    .string()
    .refine(
      (val) => val.split(",").every((o) => o.trim() !== ""),
      "ALLOWED_ORIGINS must be a comma-separated list of non-empty origins",
    ),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default("postgres"),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().min(0).max(65535).default(5432),
  POSTGRES_DB: z.string().default("theatre"),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
});

const envPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.env",
);
dotenv.config({ path: envPath });

const env = configSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  serverPort: env.SERVER_PORT,
  allowedOrigins: env.ALLOWED_ORIGINS,
  dbUrl: `postgres://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
  jwtSecret: env.JWT_SECRET,
  refreshSecret: env.REFRESH_SECRET,
};
