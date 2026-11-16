import type { User } from "@theatre/shared";
import type { Request, Response } from "express";

export function requireUser(req: Request): Omit<User, "passwordHash"> {
  const user = req.user;
  if (!user) throw new Error("requireAuth middleware not mounted");
  return user;
}

export function requestId(res: Response): string | undefined {
  return res.locals.requestId;
}
