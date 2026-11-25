# @theatre/server

Express/PostgreSQL REST API for [Theatre](../../README.md), a movie-tracking
application.

## Architecture

Request lifecycle:

```
helmet → cors → express.json → requestLogger → authenticateJWT
→ routers → controllers → queries → Drizzle ORM → PostgreSQL
                                    ↓ (after response)
                                    errorHandler
```

Layered structure:

| Layer       | Path               | Responsibility                                          |
| ----------- | ------------------ | ------------------------------------------------------- |
| Routes      | `src/routes/`      | HTTP surface only: paths, methods, middleware           |
| Middleware  | `src/middleware/`  | Optional auth, per-route guards, central error handling |
| Controllers | `src/controllers/` | Request handling and status codes                       |
| Queries     | `src/db/queries/`  | All SQL; validation of identifiers                      |
| Schema      | `src/db/schema/`   | Table definitions (schema-as-code for Drizzle)          |

Layer rules:

- Controllers contain no SQL; they translate HTTP to query calls and back.
- Queries return rows or `undefined`. Not-found is data, surfaced as 404 by
  the controller.
- All field validation happens in `@theatre/shared`; this package provides
  configuration validation only.

### Authentication middleware

`authenticateJWT` is global and optional: a valid access token (Bearer
header or cookie) resolves `req.user`; without one the request proceeds
unauthenticated. Per-route guards decide the rest:

| Guard                | Effect                                 |
| -------------------- | -------------------------------------- |
| `requireAuth`        | 401 unless `req.user`                  |
| `requireAdmin`       | 401 unauthenticated, 403 non-admin     |
| `requireAdminOrSelf` | 403 unless admin or the addressed user |

### Error handling

`asyncHandler` forwards async rejections to the central `errorHandler`, which
maps every failure to a JSON response:

| Condition                            | Status       |
| ------------------------------------ | ------------ |
| Zod validation error, malformed JSON | 400          |
| Postgres CHECK violation (23514)     | 400          |
| Token required / invalid / expired   | 401          |
| Role required                        | 403          |
| Resource not found                   | 404          |
| Postgres unique violation (23505)    | 409          |
| Body over 16 kB                      | 413          |
| Unhandled                            | 500 (logged) |

Errors serialize as `{ "message": string }`. Unique and CHECK violations map
to user-facing text by constraint name (`CONSTRAINT_MESSAGES` in
`src/middleware/errorHandler.ts`) — when a schema adds or renames a
constraint, its message is entered here.

## API

All bodies and responses are JSON. Mounted at `index.ts`.

### Health

| Method + path | Auth   | Response                                      |
| ------------- | ------ | --------------------------------------------- |
| `GET /health` | public | 200 `{ status, db }`, 503 when DB unreachable |

### Users

| Method + path                      | Auth           | Success                            |
| ---------------------------------- | -------------- | ---------------------------------- |
| `POST /users/register`             | public         | 201, sets auth cookies             |
| `POST /users/login`                | public         | 200 `{ user }`, sets auth cookies  |
| `POST /users/refresh`              | refresh cookie | 200, rotates token pair            |
| `POST /users/logout`               | user           | 200, revokes refresh token         |
| `GET /users`                       | user           | 200 `{ user }` (self)              |
| `GET /users/watchlist`             | user           | 200 `MoviesPaginated`, self-scoped |
| `POST /users/watchlist/:movieId`   | user           | 204, idempotent                    |
| `DELETE /users/watchlist/:movieId` | user           | 204, idempotent                    |

### Movies

| Method + path                    | Auth   | Success               |
| -------------------------------- | ------ | --------------------- |
| `GET /movies`                    | public | 200 `MoviesPaginated` |
| `POST /movies`                   | user   | 201 `Movie`           |
| `GET /movies/:movieId`           | public | 200 `MovieRated`, 404 |
| `PATCH /movies/:movieId`         | user   | 200 `Movie`, 404      |
| `DELETE /movies/:movieId`        | admin  | 204                   |
| `PUT /movies/:movieId/rating`    | user   | 200 `Rating` (upsert) |
| `DELETE /movies/:movieId/rating` | user   | 204                   |

Authenticated GET requests additionally include the caller's `userRating` on
movies. `GET /movies` supports:

