import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { usersGetAll } from "../controllers/admin.js";
import {
  usersLogin,
  usersLogout,
  usersRegister,
} from "../controllers/users.js";

const userRouter = Router();

userRouter.post("/register", usersRegister);
userRouter.post("/login", usersLogin);
userRouter.post("/logout", requireAuth, usersLogout);
userRouter.get("/", requireAuth, usersGetAll);

export default userRouter;
