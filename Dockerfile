FROM node:22-bookworm AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
RUN pnpm prisma generate
COPY . .
RUN pnpm run build

FROM base AS prod_deps
RUN pnpm install --frozen-lockfile --prod
COPY prisma ./prisma
RUN pnpm prisma generate

FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=prod_deps /app/node_modules ./node_modules
CMD ["/app/dist/src/api.js"]
