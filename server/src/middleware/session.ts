import session from "express-session";
import type { Request } from "express";
import { config } from "../config.js";
import { SESSION_MAX_AGE_MS, sessionStore } from "../db/sessionStore.js";

export const SESSION_COOKIE_NAME = "theatre.sid";

export const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: config.env === "production",
    maxAge: SESSION_MAX_AGE_MS,
  },
});

// express-session's regenerate is callback-based; promisified for the
// login flow so session-fixation protection reads as awaitable code.
export function regenerateSession(req: Request): Promise<void> {
  const { session } = req;
  if (!session) {
    // Unreachable when the session middleware is mounted; the guard keeps
    // the optional session typing honest instead of asserting it away.
    return Promise.reject(new Error("Session middleware not mounted"));
  }
  return new Promise((resolve, reject) =>
    session.regenerate((err) => (err ? reject(err) : resolve())),
  );
}

// Same promisification for req.session.destroy, used by the logout flow.
export function destroySession(req: Request): Promise<void> {
  const { session } = req;
  if (!session) {
    return Promise.reject(new Error("Session middleware not mounted"));
  }
  return new Promise((resolve, reject) =>
    session.destroy((err) => (err ? reject(err) : resolve())),
  );
}
