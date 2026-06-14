# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY ../../package.json ../../package-lock.json ./
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN npm ci --workspace=apps/backend

# Copy backend source
COPY apps/backend/ ./apps/backend/

# Build
RUN npm run build --workspace=apps/backend

# ── Stage 2: Production ──
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output + production deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE ${PORT:-3001}

CMD ["node", "dist/main.js"]
