# syntax=docker/dockerfile:1

# Local development image (Vite dev server), used by compose.yaml.
# The production image for Kubernetes is built from Dockerfile.prod.

# ---- Base: Node + pnpm ----
FROM node:24-alpine AS base

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0 \
    CI=true

RUN corepack enable

WORKDIR /app

# ---- Dependencies ----
FROM base AS deps

# Install dependencies first to take advantage of layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Development (Vite dev server) ----
FROM deps AS dev

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]