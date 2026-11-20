# AGENTS.md

## Project Overview

Darasa is a community-curated web platform that helps people discover
culinary businesses in Batang Regency, including small and lesser-known
food businesses that may have limited digital visibility.

For more detailed information, refer to @PRD.md

## Tech Stack

- Monorepo: Turborepo
- Package Manager: Bun
- Runtime: Bun (api), Node.js (web)
- Production: Docker
- Frontend: React Router Framework v8, Shadcn UI
- Backend: ElysiaJS, DrizzleORM
- Database: PostgreSQL
- API Client: Eden Treaty
- Format & Linter: Biome
- Typesafe: Typescript

## Repo Structure

Repo is a monorepo with the following structure

```
darasa/
  apps/
    api/        # elysiajs backend
    web/        # react router framework frontend
  packages/     # shared packages
  package.json
  turbo.json
```

## Usefull Commands

- `bun dev` - Run dev server. Don't run when dev server is already ran by user
- `bun build` - Run local build
- `bun docker` - Build docker image. Use to check production compatibility. Skip if system does not have docker
- `bun typecheck` - Run typecheck
- `bun lint` & `bun lint:fix` - Run biome linter, add `:fix` to write recommended fix
- `bun format` - Run biome formatter