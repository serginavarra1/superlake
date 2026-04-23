# ── builder ──────────────────────────────────────────────────────────────────
FROM node:25 AS builder

RUN npm install -g pnpm

WORKDIR /app

# Workspace manifests (pnpm needs them to resolve the monorepo graph)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json

# Prisma schema must be present before install so the api's postinstall (prisma generate) succeeds
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --frozen-lockfile

# Sources
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

RUN pnpm build

# ── runtime ───────────────────────────────────────────────────────────────────
# Same base as builder → guaranteed binary compatibility for Prisma's query engine
# (which is generated against the builder's openssl version).
FROM node:25 AS runtime

WORKDIR /app

# Copy the entire workspace from the builder — node_modules includes pnpm's
# symlinked store and the Prisma client generated during postinstall.
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main"]
