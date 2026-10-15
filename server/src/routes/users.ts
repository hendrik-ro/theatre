import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { usersDelete, usersGetAll } from "../controllers/admin.js";
import {
  usersLogin,
  usersLogout,
  usersRegister,
} from "../controllers/users.js";

const userRouter = Router();

userRouter.post("/register", usersRegister);
userRouter.post("/login", usersLogin);
userRouter.post("/logout", requireAuth, usersLogout);
userRouter.get("/", requireAuth, requireAdmin, usersGetAll);
userRouter.delete("/:id", requireAuth, requireAdmin, usersDelete);

export default userRouter;
