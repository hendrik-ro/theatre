# Theatre

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-6DA55F?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Testing](https://github.com/hendrik-ro/theatre/actions/workflows/testing.yml/badge.svg)](https://github.com/hendrik-ro/theatre/actions/workflows/testing.yml)

Theatre is a movie-tracking app — a shared library where users add, browse, and
watchlist movies, rate them, and compare their ratings with others. It is built
as a portfolio project: the focus is on backend engineering, with the client
providing a complete, deployable front end so the whole stack can be shown end
to end.

The code is organized as an npm-workspaces monorepo, with each package owning
its own focused documentation:

| Package           | Path               | Build                                   | Contents                                                                           |
| ----------------- | ------------------ | --------------------------------------- | ---------------------------------------------------------------------------------- |
| `@theatre/server` | `packages/server/` | `tsc -b`, runs as a Node process        | Express/PostgreSQL REST API — endpoints, architecture, auth scheme, testing, setup |
| `@theatre/client` | `packages/client/` | Vite bundle served by nginx _(roadmap)_ | React SPA — features, structure, setup                                             |
| `@theatre/shared` | `packages/shared/` | consumed at build time by both packages | Zod schemas and inferred TypeScript models — the API contract used by both sides   |

## Why a Portfolio Project

The project demonstrates the full life of a production-minded web service — not
just feature code, but the surrounding engineering:

- **Deliberate backend design** — a layered REST API with thin routes,
  controllers free of SQL, a dedicated query layer, and a central error handler
  mapping every failure mode to consistent JSON responses
- **Authentication from scratch** — Argon2 password hashing, a JWT
  access/refresh token pair with rotation in HTTP-only cookies, enforced token
  types, refresh tokens stored only as hashes, role-based authorization
  (user / admin), and a race-free first-admin bootstrap claimed in the same
  transaction as the first user record — no seed script, no auth framework;
  the scheme is implemented by hand
- **Real data integrity** — PostgreSQL with Drizzle ORM, schema-as-code,
  generated and reviewable SQL migrations, and constraints (unique keys,
  composite primary keys, CHECK constraints) enforced at both the API and
  database level
- **A single source of truth for the API contract** — Zod schemas in the shared
  package define users, movies, and ratings; client, server, and the database
  layer all derive from them — types via inference, runtime values for
  validation, and even the SQL CHECK constraint literals from the same arrays —
  so a contract change that misses one side fails the type check instead of
  surfacing as runtime drift
- **Testing against a real database** — a comprehensive integration and unit
  test suite (Vitest + supertest) exercising the API surface end to end,
  against a live PostgreSQL instance in CI
- **Automated releases** — Conventional Commits enforced by husky and
  commitlint; semantic-release cuts versions, updates the changelog, and
  publishes GitHub releases with no manual version bumps
- **Containerized** — each deployable ships its own Dockerfile (built from the
  repo root, so the shared contract compiles in); a root docker-compose file
  orchestrates Postgres, one-shot migrations, and the services, ready for
  deployment as containers on a single VPS

## Tech Stack

All packages are written in TypeScript as ECMAScript modules and share the same
workspace-level tooling conventions: npm workspaces, oxlint for linting,
Prettier for formatting, husky + commitlint for commit discipline, and
semantic-release for versioning.

**Shared** (the API contract)

- Zod schemas with inferred TypeScript types (users, movies, ratings)

**Server** (the focus)

- Express.js on Node.js
- PostgreSQL with Drizzle ORM and drizzle-kit migrations
- Zod for env config and request validation
- argon2 + jsonwebtoken for auth
- Vitest + supertest for integration tests
- helmet security headers

**Client** _(roadmap)_

- React + Vite
- Redux Toolkit for shared state
- Typed API client modules and feature-based structure
- Production image served by nginx with SPA fallback

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                           Browser                            │
│  ┌────────────────────────────┐                              │
│  │   React SPA (Redux store)  │── REST/JSON ────┐            │
│  └────────────────────────────┘                              │
└─────────────────────────────────────────────────│────────────┘
                                                  ▼
┌──────────────────────────────────────────────────────────────┐
│ Express API server                                           │
│ routes → middleware (JWT auth) → controllers → queries       │
│                                                           │  │
│                                                           ▼  │
│                                     Drizzle ORM ──► Postgres │
└──────────────────────────────────────────────────────────────┘
```

### Workspace layout

```
theatre/
├── package.json         # workspaces + shared tooling
├── tsconfig.base.json   # shared compiler settings
└── packages/
    ├── server/
    ├── client/          # roadmap
    └── shared/
```

### Dependency direction

Shared code — the API contract — lives in `@theatre/shared`. The client and
server packages both depend on it and never on each other:

```
client ──▶ shared ◀── server
```

Both sides therefore compile against the same type and schema definitions,
keeping the client and server consistent through the shared package.

### Module system

All packages are ECMAScript modules (`"type": "module"`).

- **server**: compiled with TypeScript's `NodeNext` resolution; relative
  imports carry explicit `.js` extensions, and the output runs directly on
  Node.js.
- **client**: bundled by Vite, which resolves imports at bundling time
  (`bundler` resolution).

## Development

```bash
npm install                          # one install for all workspaces
cp .env.example .env                 # then fill in the JWT secrets
podman compose up -d --build         # Postgres + migrations + API server

# or without containers (needs a reachable PostgreSQL instance):
npm run dev -w @theatre/server
npm run dev -w @theatre/client
npm run test -w @theatre/server
```

Shared tooling lives at the root (oxlint, Prettier, commitlint + husky);
package-specific tooling (Vitest, Drizzle Kit, Vite) lives in the owning
package. Environment configuration lives in a root-level `.env`; see
`.env.example` for the expected variables.

## Deployment

Client and server are separate deployables built from the same repo. One
root-level `docker-compose.yml` orchestrates the stack locally; each
deployable's `Dockerfile` builds from the repo root (`build.context: .`),
which is what lets the server image compile `@theatre/shared` alongside
itself. Services can also be deployed independently.

- **server** — multi-stage Docker build; migrations run as a separate one-shot
  container before the app starts.
- **client** — Vite production build served by nginx.
- **postgres** — managed by the compose file, with a healthcheck gating the
  migrate and app services.

## CI/CD

- **Testing** — on every pull request and push to main: format check, lint,
  typecheck, and the Vitest suite against a real PostgreSQL service
- **Dependency audit** — `npm audit` against production dependencies, on pull
  requests and pushes to main
- **Release** — on push to main: Semantic Release under a GitHub App token
  (see Versioning); manual re-runs via `workflow_dispatch`

## Roadmap

The rebuild of the project in this monorepo is ongoing and broken into stages:

1. **Server development** — rebuilt in small, logical steps; work is done
   mostly by hand
2. **Shared models** — declaring the API contract (users, movies, ratings) as
   Zod schemas, by hand
3. **Client development** — rebuilding the React SPA on top of the finished
   server and shared contract; AI-driven implementation with manual review
4. **New features** — once parity with the previous implementation is reached,
   starting with a new data model series

## Versioning

Semantic Release on Conventional Commits: the project carries a single
version, published as tags and GitHub Releases, with `CHANGELOG.md` updated
and committed with `[skip ci]` — no manual version bumps. The release commit
is pushed by a dedicated GitHub App token, which is also what allows writing
to the protected main branch.

## Development Approach

The two main components are deliberately built with opposite AI-assisted
workflows:

- **Server** — implement by hand, review with AI: each feature is designed and
  written manually, then reviewed by an AI assistant for bugs, edge cases, and
  improvements, and refined in a repeated cycle
- **Client** — AI implements, review by hand: each feature is implemented by an
  AI assistant, then reviewed and corrected manually, and refined in a repeated
  cycle

The backend is the heart of the project, so it is built with full human control
over the design and implementation; the client is supporting infrastructure for
demonstrating the backend, so it serves as the counterpart exercise in
AI-driven implementation.

## License

AGPL-3.0 — see [LICENSE.md](LICENSE.md) for details.
