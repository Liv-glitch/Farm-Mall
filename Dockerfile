# Multi-stage Dockerfile for Agriculture Management API

# Base stage with common dependencies
FROM node:18-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    curl

# Build stage
FROM base AS build

# Copy package files first
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies without running scripts
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Now run the build
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Install only production system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S agriculture -u 1001

WORKDIR /app

# Copy built application and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Create necessary directories
RUN mkdir -p uploads/original uploads/processed uploads/thumbnails logs && \
    chown -R agriculture:nodejs uploads logs

# Switch to non-root user
USER agriculture

# Expose port
EXPOSE 3000

# Health check - try multiple endpoints
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://0.0.0.0:${PORT:-3000}/health || \
      curl -f http://0.0.0.0:${PORT:-3000}/api/v1/health || \
      exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"] 