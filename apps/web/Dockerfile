# ── builder ──────────────────────────────────────────────────────────────────
FROM node:25 AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

# VITE_* env vars are inlined at build time. Pass them via --build-arg.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_MASTRA_API_URL
ARG VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_MASTRA_API_URL=$VITE_MASTRA_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# ── runtime (nginx unprivileged — listens on $PORT without root) ──────────────
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# SPA fallback: all routes → index.html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
