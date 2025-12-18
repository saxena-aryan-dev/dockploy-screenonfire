# Database Setup Guide

## Current Configuration

The project is now set up to work with **SQLite for local development** and **PostgreSQL for production deployment**.

## Local Development (SQLite)

### Current Setup
- ✅ Database: SQLite (`dev.db`)
- ✅ Location: `prisma/dev.db`
- ✅ No installation required
- ✅ Default user created: `default-user`

### Running the App
```bash
npm run dev
```

The app will now work with all features:
- ✅ Movie browsing (TMDB API)
- ✅ Like/Dislike buttons (saved to SQLite)
- ✅ Watchlist (saved to SQLite)
- ✅ AI Review (Google Gemini)

## Production Deployment (PostgreSQL)

### Before Deploying to Dokploy:

1. **Update `.env` on your VPS** to use PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres?sslmode=require"
```

2. **Update `prisma/schema.prisma`** on the server:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

3. **Update array fields back to PostgreSQL format:**
- `UserPreference.favoriteGenres`: `String` → `Int[]`
- `UserPreference.preferredLanguages`: `String` → `String[]`
- `MovieCache.genres`: `String` → `String[]`

4. **Add `@db.Text` back to text fields:**
- `MovieReview.content`: `String` → `String @db.Text`
- `Discussion.content`: `String` → `String @db.Text`
- `MovieCache.overview`: `String?` → `String? @db.Text`

5. **Run migrations on the server:**
```bash
npx prisma migrate deploy
```

6. **Create default user on production:**
```bash
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
