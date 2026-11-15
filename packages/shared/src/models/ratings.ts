import { z } from "zod";

export interface Rating {
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  rating: number;
}

export interface MovieRating extends Rating {
  movieId: string;
}

const ratingSchema = z.int().min(1).max(10);

export const movieRatingSchema = z.object({
  rating: ratingSchema,
});
