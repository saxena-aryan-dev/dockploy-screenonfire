#!/bin/bash

# Startup script for production deployment
# Server starts even if database is unavailable

echo "🚀 Starting ScreenOnFire deployment..."

# Try database setup but don't block server startup
echo "⏳ Attempting database connection (max 30s)..."
set +e  # Don't exit on error for database setup

timeout=30
elapsed=0
db_ready=false

while [ $elapsed -lt $timeout ]; do
  if npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "✅ Database schema synchronized"
    db_ready=true
    break
  fi
  echo "⏳ Database not ready, retrying in 3s... (${elapsed}s/${timeout}s)"
  sleep 3
  elapsed=$((elapsed + 3))
done

if [ "$db_ready" = false ]; then
  echo "⚠️  Database connection timeout - continuing without database"
  echo "⚠️  App will start but database features may not work"
fi

# Start Next.js server (this MUST run regardless of database status)
echo "🌟 Starting Next.js server..."
echo "📍 Server will listen on 0.0.0.0:3000"

set -e  # Exit on error for server startup (critical)

# Check if standalone build exists
if [ ! -d ".next/standalone" ]; then
  echo "❌ ERROR: .next/standalone directory not found!"
  echo "❌ Did the build complete successfully?"
  ls -la .next/ 2>/dev/null || echo "❌ .next directory doesn't exist!"
  exit 1
fi

cd .next/standalone
HOSTNAME=0.0.0.0 PORT=3000 node server.js
