# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=prerelease /usr/src/app/game game
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/dist dist

RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Create a directory for writable data
RUN mkdir -p /usr/src/app/data

ENV DATABASE_PATH=/usr/src/app/data/

EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "./game/index.js" ]