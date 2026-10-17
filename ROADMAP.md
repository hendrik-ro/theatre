# Theatre — Roadmap

Goal: a finished, portfolio-ready app with one deployment story:

- **Local / casual use** — Postgres in a docker container, one command
  before `npm run dev`.
- **Deployment** — app and database run as containers on a single VPS
  (one provider-neutral docker compose stack); no remote database, no
  public DB endpoint.

Single dialect (PostgreSQL) across development, CI, and production. The
query layer, schema, and migrations stay single-sourced.

## Current state

- Express + Drizzle API with zod request validation, helmet, CHECK
  constraints, JSON 404s, explicit 16kb body limit with JSON 413, and
  sanitized production errors
- Graceful shutdown: requests drain before the postgres pool closes
- JWT auth: argon2 password hashing; short-lived access token plus a
  rotating refresh token, both in HTTP-only cookies; refresh tokens
  verified against a single active row per user (hashed at rest,
  revocation on logout) with its own `REFRESH_SECRET`; access and refresh
  secrets are separate (`JWT_SECRET` / `REFRESH_SECRET` env, min 32 chars)
- Role-based authorization (`user` / `admin`) via `requireAuth`,
  `requireAdmin`, and `requireAdminOrSelf` middleware; users and admin
  API routes (admin module manages users)
- React client: landing page with genre links, library with sorting and
  URL-driven filters, add/detail/edit routes, plus login/register/profile
  pages with role-gated UI behind `RequireAuth`
- Integration + unit tests against a real Postgres; CI runs format,
  lint, typecheck, tests
- Config files (`vite.config.ts`, `drizzle.config.ts`,
  `vitest.config.ts`) covered by typecheck

## Phase 2 — Local Postgres via docker

- **`docker-compose.yml`** with Postgres 18: named volume, healthcheck,
  port 5432, credentials and database matching the `.env.example`
  `DB_URL` placeholder. `docker compose up -d` replaces any
  locally-installed Postgres.
- **npm scripts:** `db:up`, `db:down`, `db:reset` (down with volume
  removal + up) wrapping docker compose; `dev:migrate` covers the
  initial schema on a fresh volume.
- **README quickstart** rewritten around it: `docker compose up -d`,
  `npm install`, `npm run dev`. The old dual-mode story is gone — no
  SQLite schema fork, no driver dispatcher, no dual migrations, no CI
  matrix.

## Phase 3 — Per-user features (ratings, watchlist, watched)

Movies keep one shared catalog identity; per-user state moves to a
`user_movies` join table (user, movie, status, rating).

- **Schema:** `user_movies` with `user_id`, `movie_id`, status enum
  (`watchlist` / `watched`), and a nullable rating; unique on
  (user, movie). Migration backfills existing library rows to their
  owning user's `watched` entries (or seeds the first admin account).
- **User ratings:** each user rates a movie once on the 0–10 scale; the
  API computes the shared user average per movie and serves it next to
  the IMDb rating in list and detail views.
- **Watchlist:** earmark a movie to watch later; dedicated watchlist
  view plus a library filter for what is pending.
- **Watched:** mark a movie as watched — the same status field, moving
  the entry from the watchlist into the library.
- **Client:** rating input on the detail page, watched/watchlist
  toggles, a watchlist route, and a user-average column in the library
  table.
- **Authorization:** users read and edit only their own `user_movies`
  rows; the admin module stays user-management only.

## Phase 4 — Deployment on a VPS

- **Serve the client from the server:** build the client, serve
  `client/dist` via `express.static`. The client uses HashRouter, so no
  history-API fallback route is needed. Single origin, no CORS.
- **Server Dockerfile** (multi-stage): install, `npm run build`, run
  `node dist/server.js`.
- **VPS stack:** one `docker compose` prod file runs app and Postgres
  containers on a single host; only the app port is published, the
  database stays on the compose network. A reverse proxy (Caddy or
  nginx) terminates TLS and forwards to the app. Any provider works
  (e.g. Hetzner, DigitalOcean) — the stack is plain docker, nothing
  provider-specific.
- **Migrations on deploy:** run `drizzle-kit migrate` as a container
  entrypoint before the app accepts traffic (or as a manual release
  step over SSH).
- **Shutdown drain revisit:** pick up the marked comment in
  `server/src/server.ts` — pool-close failure handling and exit codes
  now matter to the orchestrator.
- **Healthcheck:** `/api/health` becomes the container-level healthcheck.

## Known trade-offs (accepted)

- **Local dev requires docker:** the "zero setup" story is replaced by a
  one-command Postgres container. In exchange: one dialect, one schema,
  one migration folder, one CI job.
- **Client served by the server:** production is a single origin; the
  client is not deployable standalone without an API base URL.
- **Self-managed VPS:** you own OS patching, TLS certificates, and
  container upkeep. In exchange: one provider-neutral stack, full
  control, and no platform beta risk.

## Verification per phase

- Phase 2: fresh clone → `docker compose up -d` → full suite green
  (full suite green); README quickstart executed end-to-end.
- Phase 3: migration applies to an existing database without data loss;
  rating, watchlist, and watched endpoints covered by integration
  tests; shared user average verified across two users.
- Phase 4: image builds locally, compose stack comes up on the VPS,
  migrations run, reverse proxy serves TLS, smoke test on the deployed
  URL; healthcheck responds.
