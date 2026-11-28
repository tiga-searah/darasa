FROM oven/bun:1 AS build

WORKDIR /app

# Cache packages installation
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN bun install --frozen-lockfile

COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json

FROM build AS migration

COPY apps/api/drizzle.config.ts apps/api/drizzle.config.ts
WORKDIR /app/apps/api

CMD ["bunx", "--bun", "drizzle-kit", "push", "--force"]

FROM build AS compile

ENV NODE_ENV=production

RUN bun build \
  --compile \
  --minify-whitespace \
  --minify-syntax \
  --outfile server \
  apps/api/src/index.ts

FROM gcr.io/distroless/base AS runtime

WORKDIR /app

COPY --from=compile /app/server server

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./server"]