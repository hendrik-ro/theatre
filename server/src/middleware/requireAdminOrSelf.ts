import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors.js";

// Must run after requireAuth, which attaches req.user. Allows admins to act
// on any :id, and regular users only on their own id. The 401 branch guards
// against this middleware being wired up without requireAuth in front of it.
export function requireAdminOrSelf(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new HttpError(401, "Authentication required"));
    return;
  }
  if (req.user.role === "admin" || req.user.id === req.params.id) {
    next();
    return;
  }
  next(new HttpError(403, "Admin access required"));
}
