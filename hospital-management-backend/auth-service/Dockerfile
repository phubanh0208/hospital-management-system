# Multi-stage Dockerfile for Auth Service
# Build context: hospital-management-backend/ (root directory)

FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Build shared package first
COPY shared/package*.json ./shared/
WORKDIR /app/shared
RUN npm install

COPY shared/src/ ./src/
COPY shared/tsconfig.json ./
RUN npm run build

# Build auth service
WORKDIR /app/auth-service
COPY auth-service/package*.json ./
RUN npm install

COPY auth-service/src/ ./src/
COPY auth-service/tsconfig.json ./
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy built shared package
COPY --from=builder /app/shared/dist/ ./shared/dist/
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/node_modules/ ./shared/node_modules/

# Copy built auth service
COPY --from=builder /app/auth-service/dist/ ./dist/
COPY --from=builder /app/auth-service/package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Create symlink for shared package
RUN mkdir -p node_modules/@hospital && \
    ln -sf /app/shared node_modules/@hospital/shared

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S auth -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R auth:nodejs /app

USER auth

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]




