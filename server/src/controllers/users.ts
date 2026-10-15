import { hashPassword, verifyPassword } from "../auth/hash.js";
import type { AsyncRequestHandler } from "../utils/asyncHandler.js";
import { userLoginSchema, userRegistrationSchema } from "../models/users.js";
import {
  createUser,
  getUserByEmail,
  setLastLogin,
} from "../db/queries/users.js";
import {
  destroySession,
  regenerateSession,
  SESSION_COOKIE_NAME,
} from "../middleware/session.js";

export const usersRegister: AsyncRequestHandler = async (req, res) => {
  const input = userRegistrationSchema.parse(req.body);
  const hash = await hashPassword(input.password);
  if (!hash) {
    throw new Error("Password hashing failed");
  }
  const newUser = await createUser(input.username, input.email, hash);
  res.status(201).json({ message: `User ${newUser.username} created` });
};

export const usersLogin: AsyncRequestHandler = async (req, res) => {
  const input = userLoginSchema.parse(req.body);
  const user = await getUserByEmail(input.email);
  // Same response for unknown email and wrong password: answering
  // differently leaks which emails are registered.
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (isValid === null) {
    throw new Error("Password verification failed");
  }
  if (!isValid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  // Drop the pre-auth session and issue a fresh sid before granting
  // authenticated state, so a session fixation attempt cannot carry a
  // known sid across login.
  await regenerateSession(req);
  req.session!.userId = user.id;
  await setLastLogin(user.id);

  res.status(200).json({ username: user.username });
};

export const usersLogout: AsyncRequestHandler = async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME);
  res.status(200).json({ message: "Logged out" });
};

// requireAuth must have run; it attaches the session's user to req.user.
export const usersMe: AsyncRequestHandler = async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new Error("requireAuth middleware not mounted");
  }
  res.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
};
