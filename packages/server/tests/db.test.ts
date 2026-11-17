import { beforeEach, describe, expect, it } from "vitest";
import { createTestUser, resetDB } from "./helpers.js";

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
