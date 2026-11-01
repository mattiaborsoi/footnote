# syntax=docker/dockerfile:1
# Node LTS, moved by hand. Node 25+ images ship without corepack, so pnpm is installed
# with npm at the version pinned in package.json ("packageManager").
FROM node:26-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")" \
  && pnpm install --frozen-lockfile

# Development image: compose.yml bind-mounts the source over /app and keeps
# node_modules and .next in container volumes, so nothing is installed on the host.
FROM base AS dev
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

# Production build: the standalone server with only the modules it needs.
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm build

# Production image: no package manager, no source, an unprivileged user, a health check.
# CI builds it on every merge to main and pushes it to the registry; the server only pulls.
FROM node:26-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S app && adduser -S app -G app && mkdir -p data && chown app:app data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/drizzle ./drizzle
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
