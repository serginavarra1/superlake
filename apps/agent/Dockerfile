# ── builder ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/agent/package.json ./apps/agent/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY apps/agent/ ./apps/agent/

WORKDIR /app/apps/agent

RUN pnpm build

# ── runtime ───────────────────────────────────────────────────────────────────
# mastra build emits a bundle in .mastra/output but externalises @mastra/* and
# zod, so node_modules (prod deps only) must be present at runtime. We skip
# the `mastra` CLI (it's a devDep) and invoke the built server directly.
FROM node:22-slim AS runtime

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/agent/package.json ./apps/agent/package.json

RUN pnpm install --frozen-lockfile --prod

COPY packages/shared/ ./packages/shared/
COPY --from=builder /app/apps/agent/.mastra ./apps/agent/.mastra

WORKDIR /app/apps/agent

ENV NODE_ENV=production
ENV PORT=4111
EXPOSE 4111

CMD ["node", ".mastra/output/index.mjs"]
