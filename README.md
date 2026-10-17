[![CI](https://github.com/hendrik-ro/theatre/actions/workflows/ci.yml/badge.svg)](https://github.com/hendrik-ro/theatre/actions/workflows/ci.yml)
[![Release](https://github.com/hendrik-ro/theatre/actions/workflows/release.yml/badge.svg)](https://github.com/hendrik-ro/theatre/actions/workflows/release.yml)

Theatre
=======

A browser-based app to track and rate movies with others.

## Features

- **Movie library** — add, edit, and view watched movies with name, year,
  runtime, IMDb rating (0–10), and genre
- **Sorting and filters** — library table with column sorting and
  URL-driven genre filters; landing page groups movies by genre
- **Accounts** — register, log in, and manage your profile; JWT auth keeps
  you signed in: a short-lived access token plus a rotating refresh token,
  both in HTTP-only cookies, with refresh tokens stored hashed server-side
- **Roles** — role-based authorization (`user` / `admin`); admins manage
  users through a dedicated admin module

## Repository Layout

npm-workspaces monorepo:

```
theatre
├── client/   # React SPA served by Vite
└── server/   # Express API backed by PostgreSQL
```

## Tech Stack

- **Client**: [React](https://react.dev/) + [vite.js](https://vitejs.dev/)
- **Server**: [express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Tooling**: [TypeScript](https://www.typescriptlang.org/), [oxlint](https://oxc.rs/docs/guide/usage/linter), [Prettier](https://prettier.io/), [Vitest](https://vitest.dev/)
- **Automation**: [husky](https://husky.com/) + [commitlint](https://commitlint.js.org/) enforce Conventional Commits, and [semantic-release](https://semantic-release.gitbook.io/) cuts versions, updates the changelog, and publishes GitHub releases from commit messages

## Getting Started

Prerequisites: Node.js and a running PostgreSQL instance.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Configure the environment:

   ```sh
   cp .env.example .env
   ```

   Then edit `.env` and set `DB_URL` to your database connection string and
   `JWT_SECRET` and `REFRESH_SECRET` to different random strings of at
   least 32 characters each (e.g. the output of `openssl rand -hex 32`).

3. Generate and apply database migrations:

   ```sh
   npm run dev:generate
   npm run dev:migrate
   ```

4. Start the dev servers (client and server together):

   ```sh
   npm run dev
   ```

   Or run them individually with `npm run dev:client` and `npm run dev:server`.

## Scripts

All commands are run from the repository root.

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start client and server in watch mode            |
| `npm run dev:client`   | Start the Vite dev server                        |
| `npm run dev:server`   | Start the Express server with tsx watch          |
| `npm run dev:generate` | Generate Drizzle migrations                      |
| `npm run dev:migrate`  | Apply Drizzle migrations                         |
| `npm run build`        | Build all workspaces                             |
| `npm run typecheck`    | Type-check all workspaces                        |
| `npm test`             | Run server tests (Vitest)                        |
| `npm run lint`         | Lint with oxlint                                 |
| `npm run format`       | Format with Prettier                             |
| `npm run format:check` | Check formatting without writing                 |
| `npm run ci`           | Commitlint, format check, lint, typecheck, tests |

## Roadmap

- **User ratings** — rate movies yourself; every user's rating feeds a
  shared user average shown alongside the IMDb rating
- **Watchlist** — earmark movies you want to see and keep them in a
  separate list until you have watched them
- **Watched status** — mark movies as watched and track what is still
  pending

Longer term: one-command local Postgres via docker and deployment of app
plus database as containers on a single VPS. Details live in
[ROADMAP.md](ROADMAP.md).

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request on the GitHub repository.

## License

AGPL-3.0 License - See [LICENSE.md](LICENSE.md) for details.
