# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (needed for native modules like bcryptjs)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript to JavaScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
# Also install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json ./
# Copy package-lock.json from builder stage (guaranteed to exist there after npm ci)
COPY --from=builder /app/package-lock.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy generated Prisma Client from builder stage (already generated, no need to regenerate)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port (Render will set PORT env var)
EXPOSE 3000

# Health check for Render
# Uses dynamic PORT from environment variable
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

