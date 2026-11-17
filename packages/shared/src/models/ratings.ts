import z from "zod";

// WIP
// Decisions to make:
// - DB shape: One table or movieRatings + seriesRatings?

const ratingField = z.int().min(1).max(10);

export const movieRatingSchema = z.object({ rating: ratingField }); // input, keep
export const ratingSchema = z.object({
  // DB row
  userId: z.uuid(),
  movieId: z.uuid(),
  rating: ratingField,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Rating = z.infer<typeof ratingSchema>;
