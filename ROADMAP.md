# Theatre — Roadmap

Goal: a finished, portfolio-ready app with two deployment stories from one
codebase:

- **Decentralized / casual use** — zero setup, SQLite, `npm install && npm run dev`.
- **Centralized** — PostgreSQL, docker, CI-tested, ready to deploy.

The query layer is dialect-agnostic; the database driver is selected by
configuration. Nothing user-facing changes between the two modes.

## Current state

- Express + Drizzle API with zod request validation, helmet, CHECK
  constraints, and sanitized production errors
- React client: landing page with genre links, library with sorting and
  URL-driven filters, add/detail/edit routes
- 47 integration + unit tests against a real Postgres; CI runs format,
  lint, typecheck, tests

## Phase 1 — Finish the app

Order matters: the update-semantics fix must land before the schema is
forked for SQLite.

- **Update semantics: allow clearing fields.** Emptying "Year" in the
  edit form currently keeps the old value (the client sends `undefined`,
  which drizzle omits from `UPDATE`). Plan: `MovieInput` fields become
  nullable — `null` means clear, absent means keep. Touches the zod
  schema, queries, and `MovieForm`.
- **404 catch-all for unknown `/api/*` routes** (Express currently
  serves its default HTML page on a JSON API).
- **Explicit `express.json()` body limit** instead of the implicit
  100kb default.
- **Shutdown drain:** close the postgres pool (`conn.end()`) on
  SIGINT/SIGTERM instead of relying on the forced exit timer.
- **Polish sweep:** reset the "Saved." note in `MovieDetail`, remove the
  duplicated nested div in `ErrorElement`, use a URL-shaped
  `DB_URL` placeholder in `.env.example`.
- **Close the typecheck gap:** cover `drizzle.config.ts` and
  `client/vite.config.ts` with a tsconfig. Both prior config bugs were
  invisible because these files are never typechecked.

## Phase 2 — SQLite support (decentralized mode)

- **Dual schema files:** `schema.pg.ts` and `schema.sqlite.ts`.
  SQLite adaptations: `uuid().defaultRandom()` →
  `text().primaryKey().$defaultFn(() => crypto.randomUUID())`,
  `numeric` rating → `real`, `timestamp` →
  `integer({ mode: "timestamp" })` so `Date` objects still come back.
  CHECK constraints identical in both.
- **Driver dispatcher in `db/index.ts`:** picks driver + schema from
  config and exports a single `{ db, movies }`; queries stay untouched
  and single-sourced.
- **Config:** `DB_URL` optional in development only — absent means
  SQLite at `SQLITE_PATH` (default: `theatre.db`, gitignored).
  Production still fails loudly without `DB_URL`.
- **SQLite migrations:** fresh `drizzle-kit generate` with
  `dialect: "sqlite"` into a separate folder. CHECKs land inside
  `CREATE TABLE`, which SQLite requires anyway (it does not support
  `ALTER TABLE ADD CONSTRAINT`).
- **Explicit NULL ordering:** use `.nullsLast()` on the meta queries —
  Postgres and SQLite order NULLs differently in ascending sorts.
  The integration tests assert the order, so both dialects are forced
  into identical behavior.
- **Test setup branch:** SQLite reset = delete the file; the
  drop-database dance and the localhost guard stay on the Postgres
  branch.
- **Dependency:** `better-sqlite3` (drizzle's standard Node driver;
  prebuilt binaries, no compile step expected).
- **CI matrix:** the integration suite runs twice — one job with the
  Postgres service (centralized), one plain job with SQLite
  (decentralized). Same tests, two backends, both green.

## Phase 3 — Showcase polish

- **README rewritten around the two use cases:** "Casual / local —
  zero setup" vs "Centralized — Postgres + docker". Same app, different
  env configuration.
- **`docker-compose.yml`** with Postgres 18 so the centralized demo is
  also one command; app runs via the existing npm scripts.
- **Optional:** Dockerfiles for client and server, only if container
  screenshots are wanted for the portfolio page.

## Known trade-offs (accepted)

- **Dual-maintenance migrations:** every schema change is edited and
  generated twice (one per dialect) from now on. The dispatcher keeps the
  query layer single-sourced; schema files are inherently forked.
- **Rating as SQLite `real`:** the IMDb rating becomes a float in SQLite.
  Inputs are one-decimal and nothing filters by rating, so this is safe;
  revisit if rating arithmetic or filtering is ever added.
- **Production stays Postgres-only:** SQLite is a development / casual-use
  convenience, not a deployment target. Concurrent access, backup tooling,
  and migration discipline belong to the centralized mode.

## Verification per phase

- Phase 1: existing CI suite (format, lint, typecheck, 47 tests) plus a
  manual pass of the edit-form clear-fields flow.
- Phase 2: same suite green on both dialects locally; CI matrix green.
- Phase 3: README instructions executed end-to-end from a fresh clone in
  both modes.
