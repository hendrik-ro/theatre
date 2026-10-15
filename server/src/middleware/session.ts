import session from "express-session";
import { config } from "../config.js";
import { SESSION_MAX_AGE_MS, sessionStore } from "../db/sessionStore.js";

export const sessionMiddleware = session({
  name: "theatre.sid",
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
