import { eq } from "drizzle-orm";
import { HttpError } from "../../utils/errors.js";
import { db } from "../index.js";
import { users } from "../schema/users.sql.js";
import { firstOrUndefined, isUUID } from "./utils.js";
import { User } from "../../models/users.js";
import { config } from "../../config.js";

export async function getAllUsers(): Promise<User[]> {
  const result = await db.select().from(users);
  return result;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  role: "user" | "admin" = "user",
): Promise<User> {
  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    })
    .returning();
  return newUser;
}

export async function deleteUser(id: string): Promise<void> {
  if (!isUUID(id)) throw new HttpError(400, "Invalid UUID");
  await db.delete(users).where(eq(users.id, id));
}

export async function getUserByName(name: string): Promise<User | undefined> {
  const user = await db.select().from(users).where(eq(users.name, name));
  return firstOrUndefined(user);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const user = await db.select().from(users).where(eq(users.email, email));
  return firstOrUndefined(user);
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (!isUUID(id)) throw new HttpError(400, "Invalid UUID");
  const user = await db.select().from(users).where(eq(users.id, id));
  return firstOrUndefined(user);
}

export async function resetUsers(): Promise<void> {
  if (!["development", "test"].includes(config.env)) return;
  await db.delete(users);
}

export async function updateUser(
  id: string,
  name: string,
  email: string,
  passwordHash: string,
  role: "user" | "admin",
): Promise<User> {
  if (!isUUID(id)) throw new HttpError(400, "Invalid UUID");
  const [user] = await db
    .update(users)
    .set({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    })
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function setEmailVerified(id: string): Promise<User> {
  if (!isUUID(id)) throw new HttpError(400, "Invalid UUID");
  const [user] = await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return user;
}
