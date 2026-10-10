import { Router } from "express";
import {
  moviesCreate,
  moviesGetAll,
  moviesGetById,
} from "../controllers/movies.js";

const router = Router();

router.get("/", moviesGetAll);
router.get("/:name", moviesGetById);
router.post("/", moviesCreate);

export default router;
