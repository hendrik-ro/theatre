import {
  movieInputSchema,
  movieQuerySchema,
  movieUpdateSchema,
} from "@theatre/shared";
import {
  createMovie,
  deleteMovie,
  getMovieById,
  getMovies,
  updateMovie,
} from "../db/queries/movies.js";
import type { AsyncRequestHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/errors.js";

export const moviesAdd: AsyncRequestHandler = async (req, res) => {
  const input = movieInputSchema.parse(req.body);
  const movie = await createMovie(input);
  res.status(201).json(movie);
};

export const moviesDelete: AsyncRequestHandler = async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") throw new HttpError(400, "Invalid movie id");
  await deleteMovie(id);
  res.sendStatus(204);
};

export const moviesAll: AsyncRequestHandler = async (req, res) => {
  const filter = movieQuerySchema.parse(req.query);
  const movies = await getMovies(filter, req.user?.id);
  res.status(200).json(movies);
};

export const moviesGetById: AsyncRequestHandler = async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") throw new HttpError(400, "Invalid movie id");
  const movie = await getMovieById(id, req.user?.id);
  if (!movie) {
    res.status(404).json({ message: `Movie ${id} not found` });
    return;
  }
  res.status(200).json(movie);
};

export const moviesUpdate: AsyncRequestHandler = async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") throw new HttpError(400, "Invalid movie id");
  const input = movieUpdateSchema.parse(req.body);
  const movie = await updateMovie(id, input);
  if (!movie) {
    res.status(404).json({ message: `Movie ${id} not found` });
    return;
  }
  res.status(200).json(movie);
};
