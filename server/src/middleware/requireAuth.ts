import type { NextFunction, Request, Response } from "express";
import { getUserById } from "../db/queries/users.js";
import { isUUID } from "../db/queries/utils.js";
import { HttpError } from "../utils/errors.js";

/**
 * Allows a request through when:
 * - req.user is already set (by authenticateJWT middleware)
 * - OR the request carries a valid session with existing user
 *
 * Attaches the user to req.user for downstream middleware.
 * Sessions of deleted users are destroyed on sight.
 * Authorization (roles) is requireAdmin's job.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // JWT
  if (req.user) {
    return next();
  }

  // Fallback session-based auth
  const userId = req.session?.userId;
  if (!userId || !isUUID(userId)) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  getUserById(userId)
    .then((user) => {
      if (!user) {
        req.session?.destroy(() => {});
        next(new HttpError(401, "Authentication required"));
        return;
      }
      // Attached for downstream middleware and handlers; requireAdmin and
      // any future role check reads it instead of re-querying.
      req.user = user;
      next();
    })
    .catch(next);
}
