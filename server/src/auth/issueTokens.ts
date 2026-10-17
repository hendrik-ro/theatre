import type { Response } from "express";
import { config } from "../config.js";
import { hashToken } from "./hash.js";
import {
  REFRESH_TOKEN_MAX_AGE_MS,
  ACCESS_TOKEN_MAX_AGE_MS,
  signToken,
} from "./jwt.js";
import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "../middleware/authenticateJWT.js";
import { createRefreshToken } from "../db/queries/refreshTokens.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.env === "production",
  path: "/",
};

type TokenUser = {
  id: string;
  username: string;
};

// Signs an access + refresh pair, persists the refresh token (hashed) as
// the user's single active row, and ships both as HTTP-only cookies.
// The upsert replaces any previous token, so login and refresh both rotate.
export async function issueTokens(
  res: Response,
  user: TokenUser,
): Promise<void> {
  const access = signToken({
    userId: user.id,
    username: user.username,
    tokenType: "access",
  });
  const refresh = signToken({
    userId: user.id,
    username: user.username,
    tokenType: "refresh",
  });

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
  await createRefreshToken(user.id, hashToken(refresh), expiresAt);

  res.cookie(COOKIE_NAME, access, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
  res.cookie(REFRESH_COOKIE_NAME, refresh, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

// clearCookie must repeat the original options (path, sameSite, secure);
// otherwise browsers keep the cookie.
export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
}
