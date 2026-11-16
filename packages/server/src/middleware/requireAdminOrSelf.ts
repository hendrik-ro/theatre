import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors.js";
import { requireAdmin } from "./requireAdmin.js";

export function requireAdminOrSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new HttpError(401, "Authentication required"));
    return;
  }
  // Populated by authenticateJWT - req.user is server controlled
  if (req.user.id === req.params.id) {
    next();
    return;
  }
  requireAdmin(req, res, next);
}
