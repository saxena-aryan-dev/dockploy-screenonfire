#!/bin/bash

# Database Setup Script for VPS/Dokploy Deployment
# This script should be run on the VPS after deployment

echo "🚀 Setting up database schema..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Check if successful
if [ $? -eq 0 ]; then
  echo "✅ Database setup completed successfully!"
else
  echo "❌ Database setup failed. Please check the error messages above."
  exit 1
fi

echo "
📊 Database is ready!
All tables have been created:
- User
- WatchlistItem
- MovieLike
- MovieDislike
- SeenMovie
- MovieRating
- MovieReview
- Discussion
- DiscussionReaction
- UserPreference
- MovieCache
- SearchHistory
- MovieView
"
