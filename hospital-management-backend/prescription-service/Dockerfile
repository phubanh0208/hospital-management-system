# Multi-stage Dockerfile for Prescription Service
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

# Build prescription service
WORKDIR /app/prescription-service
COPY prescription-service/package*.json ./
RUN npm install

COPY prescription-service/src/ ./src/
COPY prescription-service/tsconfig.json ./
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

# Copy built prescription service
COPY --from=builder /app/prescription-service/dist/ ./dist/
COPY --from=builder /app/prescription-service/package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Create symlink for shared package
RUN mkdir -p node_modules/@hospital && \
    ln -sf /app/shared node_modules/@hospital/shared

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S prescription -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R prescription:nodejs /app

USER prescription

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]




