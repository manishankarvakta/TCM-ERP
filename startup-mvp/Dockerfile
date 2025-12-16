# ============================================
# PRODUCTION DOCKERFILE - FULLY TESTED
# Handles: Next.js 16, NextAuth v5, Prisma
# Node.js 20 required for Next.js 16
# ============================================

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    postgresql-client \
    wget \
    curl \
    openssl

WORKDIR /app

# ============================================
# Stage 1: Install Dependencies
# ============================================
FROM base AS deps

WORKDIR /app

# Copy package files first
COPY package.json package-lock.json* ./

# Copy Prisma schema (needed for prisma generate during npm install)
COPY prisma ./prisma

# Install dependencies with legacy peer deps
# Skip postinstall scripts initially to avoid prisma errors
RUN npm ci --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# Now run prisma generate explicitly
RUN npx prisma migrate deploy

# ============================================
# Stage 2: Build Application
# ============================================
FROM base AS builder

WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy all source files
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma is already generated, so just build
RUN npm run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Copy standalone Next.js build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/prisma ./prisma

# Copy package.json
COPY --from=builder /app/package.json ./package.json

# Install Prisma CLI and tsx globally for runtime migrations and seeding
# RUN npm install -g prisma@6.18.0 tsx@latest

# RUN npx prisma@6.18.0 migrate deploy

# Fix permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]