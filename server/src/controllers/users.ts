import { NextFunction, Request, Response } from "express";
import { hashPassword, verifyPassword } from "../auth/hash.js";
import { userLoginSchema, userRegistrationSchema } from "../models/users.js";
import { createUser, getUserByEmail } from "../db/queries/users.js";

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
    const newUser = await createUser(input.name, input.email, hash);
    res.status(201).json({ message: `User ${newUser.name} created` });
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
    res.status(200).json({ name: user.name });
  } catch (err) {
    next(err);
  }
};

export const usersGetAll = async (
  _req: Request,
  _res: Response,
  _next: NextFunction,
) => {
  console.log("not yet implemented");
};

export const usersDelete = async (
  _req: Request,
  _res: Response,
  _next: NextFunction,
) => {
  console.log("not yet implemented");
};
