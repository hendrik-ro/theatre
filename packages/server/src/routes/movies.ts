import { Router } from "express";
import {
  moviesAdd,
  moviesAll,
  moviesDelete,
  moviesGetById,
  moviesUpdate,
} from "../controllers/movies.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  moviesRatingsDelete,
  moviesRatingsPut,
} from "../controllers/movieRatings.js";

export const moviesRouter = Router();
const moviesRatingsRouter = Router({ mergeParams: true });

moviesRatingsRouter.put("/", requireAuth, asyncHandler(moviesRatingsPut));
moviesRatingsRouter.delete("/", requireAuth, asyncHandler(moviesRatingsDelete));

moviesRouter.use("/:movieId/rating", moviesRatingsRouter);

// role-based restrictions (admin-only writes) come with the roles rework
moviesRouter.get("/", asyncHandler(moviesAll));
moviesRouter.post("/", requireAuth, asyncHandler(moviesAdd));
moviesRouter.delete("/:movieId", requireAdmin, asyncHandler(moviesDelete));
moviesRouter.get("/:movieId", asyncHandler(moviesGetById));
moviesRouter.patch("/:movieId", requireAuth, asyncHandler(moviesUpdate));

export default moviesRouter;
