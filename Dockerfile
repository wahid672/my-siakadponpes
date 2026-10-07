# syntax=docker/dockerfile:1

# Stage 1: Dependencies & Builder
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --include=optional

COPY . .

ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
RUN npm run build

# Stage 2: Production Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4400
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/siakad.db

# Copy built server output and production node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle

# Create persistent storage directory for SQLite
RUN mkdir -p /app/data

EXPOSE 4400

CMD ["node", ".output/server/index.mjs"]
