# syntax=docker/dockerfile:1
FROM node:25-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Development image: compose.yml bind-mounts the source over /app and keeps
# node_modules and .next in container volumes, so nothing is installed on the host.
FROM base AS dev
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
