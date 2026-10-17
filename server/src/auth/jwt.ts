import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import { config } from "../config.js";
import { randomUUID } from "node:crypto";

export const JWT_CONFIG = {
  secret: config.jwtSecret,
  tokenExpiresIn: 60 * 15, // 15 min
  refreshExpiresIn: 60 * 60 * 24 * 7, // 7 days
};

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

export function verifyToken(token: string): UserPayload {
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

export function verifyRefreshToken(token: string): UserPayload {
  const decoded = verifyToken(token);
  if (decoded.tokenType !== "refresh") {
    throw new JsonWebTokenError("Invalid token type");
  }
  return decoded;
}
