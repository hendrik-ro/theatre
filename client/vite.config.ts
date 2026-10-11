import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

// The repo keeps a single .env at the monorepo root; Vite only loads
// env files from its own root by default.
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const clientPort = Number(process.env.CLIENT_PORT) || 5173;
const serverPort = Number(process.env.SERVER_PORT) || 3000;

export default defineConfig({
  plugins: [react()],
  server: {
    port: clientPort,
    proxy: {
      "/api": `http://localhost:${serverPort}`,
    },
  },
});
