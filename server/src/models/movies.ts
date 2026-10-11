export interface Movie {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  year: number | null;
  runtime: number | null;
  imdbRating: number | null;
  genre: string | null;
}

export interface MoviesMeta {
  totalMovies: number;
  moviesPerYear: { year: number, count: number }[];
  moviesPerGenre: { genre: string, count: number }[];
}
