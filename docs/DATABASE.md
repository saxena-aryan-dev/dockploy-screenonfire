# Database Schema Documentation

## Overview

ScreenOnFire uses **PostgreSQL** as its database with **Prisma ORM** for type-safe database operations. This document provides comprehensive documentation of the database schema, relationships, and best practices.

---

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [Schema Models](#schema-models)
3. [Relationships](#relationships)
4. [Indexes & Performance](#indexes--performance)
5. [Migrations](#migrations)
6. [Best Practices](#best-practices)

---

## Database Architecture

### Technology Stack
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 7.x
- **Connection**: Connection pooling via Prisma
- **Migrations**: Prisma Migrate

### Connection Configuration

```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

---

## Schema Models

### 1. User Management

#### User
Stores user account information.

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String?
  avatar        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Fields:**
- `id`: UUID primary key
- `email`: Unique email address (indexed)
- `name`: Optional display name
- `avatar`: Optional avatar URL
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

**Relations:**
- Has many `WatchlistItem`
- Has many `MovieLike`
- Has many `MovieDislike`
- Has many `SeenMovie`
- Has many `MovieReview`
- Has many `MovieRating`
- Has many `Discussion`
- Has many `DiscussionReaction`

---

### 2. Movie Interactions

#### WatchlistItem
Movies saved by users to watch later.

```prisma
model WatchlistItem {
  id          String   @id @default(uuid())
  userId      String
  movieId     Int
  movieTitle  String
  posterUrl   String?
  addedAt     DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
  @@index([movieId])
}
```

**Purpose**: Track movies users want to watch
**Unique Constraint**: User can only add a movie once
**Indexes**: Optimized for user lookups and movie queries

---

#### MovieLike
Tracks movies liked by users for recommendation algorithms.

```prisma
model MovieLike {
  id          String   @id @default(uuid())
  userId      String
  movieId     Int
  movieTitle  String
  likedAt     DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
  @@index([movieId])
}
```

**Purpose**: Feed ML recommendation engine
**Usage**: Influences personalized movie suggestions

---

#### MovieDislike
Tracks movies disliked by users.

```prisma
model MovieDislike {
  id          String   @id @default(uuid())
  userId      String
  movieId     Int
  movieTitle  String
  dislikedAt  DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
  @@index([movieId])
}
```

**Purpose**: Filter out unwanted recommendations
**Usage**: Prevents disliked movies from appearing in suggestions

---

#### SeenMovie
Tracks movies a user has already watched.

```prisma
model SeenMovie {
  id          String   @id @default(uuid())
  userId      String
  movieId     Int
  movieTitle  String
  watchedAt   DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
  @@index([movieId])
}
```

**Purpose**: Track viewing history
**Usage**: Avoids recommending already-watched movies

---

#### MovieRating
User ratings for movies (0-10 scale).

```prisma
model MovieRating {
  id          String   @id @default(uuid())
  userId      String
  movieId     Int
  movieTitle  String
  rating      Float    // 0.0 to 10.0
  ratedAt     DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, movieId])
  @@index([userId])
  @@index([movieId])
  @@index([rating])
}
```

**Purpose**: Granular rating system
**Constraints**: Rating between 0.0 and 10.0
**Features**: Can be updated over time

---

#### MovieReview
User-written reviews for movies.

```prisma
model MovieReview {
  id          String   @id @default(uuid())
  userId      String
  movieId     Int
  movieTitle  String
  content     String   @db.Text
  rating      Float?   // Optional rating with review
  helpful     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([movieId])
  @@index([createdAt])
}
```

**Purpose**: User-generated content
**Features**:
- Long-form text reviews
- Optional rating
- Helpful votes counter
- Editable (tracked via updatedAt)

---

### 3. Community Features

#### Discussion
Threaded discussions for movies.

```prisma
model Discussion {
  id          String   @id @default(uuid())
  movieId     Int
  userId      String
  content     String   @db.Text
  parentId    String?  // For threaded replies
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  parent      Discussion?  @relation("DiscussionReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     Discussion[] @relation("DiscussionReplies")

  @@index([movieId])
  @@index([userId])
  @@index([parentId])
  @@index([createdAt])
}
```

**Purpose**: Community discussions
**Features**:
- Threaded replies (self-referencing)
- Cascade delete (deleting parent deletes all replies)
- Chronological ordering

**Query Examples**:
```typescript
// Get root discussions for a movie
await prisma.discussion.findMany({
  where: { movieId: 123, parentId: null },
  include: { replies: true }
})

// Get all replies to a discussion
await prisma.discussion.findMany({
  where: { parentId: discussionId },
  include: { user: true }
})
```

---

#### DiscussionReaction
Reactions to discussions (like, love, etc.).

```prisma
model DiscussionReaction {
  id            String   @id @default(uuid())
  discussionId  String
  userId        String
  type          String   // 'like', 'love', 'haha', 'wow', etc.
  createdAt     DateTime @default(now())

  @@unique([discussionId, userId, type])
  @@index([discussionId])
  @@index([userId])
}
```

**Purpose**: Engagement tracking
**Types**: 'like', 'love', 'haha', 'wow', 'sad', 'angry'
**Constraint**: User can only react once per type per discussion

---

### 4. Performance & Caching

#### MovieCache
Cached TMDB data for faster queries.

```prisma
model MovieCache {
  id              Int      @id // TMDB movie ID
  title           String
  originalTitle   String?
  overview        String?  @db.Text
  releaseDate     DateTime?
  runtime         Int?
  voteAverage     Float?
  voteCount       Int?
  popularity      Float?
  posterPath      String?
  backdropPath    String?
  adult           Boolean  @default(false)
  originalLanguage String?
  genres          String[] // JSON array of genre IDs
  lastUpdated     DateTime @default(now())

  @@index([title])
  @@index([releaseDate])
  @@index([voteAverage])
  @@index([popularity])
}
```

**Purpose**: Reduce TMDB API calls
**Strategy**: Cache frequently accessed movie data
**Refresh**: Update `lastUpdated` on refresh (implement TTL logic in app)

---

### 5. User Preferences

#### UserPreference
User-specific settings and preferences.

```prisma
model UserPreference {
  id                  String   @id @default(uuid())
  userId              String   @unique
  favoriteGenres      Int[]    // Array of TMDB genre IDs
  preferredLanguages  String[] // e.g., ['en', 'hi', 'es']
  emailNotifications  Boolean  @default(true)
  theme               String   @default("dark") // 'dark' or 'light'
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([userId])
}
```

**Purpose**: Personalization
**Features**:
- Favorite genres for better recommendations
- Language preferences
- Notification settings
- Theme preference

---

### 6. Analytics

#### SearchHistory
Tracks user search queries for analytics.

```prisma
model SearchHistory {
  id          String   @id @default(uuid())
  userId      String?  // Nullable for anonymous users
  query       String
  results     Int      // Number of results returned
  searchedAt  DateTime @default(now())

  @@index([userId])
  @@index([searchedAt])
}
```

**Purpose**: Search analytics and trending queries
**Privacy**: Can be anonymous (userId optional)

---

#### MovieView
Tracks movie page views.

```prisma
model MovieView {
  id        String   @id @default(uuid())
  userId    String?  // Nullable for anonymous users
  movieId   Int
  viewedAt  DateTime @default(now())

  @@index([userId])
  @@index([movieId])
  @@index([viewedAt])
}
```

**Purpose**: Popularity tracking and trending movies
**Usage**: Identify most-viewed movies

---

## Relationships

### User → Movie Interactions (One-to-Many)

```
User (1) ─┬─ (N) WatchlistItem
          ├─ (N) MovieLike
          ├─ (N) MovieDislike
          ├─ (N) SeenMovie
          ├─ (N) MovieRating
          └─ (N) MovieReview
```

All movie interactions have **CASCADE DELETE** - when a user is deleted, all their interactions are removed.

---

### Discussion Relationships (Self-Referencing)

```
Discussion (Parent)
  └─ Discussion (Reply 1)
      ├─ Discussion (Reply 1.1)
      └─ Discussion (Reply 1.2)
```

**Cascade Behavior**: Deleting a parent discussion deletes all nested replies.

---

## Indexes & Performance

### Primary Indexes

All tables have a **UUID primary key** except `MovieCache` which uses TMDB's integer ID.

### Performance Indexes

1. **User Lookups**
   - `User.email` (unique index)
   - All relations: `userId` (indexed)

2. **Movie Lookups**
   - All movie interactions: `movieId` (indexed)
   - `MovieCache`: title, releaseDate, voteAverage, popularity

3. **Time-Series Queries**
   - `Discussion.createdAt`
   - `SearchHistory.searchedAt`
   - `MovieView.viewedAt`

4. **Composite Indexes**
   - Discussion: `[movieId, parentId]` for threaded queries

### Query Optimization Tips

```typescript
// ✅ GOOD: Uses index on movieId
const likes = await prisma.movieLike.findMany({
  where: { movieId: 123 }
})

// ✅ GOOD: Uses index on userId
const userLikes = await prisma.movieLike.findMany({
  where: { userId: "user-uuid" }
})

// ❌ AVOID: Full table scan
const allLikes = await prisma.movieLike.findMany()

// ✅ BETTER: Paginate
const allLikes = await prisma.movieLike.findMany({
  take: 100,
  skip: 0
})
```

---

## Migrations

### Development Workflow

```bash
# 1. Modify schema.prisma

# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Prisma automatically:
#    - Creates SQL migration file
#    - Applies migration to database
#    - Regenerates Prisma Client
```

### Production Deployment

```bash
# Apply pending migrations
npx prisma migrate deploy

# This runs in CI/CD before deployment
```

### Migration Files

Located in `prisma/migrations/`:
```
migrations/
├── 20250101000000_init/
│   └── migration.sql
├── 20250102000000_add_reviews/
│   └── migration.sql
└── migration_lock.toml
```

---

## Best Practices

### 1. Always Use Transactions for Related Operations

```typescript
// ✅ GOOD: Atomic operation
await prisma.$transaction(async (tx) => {
  await tx.movieLike.create({ data: likeData })
  await tx.movieDislike.deleteMany({ where: { userId, movieId } })
})
```

### 2. Use Select to Limit Fields

```typescript
// ❌ BAD: Fetches all fields
const user = await prisma.user.findUnique({
  where: { id: userId }
})

// ✅ GOOD: Only fetch needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true, name: true }
})
```

### 3. Use Include for Relations Wisely

```typescript
// ❌ BAD: N+1 query problem
const discussions = await prisma.discussion.findMany()
for (const discussion of discussions) {
  const user = await prisma.user.findUnique({ where: { id: discussion.userId } })
}

// ✅ GOOD: Single query with join
const discussions = await prisma.discussion.findMany({
  include: { user: true }
})
```

### 4. Implement Soft Deletes for Important Data

Consider adding `deletedAt` field for soft deletes:

```prisma
model User {
  // ... other fields
  deletedAt DateTime?
}
```

### 5. Use Unique Constraints to Prevent Duplicates

```typescript
// Prisma handles unique constraint violations gracefully
try {
  await prisma.movieLike.create({ data: { userId, movieId, movieTitle } })
} catch (error) {
  if (error.code === 'P2002') {
    // Already liked
  }
}
```

---

## Common Queries

### Get User's Movie Profile

```typescript
const userProfile = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    watchlist: { take: 10 },
    likes: { take: 20 },
    seen: { take: 50 }
  }
})
```

### Get Movie Statistics

```typescript
const movieStats = await prisma.movieCache.findUnique({
  where: { id: movieId },
  include: {
    _count: {
      select: {
        likes: true,
        dislikes: true,
        watchlistItems: true,
        reviews: true
      }
    }
  }
})
```

### Get Trending Movies (Last 7 Days)

```typescript
const trending = await prisma.movieView.groupBy({
  by: ['movieId'],
  where: {
    viewedAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  },
  _count: { movieId: true },
  orderBy: { _count: { movieId: 'desc' } },
  take: 10
})
```

---

## Database Maintenance

### Backup Strategy

```bash
# Daily backups
pg_dump -U postgres screenonfire > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres screenonfire < backup_20250118.sql
```

### Vacuum & Analyze

```sql
-- Run periodically for performance
VACUUM ANALYZE;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Troubleshooting

### Connection Pool Exhaustion

```typescript
// Configure in schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pooling parameters
  // ?connection_limit=10&pool_timeout=60
}
```

### Slow Queries

```bash
# Enable query logging
export DEBUG="prisma:query"
npm run dev

# Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM "MovieCache" WHERE title LIKE '%Batman%';
```

---

## Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Prisma Client API**: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
- **Migration Guide**: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

**Last Updated**: 2025-01-18
**Schema Version**: 1.0.0
