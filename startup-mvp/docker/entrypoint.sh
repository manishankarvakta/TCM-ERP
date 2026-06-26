#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
# Extract host from DATABASE_URL (e.g. postgresql://user:pass@host:port/db -> host)
DB_HOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/[:\/].*//')
until nc -z "$DB_HOST" 5432; do
  sleep 2
done

echo "✅ PostgreSQL is available"

echo "🧱 Prisma client already generated during build"

echo "🧱 Applying Prisma migrations (as root)..."
node node_modules/prisma/build/index.js migrate deploy || echo "No new migrations or already applied"

echo "🚀 Starting application (as nextjs user)..."
exec su-exec nextjs node server.js
