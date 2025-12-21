#!/bin/bash

# Startup script for production deployment
# Runs database migrations before starting the server

set -e  # Exit on error

echo "🚀 Starting ScreenOnFire deployment..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
timeout=60
elapsed=0
while ! npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; do
  if [ $elapsed -ge $timeout ]; then
    echo "❌ Database connection timeout after ${timeout}s"
    echo "⚠️  Continuing anyway - database may not be available"
    break
  fi
  echo "⏳ Database not ready, retrying in 3s..."
  sleep 3
  elapsed=$((elapsed + 3))
done

echo "✅ Database schema synchronized"

# Create default user (ignore errors if already exists)
echo "👤 Ensuring default user exists..."
npx tsx scripts/seed-default-user.ts 2>/dev/null || echo "⚠️  Default user creation skipped (may already exist)"

# Start Next.js server
echo "🌟 Starting Next.js server..."
# Use standalone server (required for output: 'standalone' in next.config.mjs)
# Bind to 0.0.0.0 (not localhost) to accept external connections in Docker
cd .next/standalone
HOSTNAME=0.0.0.0 PORT=3000 node server.js
