import { Request, Response, NextFunction } from "express";
import { getAllUsers } from "../db/queries/users.js";
import { deleteMovie } from "../db/queries/movies.js";

export const usersGetAll = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const all = await getAllUsers();
    res.status(200).json(all.map(({ passwordHash: _omit, ...user }) => user));
  } catch (err) {
    next(err);
  }
};

export const usersDelete = async (
  _req: Request,
  _res: Response,
  _next: NextFunction,
) => {
  console.log("not yet implemented");
};

export const moviesDeleteById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id;
    await deleteMovie(id);
    res.status(200).json({ message: `Movie ${id} has been deleted` });
  } catch (err) {
    next(err);
  }
};
