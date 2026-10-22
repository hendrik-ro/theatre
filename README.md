# Theatre

Theatre is a movie-tracking app — a shared library where users add,
browse, and watchlist movies, rate them, and compare their ratings with
others. It is built as a portfolio project: the focus is on backend
engineering, with the client providing a complete, deployable front end
so the whole stack can be shown end to end.

This repository is a pure informational overview. The code lives in two
separate repositories, each with its own detailed README:

| Component | Path | Contents |
| --------- | ---- | -------- |
| Server    | [server/](https://github.com/hendrik-ro/theatre-server.git) | Express/PostgreSQL REST API — endpoints, architecture, auth scheme, testing, setup |
| Client    | [client/](https://github.com/hendrik-ro/theatre-client.git) | React SPA — features, structure, setup, Docker |

## Why a Portfolio Project

The project demonstrates the full life of a production-minded web
service — not just feature code, but the surrounding engineering:

- **Deliberate backend design** — a layered REST API with thin routes,
  controllers free of SQL, a dedicated query layer, and a central error
  handler mapping every failure mode to consistent JSON responses
- **Authentication from scratch** — Argon2 password hashing, a
  JWT access/refresh token pair with rotation in HTTP-only cookies,
  enforced token types, refresh tokens stored only as hashes, and
  role-based authorization (`user` / `admin`) — no auth framework, the
  scheme is implemented by hand
- **Real data integrity** — PostgreSQL with Drizzle ORM, schema-as-code,
  generated and reviewable SQL migrations, and constraints (unique keys,
  composite primary keys, CHECK constraints) enforced at both the API
  and database level
- **Testing against a real database** — over 140 integration and unit
  tests (Vitest + supertest) exercising the API surface end to end,
  against a live PostgreSQL instance in CI
- **Automated releases** — Conventional Commits enforced by husky and
  commitlint; semantic-release cuts versions, updates the changelog,
  and publishes GitHub releases with no manual version bumps
- **Containerized** — both apps ship Docker/compose setups for
  development and production, ready for deployment as containers on a
  single VPS

## Tech Stack

Both components are written in TypeScript and share the same tooling
conventions: [oxlint](https://oxc.rs/docs/guide/usage/linter) for
linting, [Prettier](https://prettier.io/) for formatting,
husky + commitlint for commit discipline, and semantic-release for
versioning.

### Server (the focus)

- [Express.js](https://expressjs.com/) on Node.js
- [PostgreSQL](https://www.postgresql.org/) with
  [Drizzle ORM](https://orm.drizzle.team/) and drizzle-kit migrations
- [Zod](https://zod.dev/) for env config and request validation
- [argon2](https://github.com/ranisalt/node-argon2) +
  [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for auth
- [Vitest](https://vitest.dev/) + supertest for integration tests
- [helmet](https://helmetjs.github.io/) security headers

### Client

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- Typed API client modules and feature-based structure
- Production image served by nginx with SPA fallback and API proxy

## Development Approach

The two components were deliberately built with opposite AI-assisted
workflows:

- **Server** — *implement by hand, review with AI*: each feature was
  designed and written manually, then reviewed by an AI assistant for
  bugs, edge cases, and improvements, and refined in a repeated cycle
- **Client** — *AI implements, review by hand*: each feature was
  implemented by an AI assistant, then reviewed and corrected manually,
  and refined in a repeated cycle

The backend is the heart of the project, so it was built with full
human control over the design and implementation; the client is
supporting infrastructure for demonstrating the backend, so it served
as the counterpart exercise in AI-driven implementation.

## License

AGPL-3.0 License - See [LICENSE.md](LICENSE.md) for details.
