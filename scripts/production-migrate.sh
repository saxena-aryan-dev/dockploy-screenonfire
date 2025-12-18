#!/bin/bash

# Production migration script for Dokploy deployment
# This script will create the database schema on first deployment

echo "🔄 Running production database migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  exit 1
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push the schema to the database (creates tables if they don't exist)
echo "🚀 Pushing schema to database..."
npx prisma db push --accept-data-loss

# Create default user
echo "👤 Creating default user..."
npx tsx scripts/seed-default-user.ts || echo "Default user already exists or creation failed"

echo "✅ Database setup complete!"
