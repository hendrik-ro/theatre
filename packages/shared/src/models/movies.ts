import type { Genre } from "./genres.js";

export interface Movie {
  id: string;
  name: string;
  year: number | null;
  runtime: number | null;
  genre: Genre;
  createdAt: Date;
  updatedAt: Date;
}
