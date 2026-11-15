# ==============================================================
# Multi-Stage Production Dockerfile for Node.js / Express Backend
# ==============================================================

# --- Stage 1: Dependency & Build Stage ---
FROM node:20-alpine AS dependencies

WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install production dependencies only in a dedicated layer
RUN npm ci --omit=dev && cp -R node_modules prod_node_modules
# Install all dependencies for scripts/tests if needed
RUN npm ci

# --- Stage 2: Production Runtime Stage ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for container health checks
RUN apk add --no-cache curl

# Copy production node_modules from dependencies stage
COPY --from=dependencies /usr/src/app/prod_node_modules ./node_modules
COPY --from=dependencies /usr/src/app/package.json ./package.json

# Copy application source code
COPY src ./src
COPY scripts ./scripts

# Security Hardening: Run as non-privileged node user
USER node

# Expose microservice port
EXPOSE 3000

# Container Healthcheck against native health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start microservice
CMD ["node", "src/server.js"]
