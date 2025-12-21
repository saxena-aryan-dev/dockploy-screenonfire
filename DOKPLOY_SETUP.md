# Dokploy Deployment Guide for ScreenOnFire

## 🚀 Quick Setup Checklist

### 1. Database Configuration

In your Dokploy dashboard, set these environment variables:

**Option A: If you created a Dokploy PostgreSQL database:**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_DATABASE_SERVICE_NAME:5432/postgres
```

**Option B: If database connection fails (fallback - app works without DB):**
- The app will now start even if the database is unavailable
- Database features will be disabled but the app will be accessible
- You can fix the database connection later

### 2. Required Environment Variables

Set these in Dokploy's Environment Variables section:

```env
# Database (use your actual database service name from Dokploy)
DATABASE_URL=postgresql://postgres:PASSWORD@SERVICE_NAME:5432/postgres

# TMDB API (for movie data)
TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyNGRiZWYzOTRmOTAzNGMwM2ViNmM5M2E4ZjA0M2MwNSIsIm5iZiI6MTc1MjkzMTUwOS44MzMsInN1YiI6IjY4N2I5Y2I1ZGZmMDA4MWRhYzcyYzI1YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.RmEVeq7ssiU0LSkUj9ihGMySUeS3y3CbeKs_00BCsi4
NEXT_PUBLIC_TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyNGRiZWYzOTRmOTAzNGMwM2ViNmM5M2E4ZjA0M2MwNSIsIm5iZiI6MTc1MjkzMTUwOS44MzMsInN1YiI6IjY4N2I5Y2I1ZGZmMDA4MWRhYzcyYzI1YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.RmEVeq7ssiU0LSkUj9ihGMySUeS3y3CbeKs_00BCsi4

# AI Integration
GEMINI_API_KEY=AIzaSyC5qsVSIoJKeashTiFFWF3-TvwQuHFRf1s

# Optional: Supabase (if using)
SUPABASE_URL=https://yunytyqnkaeuugpkpilu.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://yunytyqnkaeuugpkpilu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bnl0eXFua2FldXVncGtwaWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjc0MTQsImV4cCI6MjA2ODUwMzQxNH0.jGwZGnNbgWoHHsEaie970Z_91NTeP-YHPeco30QnRHY
```

### 3. Database Connection Troubleshooting

If you see "Database not ready" in logs:

**Step 1: Find your database service name**
- In Dokploy, go to your PostgreSQL database service
- Copy the internal hostname (e.g., `screenonfire-database-xxxxx`)

**Step 2: Check SSL mode**
For Docker internal networking, try these DATABASE_URL formats:

```env
# Try without SSL first (recommended for Docker)
DATABASE_URL=postgresql://postgres:PASSWORD@SERVICE_NAME:5432/postgres

# Or with SSL disabled explicitly
DATABASE_URL=postgresql://postgres:PASSWORD@SERVICE_NAME:5432/postgres?sslmode=disable

# Or with SSL preferred (fallback to non-SSL)
DATABASE_URL=postgresql://postgres:PASSWORD@SERVICE_NAME:5432/postgres?sslmode=prefer
```

**Step 3: Verify database is running**
- In Dokploy dashboard, check that the PostgreSQL service is "Running"
- Check the database logs for any errors

### 4. Deployment Process

1. **Push changes to GitHub** (already done ✅)
2. **Trigger redeploy in Dokploy**:
   - Go to your app in Dokploy
   - Click "Redeploy" or wait for auto-deploy
3. **Monitor the logs**:
   - Watch for "🌟 Starting Next.js server..."
   - Server should start even if database connection fails
4. **Access your domain**:
   - Should now show your app instead of "Bad Gateway"

## 📋 Expected Deployment Logs

### ✅ Successful Deployment:
```
🚀 Starting ScreenOnFire deployment...
⏳ Attempting database connection (max 30s)...
✅ Database schema synchronized
👤 Creating default user...
🌟 Starting Next.js server...
📍 Server will listen on 0.0.0.0:3000
▲ Next.js 14.2.32
- Local:        http://0.0.0.0:3000
✓ Ready in XXXms
```

### ⚠️ Database Failed (App Still Works):
```
🚀 Starting ScreenOnFire deployment...
⏳ Attempting database connection (max 30s)...
⏳ Database not ready, retrying in 3s... (0s/30s)
⏳ Database not ready, retrying in 3s... (3s/30s)
...
⚠️  Database connection timeout - continuing without database
⚠️  App will start but database features may not work
🌟 Starting Next.js server...
📍 Server will listen on 0.0.0.0:3000
▲ Next.js 14.2.32
- Local:        http://0.0.0.0:3000
✓ Ready in XXXms
```

## 🔧 Common Issues

### Issue 1: "Bad Gateway" persists
- **Cause**: Server not starting
- **Check**: Look for "🌟 Starting Next.js server..." in logs
- **If missing**: Check if `.next/standalone` directory exists in build logs

### Issue 2: Database connection timeout
- **Cause**: Database not accessible or wrong credentials
- **Solution**: App will start anyway now - fix database later
- **To fix**: Update DATABASE_URL in Dokploy environment variables

### Issue 3: App loads but features don't work
- **Cause**: Database connection failed but server started
- **Solution**: Fix DATABASE_URL and redeploy
- **Verify**: Check if database service is running in Dokploy

## 🎯 Next Steps After Deployment

1. **Verify app is accessible** at your Dokploy domain
2. **Fix database connection** if needed (check logs)
3. **Test functionality**:
   - Browse movies (should work - uses TMDB API)
   - Create account (requires database)
   - Save to watchlist (requires database)

## 📞 Need Help?

If the app still shows "Bad Gateway" after redeployment:
1. Share the **full deployment logs** from Dokploy
2. Check if you see "🌟 Starting Next.js server..." in logs
3. If yes but still Bad Gateway: Check Dokploy port configuration (should be 3000)
4. If no: Share the error message that appears before server start
