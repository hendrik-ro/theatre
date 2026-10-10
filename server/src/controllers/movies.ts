import { Request, Response, NextFunction } from "express";
import { createMovie, getAllMovies } from "../lib/db/queries/movies.js";
import { Movie } from "../models/movies.js";

export const moviesGetAll = async (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAllMovies();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const moviesCreate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, year, runtime, imbd_rating, genre } = req.body;
    const newMovie: Movie = await createMovie(
      name,
      year,
      runtime,
      imbd_rating,
      genre,
    );
    res.status(201).json(newMovie);
  } catch (err) {
    next(err);
  }
};

export const moviesGetById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id;
    const movies = await getAllMovies();
    const movie = movies.find((m) => m.id === id);
    if (!movie) {
      res.status(404).json({ message: `Movie not found` });
    }
    res.status(200).json(movie);
  } catch (err) {
    next(err);
  }
};
