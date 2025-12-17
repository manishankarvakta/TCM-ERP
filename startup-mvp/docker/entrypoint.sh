#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until nc -z espacio-postgres 5432; do
  sleep 2
done

echo "✅ PostgreSQL is available"

echo "🧱 Prisma client already generated during build"

echo "🧱 Applying Prisma migrations (as root)..."
prisma migrate deploy || echo "No new migrations or already applied"

echo "🚀 Starting application (as nextjs user)..."
exec su-exec nextjs node server.js
