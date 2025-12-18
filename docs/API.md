# API Documentation

This document provides comprehensive documentation for all API endpoints in the ScreenOnFire application.

## Base URL
All API endpoints are relative to: `/api`

## Authentication
Currently, the API uses a simple `userId` parameter for authentication. In production, this should be replaced with proper JWT or session-based authentication.

---

## 1. Watchlist API

### Get Watchlist
**GET** `/api/watchlist?userId={userId}`

Fetch all movies in a user's watchlist.

**Query Parameters:**
- `userId` (required): User's unique identifier

**Response:**
```json
{
  "success": true,
  "watchlist": [
    {
      "id": "uuid",
      "userId": "user-id",
      "movieId": 123,
      "movieTitle": "Movie Name",
      "posterUrl": "https://...",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 5
}
```

### Add to Watchlist
**POST** `/api/watchlist`

Add a movie to the user's watchlist.

**Request Body:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "movieTitle": "Movie Name",
  "posterUrl": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Movie added to watchlist",
  "watchlistItem": { ... }
}
```

### Remove from Watchlist
**DELETE** `/api/watchlist?userId={userId}&movieId={movieId}`

Remove a movie from the watchlist.

**Query Parameters:**
- `userId` (required): User's unique identifier
- `movieId` (required): TMDB movie ID

**Response:**
```json
{
  "success": true,
  "message": "Movie removed from watchlist"
}
```

---

## 2. Seen Movies API

### Get Seen Movies
**GET** `/api/seen?userId={userId}`

Fetch all movies the user has marked as seen/watched.

**Query Parameters:**
- `userId` (required): User's unique identifier

**Response:**
```json
{
  "success": true,
  "seenMovies": [
    {
      "id": "uuid",
      "userId": "user-id",
      "movieId": 123,
      "movieTitle": "Movie Name",
      "watchedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 10
}
```

### Mark as Seen
**POST** `/api/seen`

Mark a movie as seen/watched.

**Request Body:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "movieTitle": "Movie Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Movie marked as seen",
  "seenMovie": { ... }
}
```

### Remove from Seen
**DELETE** `/api/seen?userId={userId}&movieId={movieId}`

Remove a movie from the seen list.

**Query Parameters:**
- `userId` (required): User's unique identifier
- `movieId` (required): TMDB movie ID

---

## 3. Likes/Dislikes API

### Get Likes and Dislikes
**GET** `/api/likes?userId={userId}&type={type}`

Fetch user's liked or disliked movies.

**Query Parameters:**
- `userId` (required): User's unique identifier
- `type` (optional): `like`, `dislike`, or omit for both

**Response:**
```json
{
  "success": true,
  "likes": [...],
  "dislikes": [...],
  "likesCount": 5,
  "dislikesCount": 2
}
```

### Like/Dislike a Movie
**POST** `/api/likes`

Like or dislike a movie. This will automatically remove the opposite reaction.

**Request Body:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "movieTitle": "Movie Name",
  "type": "like"  // or "dislike"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Movie liked",
  "like": { ... }
}
```

### Remove Like/Dislike
**DELETE** `/api/likes?userId={userId}&movieId={movieId}&type={type}`

Remove a like or dislike.

**Query Parameters:**
- `userId` (required): User's unique identifier
- `movieId` (required): TMDB movie ID
- `type` (required): `like` or `dislike`

---

## 4. Movie Ratings API

### Get Ratings
**GET** `/api/ratings?userId={userId}&movieId={movieId}`

Fetch ratings by user or for a specific movie.

**Query Parameters:**
- `userId` (optional): Get all ratings by this user
- `movieId` (optional): Get all ratings for this movie
- Both: Get specific user's rating for a movie

**Response for movieId only:**
```json
{
  "success": true,
  "ratings": [...],
  "count": 10,
  "averageRating": 8.5
}
```

### Create/Update Rating
**POST** `/api/ratings`

Create or update a movie rating (0-10 scale).

**Request Body:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "movieTitle": "Movie Name",
  "rating": 8.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating saved",
  "rating": { ... }
}
```

### Update Rating
**PUT** `/api/ratings`

Update an existing rating.

**Request Body:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "rating": 9.0
}
```

### Delete Rating
**DELETE** `/api/ratings?userId={userId}&movieId={movieId}`

Remove a rating.

---

## 5. Movie Reviews API

### Get Reviews
**GET** `/api/reviews?userId={userId}&movieId={movieId}&limit=10&offset=0`

Fetch reviews by user or for a specific movie.

**Query Parameters:**
- `userId` (optional): Get all reviews by this user
- `movieId` (optional): Get all reviews for this movie
- `limit` (optional): Number of reviews to return
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "uuid",
      "userId": "user-id",
      "movieId": 123,
      "movieTitle": "Movie Name",
      "content": "This movie was amazing...",
      "rating": 9.0,
      "helpful": 15,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-id",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      }
    }
  ],
  "count": 25
}
```

