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

export const moviesAdd: AsyncRequestHandler = async (req, res) => {
  const input = movieInputSchema.parse(req.body);
  const movie = await createMovie(input);
  res.status(201).json(movie);
};

export const moviesDelete: AsyncRequestHandler = async (req, res) => {
  const { id } = req.params;
  if (typeof id === "string") {
    await deleteMovie(id);
    res.sendStatus(204);
  }
};

export const moviesAll: AsyncRequestHandler = async (req, res) => {
  const filter = movieQuerySchema.parse(req.body ?? {});
  const movies = await getMovies(filter, req.user?.id);
  res.status(200).json(movies);
};

export const moviesGetById: AsyncRequestHandler = async (req, res) => {
  const { id } = req.params;
  if (typeof id === "string") {
    const movie = await getMovieById(id);
    if (!movie) {
      res.status(404).json({ message: `Movie ${id} not found` });
      return;
    }
    res.status(200).json(movie);
    return;
  }
  res.status(404).json({ message: `Movie ${id} not found` });
};

export const moviesUpdate: AsyncRequestHandler = async (req, res) => {
  const { id } = req.params;
  const input = movieUpdateSchema.parse(req.body);
  if (typeof id === "string") {
    const movie = await updateMovie(id, input);
    if (!movie) {
      res.status(404).json({ message: `Movie ${id} not found` });
      return;
    }
    res.status(200).json(movie);
  }
};
