import { movieRatingInputSchema } from "@theatre/shared";
import { deleteMovieRating, rateMovie } from "../db/queries/movieRatings.js";
import { getMovieById } from "../db/queries/movies.js";
import { HttpError } from "../utils/errors.js";
import { requireUser } from "./helpers.js";
import type { AsyncRequestHandler } from "../utils/asyncHandler.js";

export const moviesRatingsPut: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { movieId } = req.params;
  if (typeof movieId !== "string") throw new HttpError(400, "Invalid movie id");

  // Surface a missing movie as 404 instead of 500
  const movie = await getMovieById(movieId);
  if (!movie) {
    res.status(404).json({ message: `Movie ${movieId} not found` });
    return;
  }

  const { rating } = movieRatingInputSchema.parse(req.body);
  const created = await rateMovie({ userId: user.id, movieId, rating });
  res.status(200).json(created);
};

export const moviesRatingsDelete: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { movieId } = req.params;
  if (typeof movieId !== "string") throw new HttpError(400, "Invalid movie id");
  await deleteMovieRating(user.id, movieId);
  res.sendStatus(204);
};
