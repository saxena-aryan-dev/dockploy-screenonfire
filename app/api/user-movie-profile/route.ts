import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchFromTMDBServer } from '@/lib/tmdb-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/user-movie-profile
 * Returns the authenticated user's complete movie profile for the ML recommendation system.
 * Includes full TMDB movie objects for likes/watchlist (for feature extraction),
 * and IDs only for dislikes/seen (for exclusion filtering).
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Fetch all user movie data in parallel
    const [likes, watchlist, dislikes, seen, ratings, preferences] = await Promise.all([
      prisma.movieLike.findMany({
        where: { userId },
        select: { movieId: true, movieTitle: true },
        orderBy: { likedAt: 'desc' },
        take: 15
      }),
      prisma.watchlistItem.findMany({
        where: { userId },
        select: { movieId: true, movieTitle: true },
        orderBy: { addedAt: 'desc' },
        take: 10
      }),
      prisma.movieDislike.findMany({
        where: { userId },
        select: { movieId: true },
        orderBy: { dislikedAt: 'desc' }
      }),
      prisma.seenMovie.findMany({
        where: { userId },
        select: { movieId: true },
        orderBy: { watchedAt: 'desc' }
      }),
      prisma.movieRating.findMany({
        where: { userId },
        select: { movieId: true, rating: true },
        orderBy: { ratedAt: 'desc' }
      }),
      prisma.userPreference.findUnique({
        where: { userId },
        select: { favoriteGenres: true, preferredLanguages: true }
      })
    ])

    // Collect unique movie IDs that need TMDB details (likes + watchlist)
    const movieIdsForDetails = new Map<number, string>()
    for (const like of likes) {
      movieIdsForDetails.set(like.movieId, like.movieTitle)
    }
    for (const item of watchlist) {
      movieIdsForDetails.set(item.movieId, item.movieTitle)
    }

    // Batch-fetch TMDB details (max 25 movies, in batches of 5)
    const tmdbMovies = new Map<number, any>()
    const movieIdArray = Array.from(movieIdsForDetails.keys())

    for (let i = 0; i < movieIdArray.length; i += 5) {
      const batch = movieIdArray.slice(i, i + 5)

      const batchResults = await Promise.all(
        batch.map(async (movieId) => {
          try {
            const data = await fetchFromTMDBServer(`/3/movie/${movieId}`)
            return { movieId, data }
          } catch {
            // Return minimal fallback using stored title
            return {
              movieId,
              data: {
                id: movieId,
                title: movieIdsForDetails.get(movieId) || 'Unknown',
                overview: '',
                release_date: '2000-01-01',
                vote_average: 0,
                poster_path: null,
                backdrop_path: null,
                genre_ids: [],
                popularity: 0,
                original_language: 'en'
              }
            }
          }
        })
      )

      for (const result of batchResults) {
        const movie = result.data
        tmdbMovies.set(result.movieId, {
          id: movie.id,
          title: movie.title,
          overview: movie.overview || '',
          release_date: movie.release_date || '2000-01-01',
          vote_average: movie.vote_average || 0,
          poster_path: movie.poster_path || null,
          backdrop_path: movie.backdrop_path || null,
          genre_ids: movie.genres?.map((g: any) => g.id) || movie.genre_ids || [],
          popularity: movie.popularity || 0,
          original_language: movie.original_language || 'en'
        })
      }

      // Small delay between batches to respect TMDB rate limits
      if (i + 5 < movieIdArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Build response
    const likeMovies = likes
      .map(l => tmdbMovies.get(l.movieId))
      .filter(Boolean)

    const watchlistMovies = watchlist
      .map(w => tmdbMovies.get(w.movieId))
      .filter(Boolean)

    return NextResponse.json({
      likes: likeMovies,
      watchlist: watchlistMovies,
      dislikes: dislikes.map(d => d.movieId),
      seen: seen.map(s => s.movieId),
      ratings: ratings.map(r => ({ movieId: r.movieId, rating: r.rating })),
      preferences: preferences ? {
        favoriteGenres: preferences.favoriteGenres,
        preferredLanguages: preferences.preferredLanguages
      } : null
    })

  } catch (error) {
    console.error('Error fetching user movie profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user movie profile' },
      { status: 500 }
    )
  }
}
