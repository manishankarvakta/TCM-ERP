#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until nc -z ts-crm-postgres 5432; do
  sleep 2
done

echo "✅ PostgreSQL is available"

echo "🧱 Generating Prisma client (as root)..."
npx prisma generate

echo "🧱 Applying Prisma migrations (as root)..."
npx prisma migrate deploy || echo "No new migrations or already applied"

echo "📁 Ensuring volume and temp directory permissions..."
mkdir -p /app/uploads /app/backups /app/tmp
chown -R nextjs:nodejs /app/uploads /app/backups /app/tmp

echo "🚀 Starting application (as nextjs user)..."
exec su-exec nextjs node server.js
