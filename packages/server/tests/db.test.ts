import { beforeEach, describe, expect, it } from "vitest";
import { createTestUser, resetDB } from "./helpers.js";
import {
  deleteUser,
  getAllUsers,
  getUserById,
} from "../src/db/queries/users.js";

beforeEach(async () => {
  await resetDB();
});

describe("createUser", () => {
  it("creates a new bootstrap admin", async () => {
    const result = await createTestUser();

    expect(result).toMatchObject({
      username: "user",
      email: "user@test.com",
      firstAdmin: true,
    });
  });

  it("creates a regular user after bootstrap", async () => {
    await createTestUser("admin", "admin@test.com");
    const result = await createTestUser();

    expect(result).toMatchObject({
      username: "user",
      email: "user@test.com",
      firstAdmin: false,
    });
  });

  it("rejects duplicate username", async () => {
    await createTestUser();

    await expect(
      createTestUser("user", "user2@test.com"),
    ).rejects.toMatchObject({
      cause: { code: "23505", constraint_name: "users_username_unique" },
    });
  });

  it("rejects duplicate email", async () => {
    await createTestUser();

    await expect(
      createTestUser("user2", "user@test.com"),
    ).rejects.toMatchObject({
      cause: { code: "23505", constraint_name: "users_email_unique" },
    });
  });
});

describe("deleteUser", () => {
  it("deletes an existing user", async () => {
    const user = await createTestUser();
    await deleteUser(user.id);
    const result = await getUserById(user.id);

    expect(result).toBeUndefined();
  });

  it("leaves other users untouched", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const user3 = await createTestUser("user3", "user3@test.com");
    await deleteUser(user2.id);
    const result = await getAllUsers();

    expect(result).toMatchObject([
      {
        id: user1.id,
        createdAt: user1.createdAt,
        updatedAt: user1.updatedAt,
        username: user1.username,
        email: user1.email,
        emailVerifiedAt: user1.emailVerifiedAt,
        role: user1.role,
        passwordHash: user1.passwordHash,
      },
      {
        id: user3.id,
        createdAt: user3.createdAt,
        updatedAt: user3.updatedAt,
        username: user3.username,
        email: user3.email,
        emailVerifiedAt: user3.emailVerifiedAt,
        role: user3.role,
        passwordHash: user3.passwordHash,
      },
    ]);
  });

  it("rejects malformed user id", async () => {
    await expect(deleteUser("noUserId")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});
