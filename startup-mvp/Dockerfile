# Multi-stage build for Next.js app
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# ---- Production Runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install Prisma CLI (same version as dev)
RUN npm install -g prisma@6.18.0

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy bcryptjs (for seed/registration)
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# ---- Run migrations and start server ----
# This will run migrations every time container starts
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
