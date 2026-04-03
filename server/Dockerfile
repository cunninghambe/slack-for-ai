# ─── Build Stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# ─── Production Stage ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose the application port
EXPOSE ${PORT:-3200}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3200}/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
