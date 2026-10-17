import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { config } from "../config.js";
import { createHash, randomUUID } from "node:crypto";

// jwt.sign expects seconds; cookie maxAge expects milliseconds.
export const JWT_CONFIG = {
  secret: config.jwtSecret,
  tokenExpiresIn: 60 * 15, // 15 min, seconds
  refreshExpiresIn: 60 * 60 * 24 * 7, // 7 days, seconds
};

export const ACCESS_TOKEN_MAX_AGE_MS = JWT_CONFIG.tokenExpiresIn * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = JWT_CONFIG.refreshExpiresIn * 1000;

// Refresh tokens are stored hashed so a database leak does not yield
// reusable credentials. No salt needed — the token is high-entropy.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
  return sign({ ...payload, jti: randomUUID() }, JWT_CONFIG.secret, {
    expiresIn: expiry,
  });
}

function verifyToken(token: string): UserPayload {
  try {
    const payload = verify(token, JWT_CONFIG.secret);
    return payload as UserPayload;
  } catch (err) {
    if (err instanceof JsonWebTokenError) {
      throw err;
    }
    throw new JsonWebTokenError("Invalid token");
  }
}

export function verifyAccessToken(token: string): UserPayload {
  const decoded = verifyToken(token);
  if (decoded.tokenType !== "access") {
    throw new JsonWebTokenError("Invalid token type");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): UserPayload {
  const decoded = verifyToken(token);
  if (decoded.tokenType !== "refresh") {
    throw new JsonWebTokenError("Invalid token type");
  }
  return decoded;
}
