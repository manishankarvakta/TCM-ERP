#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until nc -z espacio-postgres 5432; do
  sleep 2
done

echo "✅ PostgreSQL is available"

echo "🧱 Generating Prisma client..."
npx prisma generate

echo "🧱 Applying Prisma migrations..."
npx prisma migrate deploy || echo "No new migrations or already applied"

echo "🚀 Starting application..."
exec node server.js
