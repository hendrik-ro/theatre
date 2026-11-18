import z from "zod";

// Single source of truth: the type is inferred from this array, so a
// value can enter Genre only by being a valid schema member.
export const genres = [
  "action",
  "animation",
  "comedy",
  "crime",
  "drama",
  "experimental",
  "fantasy",
  "historical",
  "horror",
  "romance",
  "thriller",
  "western",
  "musical",
] as const;

export const genreSchema = z.enum(genres);
export type Genre = z.infer<typeof genreSchema>;
