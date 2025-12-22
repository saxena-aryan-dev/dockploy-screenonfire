# Deployment Guide - ScreenOnFire

This guide covers deploying ScreenOnFire to a VPS using Dokploy with PostgreSQL database.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ VPS with Ubuntu 20.04+ (Minimum 2GB RAM, 4GB recommended)
- ✅ Domain name pointing to your VPS IP
- ✅ SSH access to your VPS
- ✅ TMDB API key ([Get here](https://www.themoviedb.org/settings/api))
- ✅ Google Gemini API key ([Get here](https://ai.google.dev/))

---

## Step 1: Install Dokploy on Your VPS

### 1.1 SSH into Your VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Install Dokploy

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

This will:
- Install Docker
- Install Dokploy
- Set up reverse proxy (Traefik)
- Configure SSL certificates (Let's Encrypt)

### 1.3 Access Dokploy Dashboard

Open your browser and navigate to:
```
https://your-domain.com:3000
```

Complete the initial setup by creating an admin account.

---

## Step 2: Set Up PostgreSQL Database

### 2.1 Create Database Service

1. In Dokploy dashboard, go to **Databases**
2. Click **Create Database**
3. Select **PostgreSQL**
4. Configure:
   - **Name**: `screenonfire-db`
   - **Version**: `14` or higher
   - **Database Name**: `screenonfire`
   - **Username**: `screenonfire_user`
   - **Password**: Generate a strong password
   - **Port**: `5432`

5. Click **Create**

### 2.2 Note Connection Details

Dokploy will provide a connection string:
```
postgresql://screenonfire_user:password@postgres:5432/screenonfire?schema=public
```

**Important**: Save this connection string for environment variables.

---

## Step 3: Deploy the Application

### 3.1 Create Application in Dokploy

1. Go to **Applications** → **Create Application**
2. Select **GitHub** as source
3. Connect your GitHub repository
4. Configure:
   - **Repository**: `your-username/screenonfire`
   - **Branch**: `main`
   - **Build Provider**: `Nixpacks`
   - **Root Directory**: `/` (or leave empty)

### 3.2 Configure Build Settings

In the **Build** tab:

```yaml
Build Provider: Nixpacks
Install Command: npm install
Build Command: npm run build
Start Command: npm start
Port: 3000
```

### 3.3 Add Environment Variables

In the **Environment** tab, add:

```env
# Database
DATABASE_URL=postgresql://screenonfire_user:password@postgres:5432/screenonfire?schema=public

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_generated_secret_here

# TMDB API
TMDB_API_KEY=your_tmdb_api_key_here
TMDB_ACCESS_TOKEN=your_tmdb_access_token_here
NEXT_PUBLIC_TMDB_ACCESS_TOKEN=your_tmdb_access_token_here

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Node Environment
NODE_ENV=production
```

**⚠️ Replace placeholders** with your actual API keys and database credentials.

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```
This generates a secure random secret for NextAuth.js session encryption.

---

## Step 4: Configure Nixpacks

The project includes a `nixpacks.toml` file that configures the build process:

```toml
# nixpacks.toml
[phases.setup]
nixPkgs = ["nodejs_20", "openssl", "postgresql"]

[phases.install]
cmds = [
  "npm ci --legacy-peer-deps",
  "npx prisma generate"
]

[phases.build]
cmds = [
  "npm run build"
]

[start]
cmd = "npm run start:prod"

[variables]
NODE_ENV = "production"
```

**No action needed** - Dokploy will automatically use this configuration.

---

## Step 5: Set Up Database Migrations

### 5.1 Configure Pre-Deploy Hook

In Dokploy, add a pre-deploy command to run migrations:

1. Go to **Application Settings** → **Deploy**
2. Add **Pre-Deploy Command**:
   ```bash
   npx prisma migrate deploy
   ```

This ensures database migrations run before each deployment.

### 5.2 Initial Migration (First Deployment)

After first deployment, run initial migration via Dokploy terminal:

```bash
npx prisma migrate deploy
```

Or create the initial migration locally and push:

```bash
# On your local machine
npx prisma migrate dev --name init

# Commit and push to Git
git add prisma/migrations
git commit -m "Add initial database migration"
git push
```

---

## Step 6: Configure Domain & SSL

### 6.1 Add Domain

1. In Dokploy, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `screenonfire.com`
4. Enable **HTTPS** (Let's Encrypt)
5. Save

### 6.2 DNS Configuration

Point your domain to your VPS:

```
Type: A Record
Name: @
Value: your-vps-ip
TTL: 3600
```

For www subdomain:
```
Type: CNAME
Name: www
Value: your-domain.com
TTL: 3600
```

### 6.3 SSL Certificate

Dokploy automatically provisions SSL certificates via Let's Encrypt. Wait 2-5 minutes for DNS propagation and certificate issuance.

---

## Step 7: Deploy!

### 7.1 Trigger Deployment

1. In Dokploy dashboard, click **Deploy**
2. Monitor build logs in real-time
3. Wait for build to complete (usually 3-5 minutes)

### 7.2 Verify Deployment

Check if the app is running:

```bash
curl https://your-domain.com
```

Or visit `https://your-domain.com` in your browser.

---

## Post-Deployment

### Health Checks

Dokploy provides automatic health checks. Verify:

```bash
# Check app status
curl https://your-domain.com/api/tmdb?path=/3/movie/popular

# Check database connection
# (This will be implemented in your app)
curl https://your-domain.com/api/health
```

### View Logs

Access logs in Dokploy dashboard:
- **Application Logs**: Real-time application output
- **Build Logs**: Build process details
- **Database Logs**: PostgreSQL logs

### Database Backup

Set up automatic backups:

1. Go to **Database Settings** → **Backups**
2. Enable automatic backups
3. Set backup schedule (e.g., daily at 2 AM)
4. Configure retention policy (e.g., keep 7 days)

---

## Continuous Deployment

### Auto-Deploy on Git Push

Enable automatic deployments:

1. In Dokploy, go to **Application Settings**
2. Enable **Auto Deploy**
3. Select **Branch**: `main`

Now every push to `main` branch triggers automatic deployment.

### Webhook (Optional)

For manual control, use GitHub webhooks:

1. Copy webhook URL from Dokploy
2. Add to GitHub repository settings
3. Configure to trigger on push events

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with Prisma errors

**Solution**:
```bash
# Ensure DATABASE_URL is set correctly
# Check environment variables in Dokploy

# Regenerate Prisma client
npx prisma generate
```

---

**Issue**: "Module not found" errors

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Database Connection Issues

**Issue**: "Can't reach database server"

**Solution**:
1. Verify DATABASE_URL is correct
2. Check PostgreSQL service is running in Dokploy
3. Ensure network connectivity between app and database

**Test connection**:
```bash
# SSH into app container
docker exec -it screenonfire sh

# Test PostgreSQL connection
nc -zv postgres 5432
```

---

### SSL Certificate Issues

**Issue**: SSL certificate not issued

**Solution**:
1. Verify DNS is pointing to correct IP
2. Wait 5-10 minutes for DNS propagation
3. Check Traefik logs in Dokploy
4. Ensure ports 80 and 443 are open

---

### High Memory Usage

**Issue**: App crashes due to memory

**Solution**:
1. Increase VPS resources (upgrade to 4GB RAM)
2. Configure Node.js memory limits:
   ```env
   NODE_OPTIONS=--max-old-space-size=2048
   ```

---

## Scaling & Optimization

### Enable Horizontal Scaling

For high traffic:

1. Deploy multiple instances
2. Configure load balancer in Dokploy
3. Use connection pooling for PostgreSQL

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON "WatchlistItem"(userId);
CREATE INDEX IF NOT EXISTS idx_movie_cache_title ON "MovieCache"(title);

-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim storage
VACUUM;
```

### Caching Strategy

Implement Redis for API caching:

1. Create Redis service in Dokploy
2. Update environment variables:
   ```env
   REDIS_URL=redis://redis:6379
   ```
3. Implement caching in API routes

---

## Monitoring

### Application Metrics

Monitor via Dokploy dashboard:
- CPU usage
- Memory consumption
- Disk I/O
- Network traffic

### Database Metrics

Track PostgreSQL performance:
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('screenonfire'));
```

### Alerts (Optional)

Set up alerts for:
- High CPU/memory usage (>80%)
- Database connection errors
- Application downtime
- SSL certificate expiration

---

## Backup & Recovery

### Manual Backup

```bash
# SSH into VPS
ssh root@your-vps-ip

# Backup database
docker exec screenonfire-db pg_dump -U screenonfire_user screenonfire > backup_$(date +%Y%m%d).sql

# Download backup
scp root@your-vps-ip:backup_*.sql ./backups/
```

### Restore from Backup

```bash
# SSH into VPS
ssh root@your-vps-ip

# Upload backup
scp backup_20250118.sql root@your-vps-ip:/tmp/

# Restore database
docker exec -i screenonfire-db psql -U screenonfire_user screenonfire < /tmp/backup_20250118.sql
```

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` to Git
- ✅ Use strong passwords for database
- ✅ Rotate API keys regularly

### 2. Database Security
- ✅ Use non-root database user
- ✅ Enable SSL connections
- ✅ Implement rate limiting

### 3. Application Security
- ✅ Keep dependencies updated
- ✅ Enable CORS properly
- ✅ Sanitize user inputs
- ✅ Implement CSP headers

### 4. Server Security
- ✅ Enable firewall (ufw)
- ✅ Disable root SSH access
- ✅ Use SSH keys (not passwords)
- ✅ Keep system updated

```bash
# Enable firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # Dokploy dashboard
ufw enable

# Update system
apt update && apt upgrade -y
```

---

## Cost Estimation

### VPS Requirements

**Minimum** (Small traffic, <1000 users/day):
- 2GB RAM
- 2 CPU cores
- 50GB SSD
- **Cost**: ~$5-10/month (DigitalOcean, Hetzner, Vultr)

**Recommended** (Medium traffic, <10,000 users/day):
- 4GB RAM
- 2 CPU cores
- 80GB SSD
- **Cost**: ~$12-20/month

**High Traffic** (>10,000 users/day):
- 8GB RAM
- 4 CPU cores
- 160GB SSD
- **Cost**: ~$40-60/month

### Additional Costs
- Domain name: ~$12/year
- SSL certificate: **Free** (Let's Encrypt)
- Backups: Included with Dokploy
- **Total monthly**: $5-60 (based on traffic)

---

## Support & Resources

### Documentation
- [Dokploy Docs](https://dokploy.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

### Community
- [Dokploy Discord](https://discord.gg/dokploy)
- [GitHub Issues](https://github.com/yourusername/screenonfire/issues)

### Professional Support
For deployment assistance, contact your DevOps team or hire a consultant.

---

**Last Updated**: 2025-01-18
**Version**: 1.0.0

---

**Your ScreenOnFire app is now live! 🚀🎬**
