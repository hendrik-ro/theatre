import z from "zod";

// movies -> movieRatings
// series -> AVG(episodeRatings)
// season -> AVG(episodeRatings)
// episode -> episodeRatings

export const RATINGS = { min: 1, max: 10 } as const;

const ratingField = z.int().min(RATINGS.min).max(RATINGS.max);
const ratingUserId = z.uuid();
const ratingMovieId = z.uuid();

export const movieRatingSchema = z.object({
  userId: ratingUserId,
  movieId: ratingMovieId,
  rating: ratingField,
});
export type RatingValue = z.infer<typeof movieRatingSchema>;

export const ratingSchema = z.object({
  // DB row
  userId: ratingUserId,
  movieId: ratingMovieId,
  rating: ratingField,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Rating = z.infer<typeof ratingSchema>;

export const movieRatingQuery = z.object({
  userId: ratingUserId.optional(),
  movieId: ratingMovieId.optional(),
});
export type RatingQuery = z.infer<typeof movieRatingQuery>;
