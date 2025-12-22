# Database Migration Fix - Password Field

## Problem
User registration is failing with error:
```
The column `User.password` does not exist in the current database.
```

## Root Cause
The Prisma schema defines a `password` field in the User model, but the production PostgreSQL database doesn't have this column. This happened because the database was created before the password field was added to the schema.

## Solution

### Step 1: Understanding the Changes Made

1. **Updated Prisma Schema** (`prisma/schema.prisma`)
   - Changed `password String` to `password String?` (nullable)
   - This allows OAuth users (Google, GitHub) who don't have passwords

2. **Created Migration** (`prisma/migrations/20251222_add_password_field/migration.sql`)
   - Adds the `password` column to the User table
   - Column is nullable (TEXT type in PostgreSQL)
   - Safe to apply even if column already exists

3. **Generated Prisma Client**
   - Updated the TypeScript types to match the new schema

### Step 2: Apply Migration to Production

You need to run the migration in your Dokploy deployment:

#### Option A: Using Dokploy Dashboard (Recommended)

1. Open your Dokploy dashboard
2. Navigate to your ScreenOnFire application
3. Go to **Terminal** or **Console** tab
4. Run this command:
   ```bash
   npx prisma migrate deploy
   ```
5. Wait for it to complete (should take 5-10 seconds)
6. Restart the application if needed

#### Option B: Using Pre-Deploy Hook

1. In Dokploy, go to **Application Settings** → **Deploy**
2. Add this to **Pre-Deploy Commands**:
   ```bash
   npx prisma migrate deploy
   ```
3. Trigger a new deployment by clicking **Deploy**
4. The migration will run automatically before the app starts

#### Option C: Via SSH (Advanced)

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Find your app container
docker ps | grep screenonfire

# Execute migration in the container
docker exec -it <container-id> npx prisma migrate deploy
```

### Step 3: Verify the Fix

After applying the migration, try registering a new user:

1. Go to your app's signup page
2. Fill in the registration form:
   - Name: Test User
   - Email: test@example.com
   - Password: testpassword123
3. Click "Sign Up"
4. You should see "User created successfully" message

### Step 4: Push Code to Git

The migration files have been created. Now you need to commit and push them:

```bash
# Stage migration files
git add prisma/migrations/
git add prisma/schema.prisma
git add docs/DEPLOYMENT.md
git add MIGRATION_FIX.md

# Commit
git commit -m "Add password field migration for user authentication"

# Push to repository
git push origin main
```

After pushing, if you have auto-deploy enabled in Dokploy, it will automatically deploy with the migration.

## Technical Details

### Migration SQL
```sql
-- Add password column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'password'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "password" TEXT;
  END IF;
END $$;
```

This migration:
- Checks if the column already exists (safe to run multiple times)
- Adds the password column as TEXT type
- Makes it nullable (NULL allowed)
- Compatible with existing user records

### Schema Change
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String?
  avatar        String?
  password      String?  // ← Changed from String to String? (nullable)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  ...
}
```

## Why Password is Nullable

Making password nullable is the correct approach because:

1. **OAuth Support**: Users who sign in with Google/GitHub won't have passwords
2. **Backward Compatibility**: Existing users in the database won't break
3. **Flexible Authentication**: App can support both email/password and OAuth

## Next Steps After Migration

1. ✅ Password field will exist in database
2. ✅ Users can register with email/password
3. ✅ OAuth users can sign in without passwords
4. ✅ No breaking changes for existing users

## Troubleshooting

### Migration fails with "table does not exist"
Run this first to create all tables:
```bash
npx prisma db push
```
Then run:
```bash
npx prisma migrate deploy
```

### Still getting "column does not exist" error
1. Check that migration was actually applied:
   ```bash
   npx prisma migrate status
   ```
2. If migration is pending, run:
   ```bash
   npx prisma migrate deploy
   ```
3. Restart your application container

### Migration applied but still errors
1. Make sure Prisma Client was regenerated:
   ```bash
   npx prisma generate
   ```
2. Rebuild your application:
   ```bash
   npm run build
   ```
3. Restart the app

## Support

If you're still experiencing issues after following this guide:
1. Check the application logs in Dokploy dashboard
2. Verify DATABASE_URL environment variable is correct
3. Ensure PostgreSQL service is running
4. Check that the migration file exists in your repository

---

**Created**: 2025-12-22
**Status**: Ready to apply
**Impact**: Fixes user registration functionality