| Parameter       | Type   | Notes                                                                       |
| --------------- | ------ | --------------------------------------------------------------------------- |
| `page`, `limit` | int    | limit capped at 100, default 20                                             |
| `genre`         | enum   | exact match against the genre list                                          |
| `year`          | int    | exact match, or `null` for movies without a year                            |
| `sortBy`        | enum   | name, year, runtime, genre, averageRating, userRating, createdAt, updatedAt |
| `order`         | enum   | asc (default) / desc; secondary sort on id keeps order deterministic        |
| `averageRating` | int    | minimum average; `null` matches unrated                                     |
| `userRating`    | int    | requires authenticated user; 400 otherwise                                  |
| `search`        | string | case-insensitive substring on name, max 100 chars                           |

Paginated responses are `{ movies, page, limit, total, totalPages }`.

## Authentication scheme

- Password hashing: Argon2id (32 MB memory, time cost 3, parallelism 4).
- Token pair: access JWT (15 min) + refresh JWT (7 days), separate secrets,
  enforced token types. Access is accepted as cookie (`theatre.jwt`) or Bearer
  header; the refresh token travels only as cookie (`theatre.refresh`).
  Cookies are httpOnly, SameSite=Lax, Secure in production.
- Refresh tokens are stored as SHA-256 hashes, one per user, rotated on every
  login and refresh (rotation replaces the row, revoking the prior token) and
  revoked on logout.
- The first registered user becomes admin via an atomic bootstrap claim in
  the same transaction as the insert; no seed script exists.

## Database

PostgreSQL, accessed through Drizzle ORM. Tables:

| Table            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `users`          | credentials, role (user/admin), timestamps          |
| `refresh_tokens` | active refresh token per user (hashed)              |
| `movies`         | catalog entries incl. optional year, runtime, genre |
| `movie_ratings`  | one rating (1–10) per user per movie, composite PK  |
| `bootstrap`      | first-admin claim flag                              |

Integrity (unique keys, composite primary keys, CHECK constraints) is
enforced at the database level; CHECK literals are derived from
`@theatre/shared` constants. Migrations are generated with
`drizzle-kit generate`, committed, and applied by `npm run db:migrate` (the
Docker deployment runs them as a one-shot container before the app starts).

## Development

Requires Node.js 24 and a reachable PostgreSQL instance.

```bash
npm install                 # from repo root: one install for all workspaces
cp .env.example .env        # then fill in the secrets
npm run dev                 # tsx watch, builds @theatre/shared first
```

### Configuration

Source: `src/config.ts` (Zod-validated, loaded from the repo-root `.env`).

| Variable                       | Required | Purpose                                       |
| ------------------------------ | -------- | --------------------------------------------- |
| `NODE_ENV`                     | yes      | development / production / test               |
| `SERVER_PORT`                  | yes      | HTTP port                                     |
| `ALLOWED_ORIGINS`              | yes      | comma-separated CORS allowlist                |
| `POSTGRES_USER/HOST/PORT/DB`   | no       | defaults to `postgres@localhost:5432/theatre` |
| `POSTGRES_PASSWORD`            | no       | defaults to `postgres`                        |
| `JWT_SECRET`, `REFRESH_SECRET` | yes      | ≥ 32 chars each                               |

### Scripts

| Command                       | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `npm run dev`                 | tsx watch (rebuilds shared first)                |
| `npm run build`               | tsc -b (includes shared via project reference)   |
| `npm run start`               | run built output (`dist/index.js`)               |
| `npm run test` / `test:watch` | Vitest suite                                     |
| `npm run typecheck`           | tsc --noEmit over main, node, and test tsconfigs |
| `npm run generate`            | drizzle-kit migration generation                 |
| `npm run db:migrate`          | apply migrations                                 |
| `npm run ci`                  | typecheck + test (what CI runs)                  |

## Testing

The suite runs against a real PostgreSQL instance, in a dedicated pipeline
database (`theatre_test`): one drop/create/migrate per run (`globalSetup`),
registered with a refusal to target non-local hosts, and all tables truncated
between files (`resetDB`). Development and production data are never touched.

```bash
npm test
```

Coverage spans two layers: the query layer (`tests/db/`) and the HTTP
surface (`tests/http/`) — the latter runs supertest against the exported
`app`, covering every endpoint's happy path, auth gates, and validation
failures, including the auth cookie lifecycle (register, login, refresh
rotation, logout revocation).

## Conventions

- ESM throughout: NodeNext module resolution, explicit `.js` extensions on
  relative imports.
- Adding a table: schema in `src/db/schema/`, migration via drizzle-kit, a
  barrel entry in `src/db/index.ts`, error-handler entries for new constraint
  names.
