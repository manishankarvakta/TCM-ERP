# ===============================
# Base image
# ===============================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app


# ===============================
# Dependencies stage
# ===============================
FROM base AS deps

# Copy package files & prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies (Prisma must be in dependencies)
RUN npm ci --legacy-peer-deps


# ===============================
# Builder stage
# ===============================
FROM base AS builder
WORKDIR /app

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy app source
COPY . .

# Generate Prisma Client (no DB needed)
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ===============================
# Runner (Production)
# ===============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema & generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
