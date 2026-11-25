import request from "supertest";
import { app } from "../../src/index.js";
import type { UserRole } from "@theatre/shared";

export type TestAgent = ReturnType<typeof request.agent>;

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
};

let userCounter = 0;

// Registers a user through the API and returns an agent holding the auth
// cookies. The FIRST session created after a resetDB() claims the bootstrap
// admin role (createUser's firstAdmin rule); every later session in the
// same file is a regular user.
export async function createSession(
  username?: string,
): Promise<{ agent: TestAgent; user: SessionUser }> {
  userCounter += 1;
  const name = username ?? `user${userCounter}`;
  const agent = request.agent(app);
  const res = await agent.post("/users/register").send({
    username: name,
    email: `${name}@test.com`,
    password: "password123",
  });
  if (res.status !== 201) {
    throw new Error(`test setup: register failed with ${res.status}`);
  }
  const me = await agent.get("/users");
  if (me.status !== 200) {
    throw new Error(`test setup: GET /users after register failed`);
  }
  return { agent, user: me.body.user as SessionUser };
}

// supertest types the set-cookie header inconsistently; normalize to a
// plain list of cookie strings.
export function setCookies(res: {
  headers: Record<string, unknown>;
}): string[] {
  const raw = res.headers["set-cookie"];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return [raw];
  return [];
}
