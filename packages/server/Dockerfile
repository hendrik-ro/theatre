# syntax=docker/dockerfile:1

# Build: full install (tsc is a devDep), then build server — whose
# project references compile @theatre/shared first. bookworm-slim over
# alpine because argon2 ships glibc prebuilt binaries; musl would need
# a build toolchain.
FROM node:24-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN npm run build -w @theatre/server

# Runtime deps: fresh prod-only install of the same lockfile (npm prune's
# workspace semantics are unreliable). Produces hoisted prod deps plus
# the @theatre/* symlinks.
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev

# Runtime: mirrors the repo shape so the relative symlink
# node_modules/@theatre/shared -> ../../packages/shared resolves.
# No .env is baked in — the config falls back to process.env, which
# compose injects.
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/server/dist ./packages/server/dist
COPY packages/server/src/db/migrations ./packages/server/src/db/migrations
# The logger appends to <cwd>/data; /app is root-owned from COPY, so the
# runtime `node` user needs a writable dir pre-created here.
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3000
# Image only serves; migrations are applied by the one-shot migrate
# service before start. Exec form: node is PID 1 and receives SIGTERM
# directly from podman/docker stop.
CMD ["node", "packages/server/dist/index.js"]