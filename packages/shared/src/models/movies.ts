import z from "zod";
import { genreSchema } from "./genres.js";
import { RATINGS } from "./ratings.js";

export const FIRST_MOVIE_YEAR = 1878; // The Horse in Motion by Eadweard Muybridge
export const MOVIE_RUNTIME = { min: 1, max: 9999 } as const;
export const MOVIE_NAME = { min: 1, max: 200 } as const;

// Field schemas: constraints only - no optionality/nullability.
const nameSchema = z.string().trim().min(MOVIE_NAME.min).max(MOVIE_NAME.max);
const yearSchema = z
  .int()
  .min(FIRST_MOVIE_YEAR)
  .refine((value) => value <= new Date().getFullYear(), {
    message: "Movie year can not be in the future",
  });
const runtimeSchema = z.int().min(MOVIE_RUNTIME.min).max(MOVIE_RUNTIME.max);

// Database return shape
export const movieSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  year: yearSchema.nullable(),
  runtime: runtimeSchema.nullable(),
  genre: genreSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Movie = z.infer<typeof movieSchema>;

// Creation submission shape
export const movieInputSchema = z.object({
  name: nameSchema,
  year: yearSchema.optional(),
  runtime: runtimeSchema.optional(),
  genre: genreSchema.optional(),
});
export type MovieInput = z.infer<typeof movieInputSchema>;

export const movieUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    year: yearSchema.nullish(), // undefined = leave, null = clear
    runtime: runtimeSchema.nullish(),
    genre: genreSchema.nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field to update is required",
  });
export type MovieUpdate = z.infer<typeof movieUpdateSchema>;

// Query/filter/sort shape
const fromQueryString = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (v === "null" ? null : v === "" ? undefined : v),
    schema.nullish(),
  );

const coerceNumber = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" ? Number(v) : v), schema);

export const movieQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  genre: fromQueryString(genreSchema),
  year: fromQueryString(coerceNumber(yearSchema)),
  sortBy: z
    .enum([
      "name",
      "year",
      "runtime",
      "genre",
      "averageRating",
      "userRating",
      "createdAt",
      "updatedAt",
    ])
    .optional(),
  order: z.enum(["asc", "desc"]).optional(),
  averageRating: z.coerce
    .number()
    .int()
    .min(RATINGS.min)
    .max(RATINGS.max)
    .optional(),
  userRating: z.coerce
    .number()
    .int()
    .min(RATINGS.min)
    .max(RATINGS.max)
    .optional(),
  search: z.string().max(100).optional(),
});
export type MovieQuery = z.infer<typeof movieQuerySchema>;

// Rated movie, paginated list, metadata
export const movieRatedSchema = movieSchema.extend({
  averageRating: z.number().min(1).max(10).nullable(), // SQL AVG: null when no ratings
  ratingCount: z.int().min(0),
  userRating: z.number().int().min(RATINGS.min).max(RATINGS.max).nullable(),
});
export type MovieRated = z.infer<typeof movieRatedSchema>;

export const moviesPaginatedSchema = z.object({
  movies: z.array(movieRatedSchema),
  page: z.int().min(1),
  limit: z.int().min(1),
  total: z.int().min(0),
  totalPages: z.int().min(0), // ceil(total/limit): empty result → { total: 0, totalPages: 0 }, page stays 1
});
export type MoviesPaginated = z.infer<typeof moviesPaginatedSchema>;

export const moviesMetaDataSchema = z.object({
  totalMovies: z.int().min(0),
  moviesRated: z.int().min(0),
  moviesPerYear: z.array(
    z.object({ year: z.int(), count: z.int().min(0) }), // grouping key: always present
  ),
  moviesPerGenre: z.array(
    z.object({ genre: genreSchema, count: z.int().min(0) }),
  ),
});
export type MoviesMetaData = z.infer<typeof moviesMetaDataSchema>;
