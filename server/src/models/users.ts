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

export const userRegistrationSchema = z.object({
  username: z.string().trim().min(3).max(12),
  email: z.email(),
  password: z.string().trim().min(8).max(20),
});

export const userLoginSchema = z.object({
  email: z.email(),
  password: z.string().trim().min(8).max(20),
});
