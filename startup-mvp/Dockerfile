# ================================
# Base image
# ================================
FROM node:20-bullseye-slim AS base

WORKDIR /app

# ================================
# Dependencies stage
# ================================
FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --ignore-scripts

# ================================
# Builder stage
# ================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (NO DB required)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ================================
# Runner stage
# ================================
FROM node:20-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create user
RUN groupadd -g 1001 nodejs \
 && useradd -u 1001 -g nodejs nextjs

# Prisma CLI for runtime migrations
RUN npm install -g prisma@6.19.1

# Copy app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
