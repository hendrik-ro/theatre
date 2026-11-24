import { movieRatingInputSchema } from "@theatre/shared";
import { deleteMovieRating, rateMovie } from "../db/queries/movieRatings.js";
import { HttpError } from "../utils/errors.js";
import { requireUser } from "./helpers.js";
import type { AsyncRequestHandler } from "../utils/asyncHandler.js";

export const moviesRatingsPut: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { movieId } = req.params;
  const { rating } = movieRatingInputSchema.parse(req.body);
  if (typeof movieId !== "string") throw new HttpError(400, "Invalid movie id");
  const movie = await rateMovie({ userId: user.id, movieId, rating });
  res.status(200).json(movie);
};

export const moviesRatingsDelete: AsyncRequestHandler = async (req, res) => {
  const user = requireUser(req);
  const { movieId } = req.params;
  if (typeof movieId !== "string") throw new HttpError(400, "Invalid movie id");
  await deleteMovieRating(user.id, movieId);
  res.sendStatus(204);
};
