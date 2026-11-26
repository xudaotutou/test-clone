# syntax=docker/dockerfile:1

FROM oven/bun:1.4.5-slim AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS builder

WORKDIR /app

COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1.4.5-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/package.json /app/bun.lock ./
COPY --from=builder --chown=bun:bun /app/src ./src
COPY --from=builder --chown=bun:bun /app/public ./public

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["bun", "src/index.ts"]
