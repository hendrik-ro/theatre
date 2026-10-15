export interface User {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
  role: "user" | "admin";
}
