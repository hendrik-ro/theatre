import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  usersLogin,
  usersLogout,
  usersMe,
  usersRefresh,
  usersRegister,
} from "../controllers/users.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userRouter = Router();

userRouter.get("/", requireAuth, asyncHandler(usersMe));
userRouter.post("/register", asyncHandler(usersRegister));
userRouter.post("/login", asyncHandler(usersLogin));
userRouter.post("/logout", requireAuth, asyncHandler(usersLogout));
userRouter.post("/refresh", asyncHandler(usersRefresh));

export default userRouter;
