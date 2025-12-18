# Movie Card Features - Like, Dislike & Watchlist

## Overview

The movie cards now have interactive like, dislike, and watchlist buttons with full API integration!

## Features Implemented

### 1. **Watchlist Button** (Bookmark Icon)
- Located in the **top-right corner** of the movie poster
- **Yellow when active**, gray when inactive
- Click to add/remove movies from your watchlist
- Tooltip shows "Add to Watchlist" or "Remove from Watchlist"

### 2. **Like Button** (Thumbs Up)
- Appears on **hover** at the bottom of the movie poster
- **Green when active**, transparent when inactive
- Click to like a movie (removes dislike if present)
- Click again to unlike

### 3. **Dislike Button** (Thumbs Down)
- Appears on **hover** at the bottom of the movie poster
- **Red when active**, transparent when inactive
- Click to dislike a movie (removes like if present)
- Click again to remove dislike

## User Experience

### Visual States

```
Movie Card:
┌─────────────────────┐
│  ⭐ 8.5   📑 Bookmark│  ← Bookmark (Watchlist) - Always visible
│                     │
│    Movie Poster     │
│                     │
│  [👍 Like] [👎 Dis] │  ← Like/Dislike - Shows on hover
│   View Details      │
└─────────────────────┘
```

### Color Coding
- **Yellow** - In Watchlist (Bookmark icon filled)
- **Green** - Liked (Thumbs up filled)
- **Red** - Disliked (Thumbs down filled)
- **Gray/Transparent** - Not active

### Interaction Flow

1. **Hover over a movie card**
   - See the gradient overlay
   - Like and Dislike buttons slide up from the bottom
   - "View Details" button appears in center

2. **Click Like**
   - Button turns green
   - Thumbs up icon fills
   - If movie was disliked, dislike is automatically removed
   - API call saves your preference

3. **Click Dislike**
   - Button turns red
   - Thumbs down icon fills
   - If movie was liked, like is automatically removed
   - API call saves your preference

4. **Click Bookmark**
   - Button turns yellow
   - Bookmark icon fills
   - Movie added to your watchlist
   - API call saves to database

## Technical Details

### Components Updated

1. **`components/movie-card.tsx`**
   - Added Like and Dislike buttons
   - Changed Heart to Bookmark icon for watchlist
   - Added hover overlay with action buttons
   - Handles click events for all actions

2. **`components/movie-grid.tsx`**
   - Updated props to include like/dislike handlers
   - Passes state to each MovieCard
   - Optional props (backward compatible)

3. **`app/discover/page.tsx`**
   - Integrated `useMovieActions` hook
   - Manages state for all movies
   - Passes handlers to MovieGrid

### Custom Hook

**`hooks/useMovieActions.ts`**

Manages all movie interactions:
- Loads user's existing data on mount
- Optimistic UI updates (instant feedback)
- API calls with error handling and rollback
- Prevents duplicate actions

### API Integration

All actions call these endpoints:

```typescript
// Watchlist
POST /api/watchlist - Add movie
DELETE /api/watchlist?userId=X&movieId=Y - Remove movie
GET /api/watchlist?userId=X - Get all

// Likes/Dislikes
POST /api/likes - Like or dislike (type: 'like' | 'dislike')
DELETE /api/likes?userId=X&movieId=Y&type=like - Remove
GET /api/likes?userId=X - Get all likes and dislikes
```

### State Management

The `useMovieActions` hook manages state with:
- **Sets** for O(1) lookups
- **Optimistic updates** for instant UI feedback
- **Automatic rollback** on API errors
- **Loading states** to prevent double-clicks

## User ID Handling

Currently uses a **temporary user ID** stored in localStorage:

```typescript
const userId = localStorage.getItem('tempUserId') || 'user-' + Date.now()
```

### Replace with Real Authentication

When you implement authentication, update the discover page:

