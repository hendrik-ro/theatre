# [1.2.0](https://github.com/hendrik-ro/theatre/compare/v1.1.0...v1.2.0) (2026-11-24)


### Bug Fixes

* **server:** max search query filter, eq genre search, default orderBy asc ([23a17b8](https://github.com/hendrik-ro/theatre/commit/23a17b86773c2fd3bbb20d9816eb63d09d722799))
* **server:** movies route query parsing, 404/hang guards, 409 split ([54d7382](https://github.com/hendrik-ro/theatre/commit/54d7382e279d8f51a1f4160828cbe47034958acc))


### Features

* **server:** endpoint movies ([35a394a](https://github.com/hendrik-ro/theatre/commit/35a394a924c12d5d2a63306982546a0593aeef82))
* **server:** harden movie queries, helpers, filters ([5bc2228](https://github.com/hendrik-ro/theatre/commit/5bc2228a5b6f2641c2e96ad1a1b31e02ab4a58f6))
* **server:** movieRatings sub-router ([430f84e](https://github.com/hendrik-ro/theatre/commit/430f84e522bd6835f5c7025429638f228da1015f))
* **server:** movieRatings table, queries, tests ([0cf994a](https://github.com/hendrik-ro/theatre/commit/0cf994ab647f31609f24d45239e5b9463d5c63ab))
* **server:** movies query getAllMovies ([95988d5](https://github.com/hendrik-ro/theatre/commit/95988d5e9af5559cc020d1a3468938a0011dd9bf))
* **server:** movies table ([e767cb7](https://github.com/hendrik-ro/theatre/commit/e767cb7b8485b0fe8b4ce3d9838cfcfbeacbd7ab))
* **server:** pagination, filtering, sorting ([b13f84b](https://github.com/hendrik-ro/theatre/commit/b13f84b3a1e93fb4a3e72625271001536b200a37))
* **shared:** updated models genres, movies, users ([139ee7f](https://github.com/hendrik-ro/theatre/commit/139ee7f19d773a3f88757f3505e9310f1529dee2))

# [1.1.0](https://github.com/hendrik-ro/theatre/compare/v1.0.0...v1.1.0) (2026-11-17)

### Bug Fixes

- closeDB at server shutdown, jwt rethrow err ([e4d98ae](https://github.com/hendrik-ro/theatre/commit/e4d98ae6efa0f499313adddd555eab4944583e74))

### Features

- **server:** unit tests ([911f885](https://github.com/hendrik-ro/theatre/commit/911f8853d88704cb47e2df9136f72ca7cb1318f2))

# 1.0.0 (2026-11-17)

### Bug Fixes

- **server:** predev script ([938447c](https://github.com/hendrik-ro/theatre/commit/938447c778ebf9ac1faea8430f995cdcbbb00c26))

### Features

- **server:** user routes, jwt auth middleware, refresh token validation ([afe8215](https://github.com/hendrik-ro/theatre/commit/afe82154664060b50a1ba8e0f4cc527d8b46d20e))
- **server:** users table, queries, first migration ([9c805d0](https://github.com/hendrik-ro/theatre/commit/9c805d0f162e185ec4a010b9e738fb1f2dadf766))
