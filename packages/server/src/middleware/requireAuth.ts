import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors.js";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user) {
    next();
    return;
  }
  next(new HttpError(401, "Authentication required"));
}
