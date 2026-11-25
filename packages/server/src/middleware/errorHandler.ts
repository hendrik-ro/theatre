import { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { HttpError } from "../utils/errors.js";
import { logEvent } from "../logger.js";

const PG_FK_VIOLATION = "23503";
const PG_UNIQUE_VIOLATION = "23505";
const PG_RANGE_VIOLATION = "23514";

const CONSTRAINT_FALLBACKS: Record<string, string> = {
  [PG_FK_VIOLATION]: "This value does not exist",
  [PG_UNIQUE_VIOLATION]: "This value is already in use",
  [PG_RANGE_VIOLATION]: "This value is outside of allowed range",
};

// Maps the violated Postgres constraint name to user-facing message.
// Constraints added to drizzle schema need to be added here.
const CONSTRAINT_MESSAGES: Record<string, string> = {
  users_username_unique: "This username is already taken",
  users_email_unique: "An account with this email already exists",
  movies_genres_values: "This genre is not supported",
  movies_year_range: "This year is outside of the supported range",
  movies_runtime_range: "This runtime is outside of the supported range",
  movie_ratings_range: "This rating is outside of the supported range",
  watchlists_user_id_movie_id_pk: "Movie already in watchlist",
  watchlists_movie_id_movies_id_fk: "Movie not found",
};

function isConstraintCode(code: string | undefined): code is string {
  return (
    code === PG_UNIQUE_VIOLATION ||
    code === PG_RANGE_VIOLATION ||
    code === PG_FK_VIOLATION
  );
}

function pgErrorCode(err: unknown): string | undefined {
  const withCode = err as { code?: unknown; cause?: { code?: unknown } };
  if (typeof withCode?.code === "string") return withCode.code;
  if (typeof withCode?.cause?.code === "string") return withCode.cause.code;
  return undefined;
}

// postgres-js surfaces the Postgres "n" error field (constraint name) as
// constraint_name, unlike node-postgres which uses "constraint".
function pgErrorConstraint(err: unknown): string | undefined {
  const withConstraint = err as {
    constraint_name?: unknown;
    cause?: { constraint_name?: unknown };
  };
  if (typeof withConstraint?.constraint_name === "string")
    return withConstraint.constraint_name;
  if (typeof withConstraint?.cause?.constraint_name === "string")
    return withConstraint.cause.constraint_name;
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (err, _, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ message: err.issues[0]?.message ?? "Invalid request body" });
    return;
  }

  if (err.type === "entity.too.large") {
    res.status(413).json({ message: "Payload too large" });
    return;
  }

  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  const pgCode = pgErrorCode(err);
  if (isConstraintCode(pgCode)) {
    const constraint = pgErrorConstraint(err);
    res
      .status(
        pgCode === PG_UNIQUE_VIOLATION
          ? 409
          : pgCode === PG_FK_VIOLATION
            ? 404
            : 400,
      )
      .json({
        message:
          (constraint && CONSTRAINT_MESSAGES[constraint]) ??
          CONSTRAINT_FALLBACKS[pgCode],
      });
    return;
  }

  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  logEvent("unhandled_error", {
    requestId: res.locals?.requestId,
    error: err instanceof Error ? err.message : String(err),
  });

  res.status(500).json({ message: "Internal Server error" });
};
