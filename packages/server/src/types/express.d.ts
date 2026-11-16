import type { User } from "@theatre/shared";

declare global {
  namespace Express {
    interface Request {
      // Attached by authenticateJWT when a valid access token is present
      // and the user still exists; role checks (requireAdmin) read it
      // instead of re-querying the database.
      user?: Omit<User, "passwordHash">;
    }
  }
}

export {};
