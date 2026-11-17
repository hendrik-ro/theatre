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
    await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    await createTestUser("user3", "user3@test.com");
    await deleteUser(user2.id);
    const result = await getAllUsers();

    expect(result).toHaveLength(2);
  });

  it("rejects malformed user id", async () => {
    await expect(deleteUser("noUserId")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});
