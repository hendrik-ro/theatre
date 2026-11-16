import type { NextFunction, Request, Response } from "express";
import { getCookie, JWT_COOKIE_NAME } from "../auth/cookies.js";
import { verifyAccessToken } from "../auth/jwt.js";
import { isUUID } from "../db/queries/utils.js";
import { getUserById } from "../db/queries/users.js";

const BEARER_PREFIX = "Bearer ";

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next?: NextFunction,
): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith(BEARER_PREFIX)) {
    token = authHeader.slice(BEARER_PREFIX.length);
  }

  if (!token) {
    token = getCookie(JWT_COOKIE_NAME, req.headers.cookie);
  }

  if (!token) {
    next?.();
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token, res.locals.requestId);
  } catch {
    next?.();
    return;
  }
  if (!payload || !isUUID(payload.userId)) {
    next?.();
    return;
  }

  const fullUser = await getUserById(payload.userId);
  if (fullUser) {
    const { passwordHash: _hash, ...user } = fullUser;
    req.user = user;
  }
  next?.();
};
