# Multi-stage build for React app

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only - no react-snap)
RUN npm ci --only=production

# Copy source
COPY . .

# Build without pre-rendering (react-snap doesn't work reliably in Docker)
# Pre-rendering works locally but adds complexity to containerized builds
RUN SKIP_PREFLIGHT_CHECK=true npm run generate-sitemap && \
    npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config for SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
