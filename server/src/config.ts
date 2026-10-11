import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  CLIENT_PORT: z.coerce.number().int().min(0).max(65535),
  SERVER_PORT: z.coerce.number().int().min(0).max(65535),
  DB_URL: z.url(),
});

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const env = schema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  clientPort: env.CLIENT_PORT,
  serverPort: env.SERVER_PORT,
  dbURL: env.DB_URL,
};
