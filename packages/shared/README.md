# @theatre/shared

Single source of truth for the [Theatre](../../README.md) API contract: Zod
schemas and the TypeScript types derived from them. The server and the client
both consume this package and never each other, so both compile against the
same definitions.

## Contents

| Module                  | Exports                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `src/models/users.ts`   | Row schema, registration/login schemas, role list (`user`/`admin`), public-view type |
| `src/models/movies.ts`  | Row/input/update/query schemas, paginated and rated list shapes, metadata shape      |
| `src/models/genres.ts`  | Genre enum list and schema                                                           |
| `src/models/ratings.ts` | Rating bounds (`RATINGS`), row schema, rating input schema                           |
| `src/index.ts`          | Barrel — consumers import from `@theatre/shared` only                                |

Constants exported here — `genres`, `userRoles`, `RATINGS`, `FIRST_MOVIE_YEAR`,
`MOVIE_NAME`, `MOVIE_RUNTIME` — are also the source of the server's SQL CHECK
constraint literals: values may enter the database only by passing the same
definition the API validates with.

## Usage

```ts
import { movieQuerySchema, type Movie } from "@theatre/shared";
```

Resolves to `dist/` (types via `index.d.ts`, runtime via `index.js`), built
with `tsc -b`. The server uses NodeNext resolution; the client bundles with
Vite (`bundler` resolution).

### Derivation pattern

Row schemas are canonical; every other shape derives from them instead of
re-declaring fields:

```ts
// DB row
export const ratingSchema = z.object({
  userId,
  movieId,
  rating,
  createdAt,
  updatedAt,
});

// DB-write shape: exactly the insertable fields
export const movieRatingSchema = ratingSchema.pick({
  userId: true,
  movieId: true,
  rating: true,
});

// HTTP input: rating travels in the body, ids via URL/token
export const movieRatingInputSchema = movieRatingSchema.pick({ rating: true });
```

A contract change therefore fails type checks on the consumer side rather than
surfacing as runtime drift between client, server, and database.

### Query strings

`movieQuerySchema` preprocesses GET parameters, since everything arrives as a
string: `"null"` becomes `null` (meaning "match absent values"), numeric
fields are coerced, and unknown values are rejected. Parse request query
strings with this schema on the server; build them with its types on the
client.

## Adding a model

1. Declare field schemas with constraints only (bounds, formats) — no
   optionality; compose row, input, and update schemas from them (`optional`,
   `nullable`, `pick`).
2. Name domain-scoped artifacts after their table (`movieRatings`,
   `episodeRatings` for the future series model) so sibling domains stay
   parallel.
3. Export schemas and types from `src/index.ts`.
4. On the server side, derive CHECK constraints from the new constants and
   register their names with the error handler. See
   `packages/server/README.md`.

## Development

```bash
npm run build        # tsc -b → dist/
npm run typecheck
```

Consumers compile against `dist/`, not source — rebuild after changing files
here. The server's `predev` script and the repo-root `typecheck` script both
handle this automatically.
