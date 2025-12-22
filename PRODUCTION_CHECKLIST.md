# Production Deployment Checklist

Complete this checklist before deploying ScreenOnFire to production.

## Pre-Deployment Configuration

### 1. Environment Variables

Ensure these environment variables are set in Dokploy:

- [ ] `DATABASE_URL` - PostgreSQL connection string from Dokploy database service
- [ ] `NEXTAUTH_URL` - Your production domain (e.g., https://screenonfire.com)
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `TMDB_API_KEY` - Your TMDB API key
- [ ] `TMDB_ACCESS_TOKEN` - Your TMDB access token
- [ ] `NEXT_PUBLIC_TMDB_ACCESS_TOKEN` - Same as TMDB_ACCESS_TOKEN
- [ ] `GEMINI_API_KEY` - Your Google Gemini API key
- [ ] `NODE_ENV=production`

**Example Production NEXTAUTH_SECRET**:
```
DGCU53KFF/TzNlJS5Oc7SqCrPiLq8BNAEEhVd2zqrYU=
```
Generate your own unique secret!

### 2. Database Configuration

- [ ] PostgreSQL database created in Dokploy
- [ ] Database credentials saved securely
- [ ] DATABASE_URL matches your Dokploy PostgreSQL service
- [ ] Database schema is PostgreSQL (not SQLite) in `prisma/schema.prisma`

### 3. Code Configuration

Verify these files are configured correctly:

- [ ] `.env` - Uses PostgreSQL DATABASE_URL
- [ ] `.env.local` - Uses SQLite for local development only
- [ ] `prisma/schema.prisma` - Provider set to "postgresql"
- [ ] `nixpacks.toml` - Build configuration present
- [ ] `scripts/startup.sh` - Startup script present and executable

### 4. Security

- [ ] Strong NEXTAUTH_SECRET generated
- [ ] Database password is strong and unique
- [ ] API keys are production keys (not test keys)
- [ ] `.env` files are in `.gitignore`
- [ ] No sensitive data committed to Git

## Deployment Steps

### Step 1: Push to Git

```bash
git add .
git commit -m "Configure for production deployment"
git push origin main
```

### Step 2: Create Dokploy Application

1. [ ] Application created in Dokploy
2. [ ] GitHub repository connected
3. [ ] Branch set to `main`
4. [ ] Build provider set to `Nixpacks`

### Step 3: Configure Environment

1. [ ] All environment variables added in Dokploy
2. [ ] Variables verified for typos
3. [ ] NEXTAUTH_SECRET is unique and secure

### Step 4: First Deployment

1. [ ] Click "Deploy" in Dokploy
2. [ ] Monitor build logs
3. [ ] Build completes successfully
4. [ ] Database migrations run automatically (via startup.sh)

### Step 5: Domain & SSL

1. [ ] Domain added in Dokploy
2. [ ] DNS A record points to VPS IP
3. [ ] SSL certificate issued (Let's Encrypt)
4. [ ] NEXTAUTH_URL matches production domain

### Step 6: Verification

1. [ ] App accessible at https://your-domain.com
2. [ ] Sign-up works correctly
3. [ ] Login works correctly
4. [ ] Movie discovery works
5. [ ] Database operations work (watchlist, likes, etc.)
6. [ ] No console errors in browser

## Post-Deployment

### Monitoring

- [ ] Check application logs in Dokploy
- [ ] Monitor database connections
- [ ] Set up health checks
- [ ] Configure alerts (optional)

### Backups

- [ ] Enable automatic database backups in Dokploy
- [ ] Set backup schedule (recommended: daily)
- [ ] Set retention policy (recommended: 7-14 days)

### Performance

- [ ] Test app performance under load
- [ ] Monitor memory usage
- [ ] Check database query performance
- [ ] Enable caching if needed

### Security

- [ ] SSL certificate auto-renewal enabled
- [ ] Firewall configured on VPS
- [ ] Database accessible only from app container
- [ ] Regular dependency updates scheduled

## Troubleshooting Guide

### Build Fails

**Issue**: Prisma generation fails
**Solution**: Ensure DATABASE_URL is set in environment variables

**Issue**: Module not found errors
**Solution**: Clear build cache and redeploy

### Runtime Errors

**Issue**: "NEXTAUTH_SECRET is required"
**Solution**: Add NEXTAUTH_SECRET to Dokploy environment variables

**Issue**: Database connection fails
**Solution**: Verify DATABASE_URL matches Dokploy PostgreSQL service

**Issue**: Sign-up/Login not working
**Solution**:
1. Check NEXTAUTH_SECRET is set
2. Verify DATABASE_URL is correct
3. Check database schema was created (startup.sh should handle this)

### Database Issues

**Issue**: Tables not created
**Solution**: startup.sh runs `prisma db push` automatically. Check logs.

**Issue**: Migration errors
**Solution**:
```bash
# Access Dokploy terminal and run:
npx prisma db push --force-reset --accept-data-loss
```
**Warning**: This will delete all data. Only use on fresh deployments.

## Migration from Local to Production

### Already have local data?

If you've been testing locally with SQLite and want to migrate:

1. Export your local data (if needed)
2. Deploy to production with PostgreSQL
3. Manually recreate test data, or
4. Write a seed script to populate production database

### Switching between environments

**Local Development** (`.env.local`):
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
```

**Production** (Dokploy environment variables):
```env
DATABASE_URL="postgresql://user:pass@postgres:5432/db"
NEXTAUTH_URL="https://your-domain.com"
```

## Support

If you encounter issues:

1. Check application logs in Dokploy
2. Verify all environment variables
3. Review build logs for errors
4. Consult [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed guide
5. Check Prisma schema matches database provider

## Deployment Complete! 🚀

Once all items are checked:

- ✅ Your app is live at https://your-domain.com
- ✅ Users can sign up and log in
- ✅ Database is operational
- ✅ SSL certificate is active
- ✅ Automatic backups configured

**Congratulations!** Your ScreenOnFire app is now in production! 🎬

---

**Last Updated**: 2025-12-22
**For**: Production Deployment to Dokploy with PostgreSQL
