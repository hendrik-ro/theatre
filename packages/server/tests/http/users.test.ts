import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDB } from "../helpers.js";
import { setCookies } from "./helpers.js";
import { app } from "../../src/index.js";
import { publicUserSchema } from "@theatre/shared";

const registerInput = {
  username: "user",
  email: "user@test.com",
  password: "password123",
};

describe("/users", () => {
  beforeEach(async () => {
    await resetDB();
  });

  describe("POST /users/register", () => {
    it("creates a new user with auth cookies", async () => {
      const res = await request(app)
        .post("/users/register")
        .send(registerInput);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        user: {
          username: registerInput.username,
          email: registerInput.email,
          role: "super",
        },
      });
      const cookies = setCookies(res);
      expect(cookies).toHaveLength(2);
      expect(cookies.join()).toContain("HttpOnly");
      expect(cookies.join()).toContain("SameSite=Lax");
      expect(cookies.join()).toContain("theatre.jwt");
      expect(cookies.join()).toContain("theatre.refresh");
    });

    it("logs the new user in", async () => {
      const agent = request.agent(app);

      const res = await agent.post("/users/register").send(registerInput);
      expect(res.status).toBe(201);

      const me = await agent.get("/users");
      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({
        user: {
          username: registerInput.username,
          email: registerInput.email,
          lastLoginAt: expect.anything(),
        },
      });
    });

    it("rejects a duplicate username with 409", async () => {
      await request(app).post("/users/register").send(registerInput);
      const res = await request(app)
        .post("/users/register")
        .send({
          ...registerInput,
          email: "other@test.com",
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: "This username is already taken" });
    });

    it("rejects a duplicate email with 409", async () => {
      await request(app).post("/users/register").send(registerInput);
      const res = await request(app)
        .post("/users/register")
        .send({ ...registerInput, username: "other" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        message: "An account with this email already exists",
      });
    });

    it("rejects invalid input with 400", async () => {
      const res = await request(app).post("/users/register").send({
        username: "x",
        email: "not-an-email",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(typeof res.body.message).toBe("string");
    });
  });

  describe("POST /users/login", () => {
    it("responds with 200, the user, and auth cookies", async () => {
      await request(app).post("/users/register").send(registerInput);
      const res = await request(app).post("/users/login").send({
        username: registerInput.username,
        password: registerInput.password,
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        user: {
          username: registerInput.username,
          email: registerInput.email,
        },
      });
      expect(Object.keys(res.body.user).sort()).toEqual(
        Object.keys(publicUserSchema.shape).sort(),
      );
      const cookies = setCookies(res);
      expect(cookies).toHaveLength(2);
      expect(cookies.join()).toContain("HttpOnly");
    });

    it("rejects a wrong password with 401", async () => {
      await request(app).post("/users/register").send(registerInput);
      const res = await request(app).post("/users/login").send({
        username: registerInput.username,
        password: "wrong-password-123",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Invalid credentials" });
    });

    it("rejects an unknown username with 401", async () => {
      const res = await request(app).post("/users/login").send({
        username: "ghost",
        password: "wrong-password-123",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Invalid credentials" });
    });

    it("does not reveal whether a username exists", async () => {
      await request(app).post("/users/register").send(registerInput);
      const wrongPassword = await request(app).post("/users/login").send({
        username: registerInput.username,
        password: "wrong-password-123",
      });
      const unknownUser = await request(app).post("/users/login").send({
        username: "ghost",
        password: "wrong-password-123",
      });

      expect(wrongPassword.body).toEqual(unknownUser.body);
    });

    it("rejects an empty body with 400", async () => {
      const res = await request(app).post("/users/login").send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /users", () => {
    it("requires authentication", async () => {
      const res = await request(app).get("/users");

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /users", () => {
    it("requires authentication", async () => {
      const res = await request(app)
        .patch("/users")
        .send({ username: "newName" });

      expect(res.status).toBe(401);
    });

    it("updates the user profile", async () => {
      const agent = request.agent(app);
      const registerRes = await agent
        .post("/users/register")
        .send(registerInput);
      const { user } = registerRes.body;
      const res = await agent.patch("/users").send({ username: "newName" });

      // refresh token is not revoked for unchanged password
      const refresh = await agent.post("/users/refresh");
      expect(refresh.status).toBe(200);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        username: "newName",
        email: user.email,
      });
    });

    it("requires the current password to set a new one", async () => {
      const agent = request.agent(app);
      await agent.post("/users/register").send(registerInput);

      const res = await agent
        .patch("/users")
        .send({ password: "newPassword123" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: "Current password required to set a new password",
      });
    });

    it("rejects a wrong current password with 401", async () => {
      const agent = request.agent(app);
      await agent.post("/users/register").send(registerInput);

      const res = await agent.patch("/users").send({
        password: "newPassword123",
        currentPassword: "wrong-password",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Invalid credentials" });
    });

    it("rotates and revokes tokens on password change", async () => {
      const agent = request.agent(app);
      const registerRes = await agent
        .post("/users/register")
        .send(registerInput);
      const oldRefresh = setCookies(registerRes).find((cookie) =>
        cookie.startsWith("theatre.refresh"),
      );
      if (!oldRefresh) throw new Error("no refresh cookie was set");

      const patch = await agent
        .patch("/users")
        .send({ password: "newPassword123", currentPassword: "password123" });
      expect(patch.status).toBe(200);

      // the pre-change refresh token is dead: replay must fail
      const replay = await request(app)
        .post("/users/refresh")
        .set("Cookie", oldRefresh);
      expect(replay.status).toBe(401);

      // the re-issued pair (the agent jar picked it up from the PATCH response)
      // keeps this session alive
      const refresh = await agent.post("/users/refresh");
      expect(refresh.status).toBe(200);
    });

    it("stores email in lowecase", async () => {
      const agent = request.agent(app);
      const registerRes = await agent
        .post("/users/register")
        .send(registerInput);
      const { user } = registerRes.body;
      const res = await agent.patch("/users").send({ email: "NEW@TeSt.cOm" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: user.id,
        email: "new@test.com",
      });
    });
  });

  describe("POST /users/logout", () => {
    it("requires authentication", async () => {
      const res = await request(app).post("/users/logout");

      expect(res.status).toBe(401);
    });

    it("logs out and revokes the session", async () => {
      const agent = request.agent(app);
      await agent.post("/users/register").send(registerInput);

      const res = await agent.post("/users/logout");
      expect(res.status).toBe(200);

      // the session's refresh token is revoked: refreshing it must fail
      const refresh = await agent.post("/users/refresh");
      expect(refresh.status).toBe(401);
    });
  });

  describe("POST /users/refresh", () => {
    it("requires a refresh cookie", async () => {
      const res = await request(app).post("/users/refresh");

      expect(res.status).toBe(401);
    });

    it("rotates the refresh token", async () => {
      await request(app).post("/users/register").send(registerInput);
      const login = await request(app).post("/users/login").send({
        username: registerInput.username,
        password: registerInput.password,
      });
      const refreshCookie = setCookies(login).find((cookie) =>
        cookie.startsWith("theatre.refresh"),
      );
      if (!refreshCookie) throw new Error("no refresh cookie was set");

      const first = await request(app)
        .post("/users/refresh")
        .set("Cookie", refreshCookie);
      expect(first.status).toBe(200);
      expect(first.headers["set-cookie"]).toBeDefined();

      // rotation revokes the presented token: a replay must not refresh
      const replay = await request(app)
        .post("/users/refresh")
        .set("Cookie", refreshCookie);
      expect(replay.status).toBe(401);
    });
  });
});
