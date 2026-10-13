# Theatre — Roadmap

Goal: a finished, portfolio-ready app with one deployment story:

- **Local / casual use** — Postgres in a docker container, one command
  before `npm run dev`.
- **Deployment** — app and database run in the same private network on a
  container host; no remote database, no public DB endpoint.

Single dialect (PostgreSQL) across development, CI, and production. The
query layer, schema, and migrations stay single-sourced.

## Current state

- Express + Drizzle API with zod request validation, helmet, CHECK
  constraints, JSON 404s, explicit 16kb body limit with JSON 413, and
  sanitized production errors
- Graceful shutdown: requests drain before the postgres pool closes
- React client: landing page with genre links, library with sorting and
  URL-driven filters, add/detail/edit routes
- 51 integration + unit tests against a real Postgres; CI runs format,
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

## Phase 3 — Container deployment (app + db in one private network)

- **Serve the client from the server:** build the client, serve
  `client/dist` via `express.static`. The client uses HashRouter, so no
  history-API fallback route is needed. Single origin, no CORS.
- **Server Dockerfile** (multi-stage): install, `npm run build`, run
  `node dist/server.js`.
- **Migrations on deploy:** run `drizzle-kit migrate` as a release step
  or container entrypoint before the app accepts traffic.
- **Shutdown drain revisit:** pick up the marked comment in
  `server/src/server.ts` — pool-close failure handling and exit codes
  now matter to the orchestrator.
- **Host choice:** any container host with private networking between
  the app and a Postgres container — e.g. Fly.io, Railway, or Cloudflare
  Containers (public beta). Cloudflare _Workers_ is not an option:
  Express + `postgres-js` need a long-running Node process with plain
  TCP sockets, which Workers does not provide. Verify the chosen host's
  app-to-database networking before committing to it.
- **Healthcheck:** `/api/health` becomes the container-level healthcheck.

## Known trade-offs (accepted)

- **Local dev requires docker:** the "zero setup" story is replaced by a
  one-command Postgres container. In exchange: one dialect, one schema,
  one migration folder, one CI job.
- **Client served by the server:** production is a single origin; the
  client is not deployable standalone without an API base URL.
- **Cloudflare Containers is a beta product:** if it is the deployment
  target, its rough edges are part of the deal; a container-native host
  (Fly.io, Railway) is the fallback with the same Dockerfile.

## Verification per phase

- Phase 2: fresh clone → `docker compose up -d` → full suite green
  (51 tests); README quickstart executed end-to-end.
- Phase 3: image builds locally, migrations run, container serves the
  client and API; smoke test on the deployed URL; healthcheck responds.
