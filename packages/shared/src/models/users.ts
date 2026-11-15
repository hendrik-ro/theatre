import { z } from "zod";

export interface User {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
  role: "user" | "admin";
}

const usernameSchema = z.string().min(3).max(24);
const passwordSchema = z.string().min(8).max(64);

export const userRegistrationSchema = z.object({
  username: usernameSchema,
  email: z.email(),
  password: passwordSchema,
});

export const userLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});
