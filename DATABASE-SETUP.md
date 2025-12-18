# Database Setup Guide

## Current Configuration

The project uses **PostgreSQL for both local and production**. The schema is now optimized for PostgreSQL with automatic deployment setup.

## Local Development

### Setup Local Database

**Option 1: Use SQLite (Simpler for local dev)**
1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"  // Change from "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:
```env
DATABASE_URL="file:./dev.db"
```

3. Run setup:
```bash
npx prisma db push
npx tsx scripts/seed-default-user.ts
npm run dev
```

**Option 2: Use PostgreSQL locally**
1. Install PostgreSQL on your machine
2. Update `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/screenonfire"
```

3. Run setup:
```bash
npx prisma db push
npx tsx scripts/seed-default-user.ts
npm run dev
```

The app will work with all features:
- ✅ Movie browsing (TMDB API)
- ✅ Like/Dislike buttons (saved to database)
- ✅ Watchlist (saved to database)
- ✅ AI Review (Google Gemini)

## Production Deployment (Dokploy)

### Automatic Setup (Recommended)

The deployment is now **fully automated**! Just push to GitHub and Dokploy will:
1. ✅ Build the Docker image
2. ✅ Generate Prisma Client
3. ✅ Create database schema automatically
4. ✅ Deploy the app

### Environment Variables in Dokploy

Make sure these environment variables are set in Dokploy:

```env
DATABASE_URL="postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres?sslmode=require"

GEMINI_API_KEY="your-gemini-api-key"
TMDB_API_KEY="your-tmdb-api-key"
TMDB_ACCESS_TOKEN="your-tmdb-access-token"
```

### Manual Database Setup (if needed)

If you need to manually set up the database:

```bash
# Connect to your Dokploy container
dokploy exec <container-id> /bin/bash

# Run database setup
npx prisma db push
npx tsx scripts/seed-default-user.ts
```

## Switching Between Databases

### Local Development → Production
1. Commit your code changes
2. Update schema.prisma to use PostgreSQL
3. Update .env with PostgreSQL URL
4. Deploy to Dokploy

### Production → Local Development
1. Already set up! Just run `npm run dev`

## Database Files

- **Local SQLite**: `prisma/dev.db` (gitignored)
- **Production PostgreSQL**: Hosted on Dokploy container
- **Migrations**: `prisma/migrations/` (committed to git)

## Troubleshooting

### Issue: "Can't reach database server"
- **Local**: Make sure SQLite is configured in `.env`
- **Production**: Check if PostgreSQL container is running in Dokploy

### Issue: Prisma Client errors
- Run `npx prisma generate` to regenerate the client
- Restart the dev server

### Issue: Like/Dislike buttons not working
- Check if default user exists: `npx tsx scripts/seed-default-user.ts`
- Check browser console for API errors

## Database Schema

The database includes tables for:
- ✅ Users
- ✅ Watchlist Items
- ✅ Movie Likes
- ✅ Movie Dislikes
- ✅ Seen Movies
- ✅ Movie Ratings
- ✅ Movie Reviews
- ✅ Discussions & Reactions
- ✅ User Preferences
- ✅ Search History
- ✅ Movie Views
- ✅ Movie Cache