### Create Review
**POST** `/api/reviews`

Create a new review for a movie.

**Request Body:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "movieTitle": "Movie Name",
  "content": "This movie was amazing...",
  "rating": 9.0  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review created",
  "review": { ... }
}
```

### Update Review
**PUT** `/api/reviews`

Update an existing review.

**Request Body:**
```json
{
  "reviewId": "review-uuid",
  "content": "Updated review content...",
  "rating": 9.5  // optional
}
```

### Delete Review
**DELETE** `/api/reviews?reviewId={reviewId}`

Delete a review.

**Query Parameters:**
- `reviewId` (required): Review's unique identifier

---

## 6. Discussions API

### Get Discussions
**GET** `/api/discussions?movieId={movieId}&discussionId={discussionId}&userId={userId}`

Fetch discussions for a movie, a specific discussion thread, or by user.

**Query Parameters:**
- `movieId` (optional): Get all top-level discussions for a movie
- `discussionId` (optional): Get specific discussion with all replies
- `userId` (optional): Get all discussions by a user

**Response for movieId:**
```json
{
  "success": true,
  "discussions": [
    {
      "id": "uuid",
      "movieId": 123,
      "userId": "user-id",
      "content": "What did you think about...",
      "parentId": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-id",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      },
      "reactions": [...],
      "_count": {
        "replies": 5
      }
    }
  ],
  "count": 10
}
```

### Create Discussion/Reply
**POST** `/api/discussions`

Create a new discussion or reply to an existing one.

**Request Body for Top-Level Discussion:**
```json
{
  "userId": "user-id",
  "movieId": 123,
  "content": "What did you think about..."
}
```

**Request Body for Reply:**
```json
{
  "userId": "user-id",
  "content": "I thought it was...",
  "parentId": "parent-discussion-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discussion created",
  "discussion": { ... }
}
```

### Update Discussion
**PUT** `/api/discussions`

Update an existing discussion (only owner can edit).

**Request Body:**
```json
{
  "discussionId": "discussion-uuid",
  "content": "Updated content...",
  "userId": "user-id"  // for ownership verification
}
```

### Delete Discussion
**DELETE** `/api/discussions?discussionId={discussionId}&userId={userId}`

Delete a discussion (only owner can delete). This will cascade delete all replies and reactions.

**Query Parameters:**
- `discussionId` (required): Discussion's unique identifier
- `userId` (required): User's ID for ownership verification

---

## 7. Discussion Reactions API

### Get Reactions
**GET** `/api/reactions?discussionId={discussionId}`

Fetch all reactions for a discussion.

**Query Parameters:**
- `discussionId` (required): Discussion's unique identifier

**Response:**
```json
{
  "success": true,
  "reactions": [...],
  "reactionCounts": [
    {
      "type": "like",
      "count": 15,
      "users": [
        {
          "id": "user-id",
          "name": "John Doe",
          "avatar": "https://..."
        }
      ]
    }
  ],
  "totalCount": 25
}
```

### Add Reaction
**POST** `/api/reactions`

Add a reaction to a discussion.

**Request Body:**
```json
{
  "userId": "user-id",
  "discussionId": "discussion-uuid",
  "type": "like"  // like, love, haha, wow, sad, angry
}
```

**Valid Reaction Types:**
- `like`
- `love`
- `haha`
- `wow`
- `sad`
- `angry`

**Response:**
```json
{
  "success": true,
  "message": "Reaction added",
  "reaction": { ... }
}
```

### Remove Reaction
**DELETE** `/api/reactions?userId={userId}&discussionId={discussionId}&type={type}`

Remove a reaction from a discussion.

**Query Parameters:**
- `userId` (required): User's unique identifier
- `discussionId` (required): Discussion's unique identifier
- `type` (required): Reaction type to remove

---

## 8. User Profile API

### Get Profile
**GET** `/api/profile?userId={userId}&email={email}`

Fetch user profile with statistics and recent activity.

**Query Parameters:**
- `userId` (optional): User's unique identifier
- `email` (optional): User's email address
- Either userId or email is required

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "stats": {
      "watchlistCount": 25,
      "likesCount": 50,
      "dislikesCount": 10,
      "seenCount": 100,
      "reviewsCount": 15,
      "ratingsCount": 80,
      "discussionsCount": 30,
      "averageRating": 7.5
    },
    "recentActivity": {
      "watchlist": [...],
      "reviews": [...]
    }
  }
}
```

