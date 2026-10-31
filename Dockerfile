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
