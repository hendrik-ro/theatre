import { movieQuerySchema } from "@theatre/shared";
import { getMovies } from "../db/queries/movies.js";
import {
  addMovieToWatchlist,
  removeMovieFromWatchlist,
} from "../db/queries/watchlists.js";
import type { AsyncRequestHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/errors.js";
import { requireUser } from "./helpers.js";

export const watchlistsAddMovie: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { movieId } = req.params;
  if (typeof movieId !== "string") throw new HttpError(400, "Invalid movie id");
  await addMovieToWatchlist(user.id, movieId);
  res.sendStatus(204);
};

export const watchlistsRemoveMovie: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { movieId } = req.params;
  if (typeof movieId !== "string") throw new HttpError(400, "Invalid movie id");
  await removeMovieFromWatchlist(user.id, movieId);
  res.sendStatus(204);
};

export const watchlistsGet: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const filter = movieQuerySchema.parse(req.query);
  const watchlist = await getMovies(filter, user.id, user.id);
  res.status(200).json(watchlist);
};