### Create User
**POST** `/api/profile`

Create a new user account.

**Request Body:**
```json
{
  "email": "john@example.com",
  "name": "John Doe",
  "avatar": "https://..."  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created",
  "user": { ... }
}
```

### Update Profile
**PUT** `/api/profile`

Update user profile information.

**Request Body:**
```json
{
  "userId": "user-id",
  "name": "Updated Name",
  "avatar": "https://new-avatar-url"
}
```

### Delete Account
**DELETE** `/api/profile?userId={userId}`

Delete user account and all associated data.

**Query Parameters:**
- `userId` (required): User's unique identifier

---

## 9. User Preferences API

### Get Preferences
**GET** `/api/preferences?userId={userId}`

Fetch user preferences and settings.

**Query Parameters:**
- `userId` (required): User's unique identifier

**Response:**
```json
{
  "success": true,
  "preferences": {
    "id": "uuid",
    "userId": "user-id",
    "favoriteGenres": [28, 12, 878],  // TMDB genre IDs
    "preferredLanguages": ["en", "hi"],
    "emailNotifications": true,
    "theme": "dark",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Create/Update Preferences
**POST** `/api/preferences`

Create or update user preferences (upsert).

**Request Body:**
```json
{
  "userId": "user-id",
  "favoriteGenres": [28, 12, 878],
  "preferredLanguages": ["en", "hi"],
  "emailNotifications": true,
  "theme": "dark"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences saved",
  "preferences": { ... }
}
```

### Update Specific Fields
**PUT** `/api/preferences`

Update specific preference fields.

**Request Body:**
```json
{
  "userId": "user-id",
  "theme": "light",
  "emailNotifications": false
}
```

### Delete Preferences
**DELETE** `/api/preferences?userId={userId}`

Delete user preferences.

**Query Parameters:**
- `userId` (required): User's unique identifier

---

## Common Error Responses

### 400 Bad Request
```json
{
  "error": "userId is required"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "error": "Movie already in watchlist"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch watchlist"
}
```

---

## Testing the APIs

You can test these APIs using:

1. **cURL:**
```bash
curl http://localhost:3000/api/watchlist?userId=test-user-id
```

2. **Postman or Thunder Client:**
- Import the endpoints and test them interactively

3. **Frontend Integration:**
```javascript
// Example: Add to watchlist
const response = await fetch('/api/watchlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    movieId: 123,
    movieTitle: 'Movie Name',
    posterUrl: 'https://...'
  })
})

const data = await response.json()
```

---

## Database Schema

All data is stored in PostgreSQL using Prisma ORM. The schema includes:

- `User`: User accounts
- `WatchlistItem`: User's watchlist
- `MovieLike`: Liked movies
- `MovieDislike`: Disliked movies
- `SeenMovie`: Watched movies
- `MovieRating`: User ratings (0-10)
- `MovieReview`: User reviews
- `Discussion`: Movie discussions (threaded)
- `DiscussionReaction`: Reactions to discussions
- `UserPreference`: User settings
- `MovieCache`: TMDB movie data cache (optional)

For detailed schema information, see `prisma/schema.prisma`.

---

## Next Steps

1. **Add Authentication**: Replace userId parameter with JWT tokens or session-based auth
2. **Add Rate Limiting**: Prevent API abuse
3. **Add Pagination**: For large datasets (reviews, discussions)
4. **Add Search/Filtering**: For watchlists and seen movies
5. **Add Notifications**: When users get replies or reactions
6. **Add Moderation**: For discussions and reviews
7. **Add Analytics**: Track user behavior and preferences

---

## Support

For questions or issues, please refer to:
- Main README: `README.md`
- Database Documentation: `docs/DATABASE.md`
- Deployment Guide: `docs/DEPLOYMENT.md`
