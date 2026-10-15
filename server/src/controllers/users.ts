import { NextFunction, Request, Response } from "express";
import { hashPassword, verifyPassword } from "../auth/hash.js";
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

export const usersRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = userRegistrationSchema.parse(req.body);
    const hash = await hashPassword(input.password);
    if (!hash) {
      throw new Error("Password hashing failed");
    }
    const newUser = await createUser(input.username, input.email, hash);
    res.status(201).json({ message: `User ${newUser.username} created` });
  } catch (err) {
    next(err);
  }
};

export const usersLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = userLoginSchema.parse(req.body);
    const user = await getUserByEmail(input.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Drop the pre-auth session and issue a fresh sid before granting
    // authenticated state, so a session fixation attempt cannot carry a
    // known sid across login.
    await regenerateSession(req);
    req.session!.userId = user.id;
    await setLastLogin(user.id);

    res.status(200).json({ username: user.username });
  } catch (err) {
    next(err);
  }
};

export const usersLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await destroySession(req);
    res.clearCookie(SESSION_COOKIE_NAME);
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};
