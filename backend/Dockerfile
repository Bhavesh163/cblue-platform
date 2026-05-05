# ── Build stage ──
FROM node:20-alpine AS builder
# Rebuild trigger: 2026-04-20

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# ── Production stage ──
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npm ci --omit=dev

# Copy generated Prisma client from builder (prisma CLI is a devDep)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Copy prisma CLI for running migrations in production
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
# Create .bin symlink so `npx prisma` works without re-downloading
RUN mkdir -p node_modules/.bin && ln -sf ../prisma/build/index.js node_modules/.bin/prisma

# Create a lightweight prisma.config.mjs for migrations (plain object, no defineConfig deps)
RUN printf 'export default {\n  schema: "prisma/schema.prisma",\n  migrations: { path: "prisma/migrations" },\n  datasource: { url: process.env["DATABASE_URL"] },\n};\n' > prisma.config.mjs

# Don't run as root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3002

# Run Prisma migrations before starting the app — this ensures the DB schema
# is always up to date regardless of how/when the container starts.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/src/main.js"]
