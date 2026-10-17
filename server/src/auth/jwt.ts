// jsonwebtoken is CJS without statically-detectable named exports, so raw
// Node ESM (tsx) rejects `import { sign } from "jsonwebtoken"`; the default
// import rides esModuleInterop instead.
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { randomUUID } from "node:crypto";

// jwt.sign expects seconds; cookie maxAge expects milliseconds.
export const JWT_CONFIG = {
  secret: config.jwtSecret,
  tokenExpiresIn: 60 * 15, // 15 min, seconds
  refreshSecret: config.refreshSecret,
  refreshExpiresIn: 60 * 60 * 24 * 7, // 7 days, seconds
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
  const expiry =
    payload.tokenType === "access"
      ? JWT_CONFIG.tokenExpiresIn
      : JWT_CONFIG.refreshExpiresIn;
  const secret =
    payload.tokenType === "access"
      ? JWT_CONFIG.secret
      : JWT_CONFIG.refreshSecret;
  return jwt.sign({ ...payload, jti: randomUUID() }, secret, {
    expiresIn: expiry,
  });
}

function verifyToken(token: string, type: string): UserPayload {
  const secret =
    type === "access" ? JWT_CONFIG.secret : JWT_CONFIG.refreshSecret;
  try {
    const payload = jwt.verify(token, secret);
    return payload as UserPayload;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw err;
    }
    throw new jwt.JsonWebTokenError("Invalid token");
  }
}

export function verifyAccessToken(token: string): UserPayload {
  const decoded = verifyToken(token, "access");
  if (decoded.tokenType !== "access") {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): UserPayload {
  const decoded = verifyToken(token, "secret");
  if (decoded.tokenType !== "refresh") {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }
  return decoded;
}
