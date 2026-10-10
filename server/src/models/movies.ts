export interface Movie {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  year: number | null;
  runtime: number | null;
  imdb_rating: number | null;
  genre: string | null;
}
