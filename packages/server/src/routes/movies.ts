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

export const moviesRouter = Router();

// role-based restrictions (admin-only writes) come with the roles rework
moviesRouter.get("/", asyncHandler(moviesAll));
moviesRouter.post("/", requireAuth, asyncHandler(moviesAdd));
moviesRouter.delete("/:id", requireAdmin, asyncHandler(moviesDelete));
moviesRouter.get("/:id", asyncHandler(moviesGetById));
moviesRouter.patch("/:id", requireAuth, asyncHandler(moviesUpdate));

export default moviesRouter;
