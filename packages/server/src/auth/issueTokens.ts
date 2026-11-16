import type { User } from "@theatre/shared";
import type { Response } from "express";
import { REFRESH_TOKEN_MAX_AGE_MS, signToken } from "./jwt.js";
import { setAuthCookies } from "./cookies.js";
import { createRefreshToken } from "../db/queries/refreshTokens.js";
import { hashToken } from "./hash.js";

export async function issueTokens(res: Response, user: User): Promise<void> {
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

  setAuthCookies(res, access, refresh);
}
