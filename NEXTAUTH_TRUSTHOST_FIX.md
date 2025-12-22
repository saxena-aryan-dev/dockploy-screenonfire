# NextAuth UntrustedHost Error Fix

## Problem
After deploying to production at `https://screenonfire.in`, authentication fails with:

```
[auth][error] UntrustedHost: Host must be trusted. URL was: https://screenonfire.in/api/auth/session
```

Users see: **"Server error - There is a problem with the server configuration"**

## Root Cause
NextAuth.js v5 has a security feature that requires explicitly trusting the host domain. By default, it only trusts `localhost` and `127.0.0.1` for development.

When deployed to production, the host `https://screenonfire.in` is not automatically trusted, causing all authentication requests to fail.

## Solution Applied

### Code Fix (lib/auth.ts)
Added `trustHost: true` to the NextAuth configuration:

```typescript
export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host in production (required for NextAuth.js v5)
  providers: [
    // ... providers
  ],
  // ... rest of config
}
```

This tells NextAuth to trust the host from the `NEXTAUTH_URL` environment variable and the request URL.

### Environment Variable Configuration

Ensure your Dokploy environment variables include:

```env
# Required: Set this to your production domain
NEXTAUTH_URL=https://screenonfire.in

# Required: Generate a secure secret
NEXTAUTH_SECRET=your_generated_secret_here

# Optional: Explicitly trust host (now set in code)
# AUTH_TRUST_HOST=true
```

**Generate NEXTAUTH_SECRET** if you haven't already:
```bash
openssl rand -base64 32
```

## Deployment Steps

### 1. Push Code Changes
```bash
git add lib/auth.ts .env.example
git commit -m "Fix NextAuth UntrustedHost error in production"
git push origin main
```

### 2. Verify Environment Variables in Dokploy

Go to your Dokploy dashboard → ScreenOnFire app → **Environment** tab:

**Check that these are set:**
- ✅ `NEXTAUTH_URL=https://screenonfire.in` (exact domain, no trailing slash)
- ✅ `NEXTAUTH_SECRET=(your secret key)`
- ✅ `DATABASE_URL=(your PostgreSQL connection string)`

### 3. Redeploy the Application

Either:
- **Auto-deploy**: Push to main triggers automatic deployment
- **Manual deploy**: Click **Deploy** button in Dokploy dashboard

### 4. Verify the Fix

After deployment:
1. Visit `https://screenonfire.in`
2. Try to sign up or log in
3. Authentication should work without "UntrustedHost" errors
4. Check logs in Dokploy - no more `[auth][error] UntrustedHost` messages

## Technical Details

### Why This Happens

NextAuth.js v5 introduced stricter security:
- Prevents host header injection attacks
- Requires explicit trust of production domains
- Default: Only trusts localhost for development

### The `trustHost: true` Option

When `trustHost: true`:
- NextAuth trusts the host from `NEXTAUTH_URL` environment variable
- Also trusts the incoming request's host header
- Safe for single-domain deployments
- Required for most production environments

### Alternative Solutions

**For multi-domain deployments**, you can specify exact hosts:

```typescript
export const authOptions: NextAuthConfig = {
  // Instead of trustHost: true, use:
  // This is more secure but requires listing all domains
  trustHost: process.env.NODE_ENV === 'production'
    ? ['screenonfire.in', 'www.screenonfire.in']
    : true,
  // ... rest of config
}
```

**For environment variable control**:
```typescript
export const authOptions: NextAuthConfig = {
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
  // ... rest of config
}
```

Then set `AUTH_TRUST_HOST=true` in Dokploy environment variables.

## Security Considerations

### Is `trustHost: true` Safe?

**Yes**, for single-domain deployments like ScreenOnFire:
- ✅ You control the domain (screenonfire.in)
- ✅ NEXTAUTH_URL is set correctly
- ✅ HTTPS is enforced (via Dokploy/Let's Encrypt)
- ✅ No shared hosting or dynamic domains

### When NOT to Use `trustHost: true`

Avoid if:
- ❌ Multi-tenant application with many domains
- ❌ User-provided subdomains
- ❌ Shared hosting with untrusted neighbors
- ❌ Dynamic domain assignment

In these cases, explicitly list trusted hosts.

## Common Issues & Troubleshooting

### Still Getting UntrustedHost Error

1. **Check NEXTAUTH_URL is correct**:
   ```bash
   # In Dokploy console
   echo $NEXTAUTH_URL
   # Should output: https://screenonfire.in
   ```

2. **Ensure code changes are deployed**:
   ```bash
   # Check if trustHost is in the code
   cat lib/auth.ts | grep trustHost
   # Should show: trustHost: true,
   ```

3. **Clear build cache and redeploy**:
   - In Dokploy, click **Settings** → **Clear Cache**
   - Then click **Deploy**

### Authentication Works Locally but Not in Production

**Problem**: `NEXTAUTH_URL` mismatch

**Solution**:
- Local: `NEXTAUTH_URL=http://localhost:3000`
- Production: `NEXTAUTH_URL=https://screenonfire.in`

Make sure production Dokploy environment has the production URL.

### Session Cookie Not Being Set

**Problem**: HTTPS/secure cookie issues

**Solution**: Ensure in production:
```env
NEXTAUTH_URL=https://screenonfire.in  # Must be HTTPS
NODE_ENV=production
```

NextAuth automatically sets `secure: true` for cookies in production with HTTPS.

## Verification Checklist

After deploying the fix:

- [ ] No `[auth][error] UntrustedHost` in Dokploy logs
- [ ] Sign up form creates new users successfully
- [ ] Login form authenticates existing users
- [ ] Session persists across page refreshes
- [ ] Logout functionality works
- [ ] Protected routes redirect unauthenticated users
- [ ] User profile shows correct user data

## Related Documentation

- [NextAuth.js v5 Migration Guide](https://authjs.dev/guides/upgrade-to-v5)
- [NextAuth Errors - UntrustedHost](https://errors.authjs.dev#untrustedhost)
- [NextAuth Configuration](https://authjs.dev/reference/nextjs)

## Summary

**What was changed**:
- Added `trustHost: true` to `lib/auth.ts`
- Updated `.env.example` with production notes

**Why it works**:
- NextAuth now trusts the production domain from environment variables
- No more host validation errors in production

**What to do**:
1. Ensure `NEXTAUTH_URL=https://screenonfire.in` in Dokploy
2. Push code changes to Git
3. Deploy to production
4. Test authentication flows

---

**Created**: 2025-12-22
**Status**: Fixed in code, ready to deploy
**Impact**: Enables authentication in production
