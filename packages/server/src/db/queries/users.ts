import type { User, UserRole } from "@theatre/shared";
import { db } from "../index.js";
import { users } from "../schema/users.sql.js";
import { firstAdmin } from "./bootstrap.js";
import { HttpError } from "../../utils/errors.js";
import { assertUUID, firstOrUndefined } from "./utils.js";
import { eq } from "drizzle-orm";

export async function createUser(
  username: string,
  email: string,
  passwordHash: string,
): Promise<User & { firstAdmin: boolean }> {
  // Atomic firstAdmin
  // firstAdmin receives super user role
  return db.transaction(async (tx) => {
    const claimed = await firstAdmin(tx);
    const role = claimed.length === 1 ? "super" : "user";
    const [newUser] = await tx
      .insert(users)
      .values({
        username,
        email: email.toLowerCase(),
        passwordHash,
        role,
      })
      .returning();
    if (!newUser) throw new HttpError(500, "user insert returned no rows");
    return { ...newUser, firstAdmin: claimed.length === 1 };
  });
}

export async function deleteUser(id: string): Promise<void> {
  assertUUID(id);
  await db.delete(users).where(eq(users.id, id));
}

export async function getAllUsers(): Promise<User[]> {
  return await db.select().from(users);
}

export async function getUserById(id: string): Promise<User | undefined> {
  assertUUID(id);
  const user = await db.select().from(users).where(eq(users.id, id));
  return firstOrUndefined(user);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return firstOrUndefined(user);
}

export async function getUserByUsername(
  username: string,
): Promise<User | undefined> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return firstOrUndefined(user);
}

export async function setLastLogin(id: string): Promise<void> {
  assertUUID(id);
  const [user] = await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!user) throw new HttpError(404, "User not found");
}

export async function changeRole(id: string, newRole: UserRole): Promise<User> {
  assertUUID(id);
  const [user] = await db
    .update(users)
    .set({ role: newRole })
    .where(eq(users.id, id))
    .returning();
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export async function updateUser(
  userId: string,
  overwrites: {
    username?: string;
    email?: string;
    passwordHash?: string;
    role?: UserRole;
  },
): Promise<User> {
  assertUUID(userId);
  const [user] = await db
    .update(users)
    .set(overwrites)
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw new HttpError(404, "User not found");
  return user;
}
