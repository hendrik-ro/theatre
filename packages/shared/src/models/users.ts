import z from "zod";

const NAME = { min: 3, max: 24 } as const;
const PASSWORD = { min: 8, max: 64 } as const;

export const userRoles = ["user", "admin"] as const; // add super user to replace firstAdmin and guard against deletion
export const userRolesSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof userRolesSchema>;

const usernameSchema = z.string().trim().min(NAME.min).max(NAME.max);
const passwordSchema = z.string().min(PASSWORD.min).max(PASSWORD.max);
const emailSchema = z.email();

export const userSchema = z.object({
  id: z.uuid(),
  username: usernameSchema,
  email: emailSchema,
  emailVerifiedAt: z.date().nullable(),
  passwordHash: z.string(),
  role: userRolesSchema,
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof userSchema>;

// Everything the API ever returns; passwordHash never leaves the server
export const publicUserSchema = userSchema.omit({ passwordHash: true });
export type PublicUser = z.infer<typeof publicUserSchema>;

export const userRegistrationSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export const userLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});
