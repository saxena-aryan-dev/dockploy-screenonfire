# Deployment Guide - Dokploy with PostgreSQL

This guide will help you deploy the ScreenOnFire application to Dokploy with PostgreSQL database.

## Prerequisites

- Dokploy instance running on your VPS
- PostgreSQL database created in Dokploy
- Git repository with your code

## Database Configuration

Your database URL is already configured:
```
postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres
```

This is an **internal hostname** that will work when deployed to Dokploy, but won't work from your local machine.

## Deployment Steps

### 1. Commit Your Changes

```bash
git add .
git commit -m "Add all API endpoints and database configuration"
git push origin main
```

### 2. Deploy to Dokploy

1. **Open Dokploy Dashboard**
   - Go to your Dokploy instance
   - Navigate to your ScreenOnFire application

2. **Configure Environment Variables**

   Make sure these environment variables are set in Dokploy:

   ```env
   # Database (Internal hostname works in Dokploy)
   DATABASE_URL=postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres?sslmode=require

   # TMDB API
   TMDB_API_KEY=24dbef394f9034c03eb6c93a8f043c05
   TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyNGRiZWYzOTRmOTAzNGMwM2ViNmM5M2E4ZjA0M2MwNSIsIm5iZiI6MTc1MjkzMTUwOS44MzMsInN1YiI6IjY4N2I5Y2I1ZGZmMDA4MWRhYzcyYzI1YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.RmEVeq7ssiU0LSkUj9ihGMySUeS3y3CbeKs_00BCsi4

   # Gemini AI
   GEMINI_API_KEY=AIzaSyC5qsVSIoJKeashTiFFWF3-TvwQuHFRf1s

   # Node Environment
   NODE_ENV=production
   ```

3. **Trigger Deployment**
   - Click "Deploy" or "Rebuild" in Dokploy
   - Dokploy will automatically:
     - Install dependencies
     - Generate Prisma client
     - **Run database migrations** (`npx prisma migrate deploy`)
     - Build the Next.js application
     - Start the production server

### 3. Verify Database Migration

After deployment, the database should be automatically set up. To verify:

1. **Check Deployment Logs** in Dokploy:
   ```
   ✓ Generated Prisma Client
   ✓ Migrations: 1 migration found
   ✓ Applied 1 migration
   ✓ Database is up to date
   ```

2. **Test API Endpoints**:
   ```bash
   # Create a test user
   curl -X POST https://your-domain.com/api/profile \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User"}'

   # Get user profile
   curl https://your-domain.com/api/profile?userId=user-id
   ```

## Database Schema

The migration will create these tables:

### Core Tables
- **User** - User accounts
- **WatchlistItem** - User watchlists
- **SeenMovie** - Watched movies
- **MovieLike** - Liked movies
- **MovieDislike** - Disliked movies
- **MovieRating** - User ratings (0-10)
- **MovieReview** - User reviews

### Social Features
- **Discussion** - Movie discussions (threaded)
- **DiscussionReaction** - Reactions to discussions

### Settings & Cache
- **UserPreference** - User preferences
- **MovieCache** - TMDB data cache
- **SearchHistory** - Search tracking
- **MovieView** - View analytics

## API Endpoints

After deployment, these endpoints will be available:

- `POST /api/profile` - Create user
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add to watchlist
- `GET /api/seen` - Get seen movies
- `POST /api/likes` - Like/dislike movie
- `POST /api/ratings` - Rate movie
- `POST /api/reviews` - Write review
- `POST /api/discussions` - Create discussion
- `POST /api/reactions` - React to discussion
- `GET /api/preferences` - Get user preferences

See `docs/API.md` for complete documentation.

## Troubleshooting

### Migration Fails

If the migration fails during deployment:

1. **SSH into your VPS**:
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to your app directory**:
   ```bash
   cd /path/to/your/app
   ```

3. **Run migrations manually**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

### Database Connection Issues

If you see "Can't reach database server":

1. **Verify the database is running** in Dokploy
2. **Check the internal hostname** matches your database container name
3. **Ensure the application and database are in the same network**

### Reset Database (Caution!)

To reset the database and start fresh:

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to app directory
cd /path/to/your/app

# Reset database (WARNING: Deletes all data!)
npx prisma migrate reset

# Or manually reset
npx prisma migrate deploy --force
```

## Local Development

For local development, you **cannot** connect to the VPS database directly because it uses an internal hostname.

### Option 1: Use Local PostgreSQL

1. **Install PostgreSQL locally**
2. **Update `.env.local`**:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/screenonfire"
   ```
3. **Run migrations**:
   ```bash
   npx prisma migrate dev
   ```

### Option 2: Use Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: screenonfire
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up -d
npx prisma migrate dev
npm run dev
```

## Production Checklist

Before going live:

- [ ] All environment variables set in Dokploy
- [ ] Database migrations completed successfully
- [ ] API endpoints tested
- [ ] Authentication implemented (replace userId with JWT)
- [ ] Rate limiting configured
- [ ] Error logging set up (Sentry, etc.)
- [ ] CORS configured for frontend domain
- [ ] Database backups enabled
- [ ] SSL/TLS certificates configured
- [ ] Domain name pointed to VPS

## Monitoring

### Check Application Health

```bash
# Check if app is running
curl https://your-domain.com/api/profile?userId=test

# Check database connection
curl https://your-domain.com/api/watchlist?userId=test
```

### View Logs

In Dokploy:
1. Go to your application
2. Click "Logs" tab
3. Check for errors or warnings

### Database Monitoring

```bash
# Connect to database (from VPS)
psql postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Count records
SELECT 'User' as table_name, COUNT(*) FROM "User"
UNION ALL
SELECT 'WatchlistItem', COUNT(*) FROM "WatchlistItem"
UNION ALL
SELECT 'MovieReview', COUNT(*) FROM "MovieReview";
```

## Backup & Restore

### Backup Database

```bash
# From VPS
pg_dump postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres > backup.sql
```

### Restore Database

```bash
# From VPS
psql postgresql://postgres:t0svjsxjq9qoaurr@screenonfire-screenonfire-database-qoeize:5432/postgres < backup.sql
```

## Scaling

### Database Performance

1. **Add indexes** for frequently queried fields
2. **Enable connection pooling** (already configured with Prisma)
3. **Use Redis** for caching popular movies
4. **Implement database replicas** for read-heavy operations

### Application Performance

1. **Enable Next.js caching**
2. **Use CDN** for static assets
3. **Implement API rate limiting**
4. **Add Redis for session storage**

## Support

For issues:
1. Check Dokploy logs
2. Review `docs/API.md` for API documentation
3. Check Prisma schema in `prisma/schema.prisma`
4. Review deployment logs in Dokploy

## Next Steps

After successful deployment:

1. **Implement Authentication** - Replace userId with proper auth
2. **Add Frontend Integration** - Connect UI to APIs
3. **Set up Monitoring** - Add error tracking
4. **Configure Backups** - Automate database backups
5. **Add Analytics** - Track user behavior
6. **Implement Caching** - Use Redis for performance
7. **Add Tests** - Write API tests

---

**Congratulations!** Your application is now deployed with PostgreSQL and all API endpoints are live! 🚀
