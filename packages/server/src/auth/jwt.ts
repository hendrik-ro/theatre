import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { randomUUID } from "node:crypto";
import { logEvent } from "../logger.js";

// jwt.sign expects seconds; cookie maxAge ms
export const JWT_CONFIG = {
  secret: config.jwtSecret,
  tokenExpiresIn: 60 * 15, // 15 mins
  refreshSecret: config.refreshSecret,
  refreshExpiresIn: 60 * 60 * 24 * 7, // 7 days
};

export const ACCESS_TOKEN_MAX_AGE_MS = JWT_CONFIG.tokenExpiresIn * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = JWT_CONFIG.refreshExpiresIn * 1000;

type UserPayloadInput = {
  userId: string;
  username: string;
  tokenType: "access" | "refresh";
};

type UserPayload = UserPayloadInput & {
  jti: string;
};

export function signToken(payload: UserPayloadInput): string {
  const isAccess = payload.tokenType === "access";
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    isAccess ? JWT_CONFIG.secret : JWT_CONFIG.refreshSecret,
    {
      expiresIn: isAccess
        ? JWT_CONFIG.tokenExpiresIn
        : JWT_CONFIG.refreshExpiresIn,
    },
  );
}

function verifyTypedToken(
  tokenType: "access" | "refresh",
  token: string,
  requestId?: string,
): UserPayload {
  const secret =
    tokenType === "access" ? JWT_CONFIG.secret : JWT_CONFIG.refreshSecret;
  try {
    const payload = jwt.verify(token, secret) as UserPayload;
    if (payload.tokenType !== tokenType) {
      logEvent("jwt_invalid_token", {
        requestId,
        tokenType,
        presentedType: payload.tokenType,
        reason: "token_type_mismatch",
      });
      throw new jwt.JsonWebTokenError("Invalid token type");
    }
    return payload;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw Error;
    }
    logEvent("jwt_invalid_token", {
      requestId,
      tokenType,
      reason: "verification_failed",
    });
    throw new jwt.JsonWebTokenError("Invalid token");
  }
}

export function verifyAccessToken(
  token: string,
  requestId?: string,
): UserPayload {
  return verifyTypedToken("access", token, requestId);
}

export function verifyRefreshToken(
  token: string,
  requestId?: string,
): UserPayload {
  return verifyTypedToken("refresh", token, requestId);
}
