-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "posterUrl" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "likedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovieLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieDislike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "dislikedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovieDislike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeenMovie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeenMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "ratedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovieRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" REAL,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovieReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Discussion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscussionReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscussionReaction_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscussionReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "releaseDate" DATETIME,
    "runtime" INTEGER,
    "voteAverage" REAL,
    "voteCount" INTEGER,
    "popularity" REAL,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "adult" BOOLEAN NOT NULL DEFAULT false,
    "originalLanguage" TEXT,
    "genres" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "favoriteGenres" TEXT NOT NULL DEFAULT '[]',
    "preferredLanguages" TEXT NOT NULL DEFAULT '[]',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "results" INTEGER NOT NULL,
    "searchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MovieView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "movieId" INTEGER NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_movieId_idx" ON "WatchlistItem"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_movieId_key" ON "WatchlistItem"("userId", "movieId");

-- CreateIndex
CREATE INDEX "MovieLike_userId_idx" ON "MovieLike"("userId");

-- CreateIndex
CREATE INDEX "MovieLike_movieId_idx" ON "MovieLike"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieLike_userId_movieId_key" ON "MovieLike"("userId", "movieId");

-- CreateIndex
CREATE INDEX "MovieDislike_userId_idx" ON "MovieDislike"("userId");

-- CreateIndex
CREATE INDEX "MovieDislike_movieId_idx" ON "MovieDislike"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieDislike_userId_movieId_key" ON "MovieDislike"("userId", "movieId");

-- CreateIndex
CREATE INDEX "SeenMovie_userId_idx" ON "SeenMovie"("userId");

-- CreateIndex
CREATE INDEX "SeenMovie_movieId_idx" ON "SeenMovie"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "SeenMovie_userId_movieId_key" ON "SeenMovie"("userId", "movieId");

-- CreateIndex
CREATE INDEX "MovieRating_userId_idx" ON "MovieRating"("userId");

-- CreateIndex
CREATE INDEX "MovieRating_movieId_idx" ON "MovieRating"("movieId");

-- CreateIndex
CREATE INDEX "MovieRating_rating_idx" ON "MovieRating"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "MovieRating_userId_movieId_key" ON "MovieRating"("userId", "movieId");

-- CreateIndex
CREATE INDEX "MovieReview_userId_idx" ON "MovieReview"("userId");

-- CreateIndex
CREATE INDEX "MovieReview_movieId_idx" ON "MovieReview"("movieId");

-- CreateIndex
CREATE INDEX "MovieReview_createdAt_idx" ON "MovieReview"("createdAt");

-- CreateIndex
CREATE INDEX "Discussion_movieId_idx" ON "Discussion"("movieId");

-- CreateIndex
CREATE INDEX "Discussion_userId_idx" ON "Discussion"("userId");

-- CreateIndex
CREATE INDEX "Discussion_parentId_idx" ON "Discussion"("parentId");

-- CreateIndex
CREATE INDEX "Discussion_createdAt_idx" ON "Discussion"("createdAt");

-- CreateIndex
CREATE INDEX "DiscussionReaction_discussionId_idx" ON "DiscussionReaction"("discussionId");

-- CreateIndex
CREATE INDEX "DiscussionReaction_userId_idx" ON "DiscussionReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionReaction_discussionId_userId_type_key" ON "DiscussionReaction"("discussionId", "userId", "type");

-- CreateIndex
CREATE INDEX "MovieCache_title_idx" ON "MovieCache"("title");

-- CreateIndex
CREATE INDEX "MovieCache_releaseDate_idx" ON "MovieCache"("releaseDate");

-- CreateIndex
CREATE INDEX "MovieCache_voteAverage_idx" ON "MovieCache"("voteAverage");

-- CreateIndex
CREATE INDEX "MovieCache_popularity_idx" ON "MovieCache"("popularity");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_searchedAt_idx" ON "SearchHistory"("searchedAt");

-- CreateIndex
CREATE INDEX "MovieView_userId_idx" ON "MovieView"("userId");

-- CreateIndex
CREATE INDEX "MovieView_movieId_idx" ON "MovieView"("movieId");

-- CreateIndex
CREATE INDEX "MovieView_viewedAt_idx" ON "MovieView"("viewedAt");
