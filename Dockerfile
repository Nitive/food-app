FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM base AS prod_deps
RUN pnpm install --frozen-lockfile --prod
COPY . .
RUN pnpm prisma generate

FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/dist ./dist
COPY --from=prod_deps /app/node_modules ./node_modules
CMD ["/app/dist/src/api.js"]
