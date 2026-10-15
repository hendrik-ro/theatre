import { Router } from "express";
import {
  moviesCreate,
  moviesDeleteById,
  moviesGetAll,
  moviesGetById,
  moviesMetaData,
  moviesUpdateById,
} from "../controllers/movies.js";

const movieRouter = Router();

movieRouter.get("/", moviesGetAll);
movieRouter.get("/meta", moviesMetaData);
movieRouter.get("/:id", moviesGetById);
movieRouter.post("/", moviesCreate);
movieRouter.post("/:id", moviesUpdateById);
movieRouter.delete("/:id", moviesDeleteById);

export default movieRouter;
