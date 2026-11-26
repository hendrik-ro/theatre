import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  usersLogin,
  usersLogout,
  usersSelf,
  usersRefresh,
  usersRegister,
  usersSelfUpdate,
} from "../controllers/users.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  watchlistsAddMovie,
  watchlistsGet,
  watchlistsRemoveMovie,
} from "../controllers/watchlists.js";

export const userRouter = Router();
const watchlistRouter = Router({ mergeParams: true });

watchlistRouter.get("/", requireAuth, asyncHandler(watchlistsGet));
watchlistRouter.post(
  "/:movieId",
  requireAuth,
  asyncHandler(watchlistsAddMovie),
);
watchlistRouter.delete(
  "/:movieId",
  requireAuth,
  asyncHandler(watchlistsRemoveMovie),
);

userRouter.use("/watchlist", watchlistRouter);

userRouter.get("/", requireAuth, asyncHandler(usersSelf));
userRouter.patch("/", requireAuth, asyncHandler(usersSelfUpdate));
userRouter.post("/register", asyncHandler(usersRegister));
userRouter.post("/login", asyncHandler(usersLogin));
userRouter.post("/logout", requireAuth, asyncHandler(usersLogout));
userRouter.post("/refresh", asyncHandler(usersRefresh));

export default userRouter;
