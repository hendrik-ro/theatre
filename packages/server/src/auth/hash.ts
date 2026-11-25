import argon2 from "argon2";
import { createHash } from "node:crypto";
import { logEvent } from "../logger.js";

export const DUMMY_HASH =
  "$argon2id$v=19$m=32768,t=3,p=4$B7te6gkQDXlwnc0pcXcjRA$L7EZ6MFzugsTknJZMJGsLhuE1Yt0i28oH4SX58eC55o";

// Refresh tokens are stored hashed to prevent a db leak from
// yielding reusable credentials. Refresh tokens are high-entropy
// secrets - fast unsalted hash:
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 32 * 1024, // 32MB
      timeCost: 3,
      parallelism: 4,
    });
    return hash;
  } catch (err) {
    logEvent("argon2_hashing_fail", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    logEvent("argon2_verification_fail", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
