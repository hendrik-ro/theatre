export interface Movie {
  id: string;
  name: string;
  year: number | null;
  runtime: number | null;
  genre: string | null; // Replace with type Genre
  createdAt: Date;
  updatedAt: Date;
}
