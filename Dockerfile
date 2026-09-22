FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Toolchain for native modules (better-sqlite3 has no prebuilt binaries).
# Only the build stages use it; the runtime stage starts from a clean image.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY . /app
WORKDIR /app

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN mkdir -p apps/web/public/textures
RUN pnpm --filter @aederyn/types run build
RUN pnpm --filter web run build
# Self-contained copy of web with its prod node_modules (workspace deps included).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter web deploy --prod --legacy /prod/web

FROM node:24-slim

RUN apt update && apt install -y sqlite3 && apt install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /prod/web/node_modules /app/node_modules
COPY --from=build /app/apps/web/dist/static /app/dist/static
COPY --from=build /app/apps/web/dist/code /app/
COPY --from=build /app/apps/web/package.json /app/package.json
COPY --from=build /app/apps/web/public /app/public

WORKDIR /app

# Create a directory for writeable data
RUN mkdir -p /usr/src/app/data

ENV DATABASE_PATH=/usr/src/app/data/
ENV NODE_ENV=production

ENV PORT=3000
EXPOSE 3000

CMD [ "index.js"]
