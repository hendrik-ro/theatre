import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors.js";
import { verifyToken } from "../auth/jwt.js";
import { isUUID } from "../db/queries/utils.js";
import { getUserById } from "../db/queries/users.js";

const BEARER_PREFIX = "Bearer ";
const COOKIE_NAME = "theatre.jwt";

function getCookie(name: string, cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;

  const cookie: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [key, value] = c.trim().split("=");
    if (key) {
      cookie[key] = value;
    }
  });
  return cookie[name];
}

export function authenticateJWT(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith(BEARER_PREFIX)) {
    token = authHeader.slice(BEARER_PREFIX.length);
  }

  if (!token) {
    token = getCookie(COOKIE_NAME, req.headers.cookie);
  }

  if (!token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const payload = verifyToken(token);

    if (!payload || !isUUID(payload.userId)) {
      next(new HttpError(401, "Invalid token payload"));
      return;
    }

    getUserById(payload.userId)
      .then((user) => {
        if (!user) {
          next(new HttpError(401, "Authentication required"));
          return;
        }
        req.user = user;
        next();
      })
      .catch(next);
  } catch {
    next(new HttpError(401, "Invalid token"));
  }
}
