import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestUser,
  omitUserFirstAdmin,
  resetDB,
  ZERO_UUID,
} from "../helpers.js";
import {
  changeRole,
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  setLastLogin,
} from "../../src/db/queries/users.js";

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

describe("getAllUsers", () => {
  it("returns all users", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser("user2", "user2@test.com");
    const result = await getAllUsers();

    expect(result).toEqual(
      expect.arrayContaining([
        omitUserFirstAdmin(user1),
        omitUserFirstAdmin(user2),
      ]),
    );
  });

  it("returns an empty array if no users exist", async () => {
    const result = await getAllUsers();

    expect(result).toHaveLength(0);
  });
});

describe("getUserById", () => {
  it("returns a user by user id", async () => {
    const user = await createTestUser();
    const result = await getUserById(user.id);

    expect(result).toMatchObject(omitUserFirstAdmin(user));
  });

  it("returns undefined for non-existing user", async () => {
    expect(await getUserById(ZERO_UUID)).toBeUndefined();
  });

  it("rejects malformed user id", async () => {
    await expect(getUserById("malformed-user-id")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});

describe("getUserByEmail", () => {
  it("returns a user by email", async () => {
    const user = await createTestUser();
    const result = await getUserByEmail(user.email);

    expect(result).toMatchObject(omitUserFirstAdmin(user));
  });

  it("is case insensitive", async () => {
    const user = await createTestUser();
    const result = await getUserByEmail("USER@test.com");

    expect(result).toMatchObject(omitUserFirstAdmin(user));
  });

  it("returns undefined for non-existing user", async () => {
    expect(await getUserByEmail("user@test.com")).toBeUndefined();
  });
});

describe("getUserByUsername", () => {
  it("returns a user by username", async () => {
    const user = await createTestUser();
    const result = await getUserByUsername(user.username);

    expect(result).toMatchObject(omitUserFirstAdmin(user));
  });

  it("returns undefined for non-existing user", async () => {
    expect(await getUserByUsername("user")).toBeUndefined();
  });
});

describe("setLastLogin", () => {
  it("updates lastLoginAt", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const user = await createTestUser();
      const loginTime = new Date("2026-06-01T12:00:00.123Z");
      vi.setSystemTime(loginTime);

      await setLastLogin(user.id);
      const result = await getUserById(user.id);

      expect(result?.lastLoginAt).toEqual(loginTime);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects unmatched user id", async () => {
    await expect(setLastLogin(ZERO_UUID)).rejects.toMatchObject({
      message: "User not found",
      status: 404,
      name: "HttpError",
    });
  });

  it("rejects malformed user id", async () => {
    await expect(setLastLogin("malformed-user-id")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});

describe("changeRole", () => {
  it("changes the role to admin", async () => {
    await createTestUser("admin", "admin@test.com");
    const user = await createTestUser();
    await changeRole(user.id, "admin");

    expect(await getUserById(user.id)).toMatchObject({
      id: user.id,
      role: "admin",
    });
  });

  it("changes the role to user", async () => {
    const admin = await createTestUser();
    await changeRole(admin.id, "user");

    expect(await getUserById(admin.id)).toMatchObject({
      id: admin.id,
      role: "user",
    });
  });

  it("rejects unmatched user id", async () => {
    await expect(changeRole(ZERO_UUID, "user")).rejects.toMatchObject({
      message: "User not found",
      status: 404,
      name: "HttpError",
    });
  });

  it("rejects malformed user id", async () => {
    await expect(
      changeRole("malformed-user-id", "admin"),
    ).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
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

    expect(result).toEqual(
      expect.arrayContaining([
        omitUserFirstAdmin(user1),
        omitUserFirstAdmin(user3),
      ]),
    );
  });

  it("is idempotent: zero rows is not an error", async () => {
    await expect(deleteUser(ZERO_UUID)).resolves.toBeUndefined();
  });

  it("rejects malformed user id", async () => {
    await expect(deleteUser("malformed-user-id")).rejects.toMatchObject({
      message: "Invalid UUID",
      status: 400,
      name: "HttpError",
    });
  });
});