```typescript
// Replace this:
const userId = "demo-user-" + ...

// With your auth:
import { useAuth } from '@/hooks/useAuth'
const { user } = useAuth()
const userId = user?.id || ''
```

## Testing

### 1. Visual Test
```bash
npm run dev
# Go to http://localhost:3000/discover
# Hover over a movie card
# Try clicking Like, Dislike, and Bookmark buttons
```

### 2. API Test

Watch the Network tab in DevTools:
```
1. Click Like → See POST /api/likes
2. Click again → See DELETE /api/likes
3. Click Bookmark → See POST /api/watchlist
```

### 3. Persistence Test
```
1. Like some movies
2. Refresh the page
3. Liked movies should remain liked (green)
4. Data is stored in PostgreSQL database
```

## Responsive Design

- **Desktop**: All buttons visible and easy to click
- **Tablet**: Buttons scale appropriately
- **Mobile**: Touch-friendly tap targets (8px height minimum)

## Animations

- **Slide up**: Like/Dislike buttons on hover
- **Scale**: All buttons scale on hover
- **Fill**: Icons fill with color when active
- **Smooth**: 300ms transitions for all states

## Error Handling

The hook handles errors gracefully:
- Shows optimistic update immediately
- Reverts on API error
- Console logs errors for debugging
- No error messages shown to user (silent fail)

## Performance

- **Optimistic updates**: No waiting for API
- **Debounced API calls**: Prevents spam
- **Memoized callbacks**: No unnecessary re-renders
- **Set-based lookups**: O(1) complexity for state checks

## Future Enhancements

1. **Toast Notifications**
   ```typescript
   // Add success messages
   toast.success("Added to watchlist!")
   toast.info("Movie liked!")
   ```

2. **Undo Action**
   ```typescript
   // Allow users to undo
   <Button onClick={undo}>Undo</Button>
   ```

3. **Sync Across Tabs**
   ```typescript
   // Use BroadcastChannel for real-time sync
   const channel = new BroadcastChannel('movie-actions')
   ```

4. **Keyboard Shortcuts**
   ```typescript
   // Add keyboard support
   L - Like
   D - Dislike
   W - Add to Watchlist
   ```

## Troubleshooting

### Buttons Not Appearing
- Check that `onLike` and `onDislike` props are passed
- Verify `useMovieActions` hook is initialized
- Ensure userId is valid

### State Not Persisting
- Check database connection
- Verify API endpoints are working
- Check browser console for errors
- Ensure userId is consistent

### Styles Not Showing
- Verify Tailwind classes are compiled
- Check z-index values
- Ensure parent has `group` class

## Code Example

```typescript
// In your component
import { useMovieActions } from '@/hooks/useMovieActions'

function MyComponent() {
  const userId = 'user-123' // From auth

  const {
    isInWatchlist,
    isLiked,
    isDisliked,
    addToWatchlist,
    removeFromWatchlist,
    likeMovie,
    dislikeMovie
  } = useMovieActions({ userId })

  return (
    <MovieGrid
      movies={movies}
      isInWatchlist={(id) => isInWatchlist(parseInt(id))}
      isLiked={isLiked}
      isDisliked={isDisliked}
      onAddToWatchlist={addToWatchlist}
      onRemoveFromWatchlist={removeFromWatchlist}
      onLike={likeMovie}
      onDislike={dislikeMovie}
    />
  )
}
```

## Summary

✅ **Watchlist**: Bookmark button (top-right, always visible)
✅ **Like**: Thumbs up (bottom overlay, on hover)
✅ **Dislike**: Thumbs down (bottom overlay, on hover)
✅ **API Integration**: Full CRUD operations
✅ **Optimistic Updates**: Instant feedback
✅ **Error Handling**: Graceful rollback
✅ **State Persistence**: Stored in PostgreSQL
✅ **Responsive**: Works on all devices
✅ **Animated**: Smooth transitions

The movie cards are now fully interactive with beautiful animations and robust functionality! 🎬✨
