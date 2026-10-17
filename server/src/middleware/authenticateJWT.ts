import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import { isUUID } from "../db/queries/utils.js";
import { getUserById } from "../db/queries/users.js";

const BEARER_PREFIX = "Bearer ";
export const COOKIE_NAME = "theatre.jwt";
export const REFRESH_COOKIE_NAME = "theatre.refresh";

export function getCookie(
  name: string,
  cookieHeader?: string,
): string | undefined {
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

// Best-effort: mounted globally, it attaches req.user when the request
// carries a valid access token (Bearer header or theatre.jwt cookie) and
// otherwise passes through silently. Enforcing authentication — and
// rejecting the request — is requireAuth's job per route; an invalid or
// expired token here simply means the session fallback may still apply.
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
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (!payload || !isUUID(payload.userId)) {
      next();
      return;
    }

    getUserById(payload.userId)
      .then((user) => {
        if (user) {
          req.user = user;
        }
        next();
      })
      .catch(next);
  } catch {
    next();
  }
}
