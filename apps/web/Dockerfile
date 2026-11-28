FROM oven/bun:1 AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN bun install --frozen-lockfile --production && mkdir -p /app/apps/web/node_modules

FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN bun install --frozen-lockfile

COPY apps/web apps/web

WORKDIR /app/apps/web
ENV NODE_ENV=production

RUN bun run build

FROM node:24-alpine

WORKDIR /app

COPY --from=prod-deps /app/package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/web/package.json ./apps/web/package.json
COPY --from=prod-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/build ./apps/web/build

WORKDIR /app/apps/web

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
