import { NextRequest } from 'next/server'
import {
  generateRecommendations,
  RecommendationRequest,
  RecommendationWeights
} from '@/lib/ml-recommender'
import { TMDBMovie } from '@/lib/tmdb-supabase'
import {
  getPopularMoviesServer,
  getTopRatedMoviesServer,
  discoverMoviesServer,
  getSimilarMoviesServer,
  getMovieRecommendationsServer
} from '@/lib/tmdb-server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering (prevents build-time execution)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60 // Extended timeout for ML processing

interface MLRecommendationRequestBody {
  selectedMovies: TMDBMovie[]
  weights: RecommendationWeights
  limit?: number
  minScore?: number
  candidateSource?: 'popular' | 'top_rated' | 'discover' | 'mixed'
  genreFilter?: number[]
  yearFilter?: number
  ratingFilter?: number
  excludeMovieIds?: number[]
  movieRatings?: Record<number, number>
}

export async function POST(req: NextRequest) {
  try {
    const body: MLRecommendationRequestBody = await req.json()

    // Validate request
    if (!body.selectedMovies || !Array.isArray(body.selectedMovies) || body.selectedMovies.length === 0) {
      return Response.json(
        { error: 'At least one selected movie is required' },
        { status: 400 }
      )
    }

    if (!body.weights) {
      return Response.json(
        { error: 'Recommendation weights are required' },
        { status: 400 }
      )
    }

    const limit = Math.min(body.limit || 20, 50) // Cap at 50 recommendations
    const minScore = body.minScore || 0.1
    const candidateSource = body.candidateSource || 'mixed'

    // Phase 3c: Server-side fallback exclusion for authenticated users
    let serverExcludeIds: number[] = body.excludeMovieIds || []
    let userPreferences: { favoriteGenres: number[]; preferredLanguages: string[] } | null = null

    try {
      const session = await auth()
      if (session?.user?.id) {
        const userId = session.user.id

        // If no exclusion IDs were sent from the client, fetch them server-side (defense-in-depth)
        if (serverExcludeIds.length === 0) {
          const [dislikes, seen] = await Promise.all([
            prisma.movieDislike.findMany({
              where: { userId },
              select: { movieId: true }
            }),
            prisma.seenMovie.findMany({
              where: { userId },
              select: { movieId: true }
            })
          ])
          serverExcludeIds = [
            ...dislikes.map(d => d.movieId),
            ...seen.map(s => s.movieId)
          ]
          if (serverExcludeIds.length > 0) {
            console.log(`Server-side fallback: excluding ${serverExcludeIds.length} disliked/seen movies`)
          }
        }

        // Phase 6: Fetch user preferences for preference-based discovery
        const prefs = await prisma.userPreference.findUnique({
          where: { userId },
          select: { favoriteGenres: true, preferredLanguages: true }
        })
        if (prefs) {
          userPreferences = prefs
        }
      }
    } catch (error) {
      console.warn('Failed to fetch user data for recommendations (continuing without):', error)
    }

    // Get candidate movies from TMDB
    let candidateMovies: TMDBMovie[] = []

    try {
      switch (candidateSource) {
        case 'popular':
          const popularResult = await getPopularMoviesServer(1)
          const popularPage2 = await getPopularMoviesServer(2)
          candidateMovies = [...(popularResult.results || []), ...(popularPage2.results || [])]
          break

        case 'top_rated':
          const topRatedResult = await getTopRatedMoviesServer(1)
          const topRatedPage2 = await getTopRatedMoviesServer(2)
          candidateMovies = [...(topRatedResult.results || []), ...(topRatedPage2.results || [])]
          break

        case 'discover':
          const discoverParams: any = { page: 1 }
          if (body.genreFilter && body.genreFilter.length > 0) {
            discoverParams.genres = body.genreFilter
          }
          if (body.yearFilter) {
            discoverParams.year = body.yearFilter
          }
          if (body.ratingFilter) {
            discoverParams.minRating = body.ratingFilter
          }

          const discoverResult = await discoverMoviesServer(discoverParams)
          const discoverPage2 = await discoverMoviesServer({ ...discoverParams, page: 2 })
          candidateMovies = [...(discoverResult.results || []), ...(discoverPage2.results || [])]
          break

        case 'mixed':
        default:
          // Get a mix of popular and top-rated movies
          const [popular, topRated] = await Promise.all([
            getPopularMoviesServer(1),
            getTopRatedMoviesServer(1)
          ])
          candidateMovies = [...(popular.results || []), ...(topRated.results || [])]

          // Add some discovery movies if filters are provided
          if (body.genreFilter && body.genreFilter.length > 0) {
            const discovered = await discoverMoviesServer({
              genres: body.genreFilter,
              page: 1
            })
            candidateMovies.push(...(discovered.results || []))
          }
          break
      }

      // Remove duplicates by ID
      candidateMovies = candidateMovies.filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id)
      )

      // PRIORITY 1: Get similar movies AND TMDB recommendations for ALL selected movies
      console.log(`Fetching similar + recommended movies for ${body.selectedMovies.length} selected movies...`)
      const similarAndRecPromises = body.selectedMovies.map(async (movie) => {
        try {
          // Fetch similar (content-based) + recommendations (collaborative) in parallel
          const [similarPage1, similarPage2, recsPage1] = await Promise.all([
            getSimilarMoviesServer(movie.id, 1),
            getSimilarMoviesServer(movie.id, 2),
            getMovieRecommendationsServer(movie.id, 1)
          ])
          const similarResults = [...(similarPage1.results || []), ...(similarPage2.results || [])]
          const recResults = recsPage1.results || []
          console.log(`Found ${similarResults.length} similar + ${recResults.length} recommended for "${movie.title}"`)
          return { similar: similarResults, recommended: recResults }
        } catch (error) {
          console.warn(`Failed to get similar/recommended movies for ${movie.id}:`, error)
          return { similar: [], recommended: [] }
        }
      })

      const similarAndRecLists = await Promise.all(similarAndRecPromises)

      const similarMovies = similarAndRecLists
        .flatMap(r => r.similar)
        .filter((movie, index, self) => index === self.findIndex(m => m.id === movie.id))

      const recommendedMovies = similarAndRecLists
        .flatMap(r => r.recommended)
        .filter((movie, index, self) => index === self.findIndex(m => m.id === movie.id))
        // Don't duplicate movies already in similar
        .filter(movie => !similarMovies.some(s => s.id === movie.id))

      console.log(`Total similar: ${similarMovies.length}, recommended: ${recommendedMovies.length}`)

      // PRIORITY 2: Genre-based discovery using genres from selected movies
      const selectedGenres = Array.from(new Set(
        body.selectedMovies.flatMap(m => m.genre_ids || [])
      ))

      let genreBasedMovies: TMDBMovie[] = []
      if (selectedGenres.length > 0) {
        try {
          console.log(`Discovering movies with genres: ${selectedGenres.join(', ')}`)
          const [genrePage1, genrePage2] = await Promise.all([
            discoverMoviesServer({ genres: selectedGenres, page: 1, sortBy: 'vote_count.desc' }),
            discoverMoviesServer({ genres: selectedGenres, page: 2, sortBy: 'vote_count.desc' })
          ])
          genreBasedMovies = [...(genrePage1.results || []), ...(genrePage2.results || [])]
          console.log(`Found ${genreBasedMovies.length} genre-matched movies`)
        } catch (error) {
          console.warn('Failed to get genre-based discoveries:', error)
        }
      }

      // Phase 6: User preference-based discovery pool
      let preferenceMovies: TMDBMovie[] = []
      if (userPreferences) {
        try {
          // Add preference-based genre discovery if user has favorite genres
          // that differ from the selected movies' genres
          if (userPreferences.favoriteGenres && userPreferences.favoriteGenres.length > 0) {
            const prefGenres = userPreferences.favoriteGenres.filter(g => !selectedGenres.includes(g))
            if (prefGenres.length > 0) {
              console.log(`Discovering movies from user preference genres: ${prefGenres.join(', ')}`)
              const prefDiscovery = await discoverMoviesServer({
                genres: prefGenres,
                page: 1,
                sortBy: 'vote_count.desc'
              })
              preferenceMovies.push(...(prefDiscovery.results || []))
            }
          }

          // Add language-based discovery if user prefers non-English
          if (userPreferences.preferredLanguages && userPreferences.preferredLanguages.length > 0) {
            const nonEnglish = userPreferences.preferredLanguages.filter(l => l !== 'en')
            if (nonEnglish.length > 0) {
              console.log(`Discovering movies in preferred languages: ${nonEnglish.join(', ')}`)
              const langPromises = nonEnglish.slice(0, 2).map(lang =>
                discoverMoviesServer({ originalLanguage: lang, page: 1, sortBy: 'vote_count.desc' })
              )
              const langResults = await Promise.all(langPromises)
              for (const result of langResults) {
                preferenceMovies.push(...(result.results || []))
              }
            }
          }

          if (preferenceMovies.length > 0) {
            console.log(`Found ${preferenceMovies.length} user preference-matched movies`)
          }
        } catch (error) {
          console.warn('Failed to get preference-based discoveries:', error)
        }
      }

      // PRIORITIZE: Similar > Recommended > Genre > Preference > Popular/Top-rated
      const taggedSimilarMovies = similarMovies.map(m => ({ ...m, _isSimilar: true }))
      const taggedRecommendedMovies = recommendedMovies.map(m => ({ ...m, _isRecommended: true }))
      const taggedGenreMovies = genreBasedMovies.map(m => ({ ...m, _isGenreMatch: true }))
      const taggedPreferenceMovies = preferenceMovies.map(m => ({ ...m, _isPreferenceMatch: true }))

      candidateMovies = [
        ...taggedSimilarMovies,         // Most relevant - TMDB content-based similar (25% boost)
        ...taggedRecommendedMovies,     // TMDB collaborative filtering (20% boost)
        ...taggedGenreMovies,           // Same genres (15% boost)
        ...taggedPreferenceMovies,      // User preference matches (10% boost)
        ...candidateMovies              // General popular/top-rated (no boost)
      ]

      // Final deduplication and limit to reasonable size for processing
      candidateMovies = candidateMovies
        .filter((movie, index, self) => index === self.findIndex(m => m.id === movie.id))
        .slice(0, 400) // Increased limit for larger candidate pool

      console.log(`Final candidate pool: ${candidateMovies.length} unique movies (${similarMovies.length} similar, ${recommendedMovies.length} recommended, ${genreBasedMovies.length} genre-matched, ${preferenceMovies.length} preference-matched)`)

    } catch (error) {
      console.error('Error fetching candidate movies:', error)
      return Response.json(
        { error: 'Failed to fetch movie data from TMDB' },
        { status: 500 }
      )
    }

    if (candidateMovies.length === 0) {
      return Response.json({
        recommendations: [],
        metadata: {
          totalCandidates: 0,
          selectedMoviesCount: body.selectedMovies.length,
          weights: body.weights,
          message: 'No candidate movies found'
        }
      })
    }

    // Merge exclusion IDs: selected movies + client-sent exclusions + server-side fallback
    const selectedIds = body.selectedMovies.map(m => m.id)
    const allExcludeIds = [...new Set([...selectedIds, ...serverExcludeIds])]

    // Generate ML recommendations
    const recommendationRequest: RecommendationRequest = {
      selectedMovies: body.selectedMovies,
      weights: body.weights,
      excludeIds: allExcludeIds,
      limit,
      minScore
    }

    console.log(`Generating recommendations from ${candidateMovies.length} candidates (excluding ${allExcludeIds.length} movies)...`)
    const recommendations = await generateRecommendations(
      recommendationRequest,
      candidateMovies,
      body.movieRatings
    )

    return Response.json({
      recommendations: recommendations.map(rec => ({
        movie: rec.movie,
        score: Math.round(rec.score * 1000) / 1000, // Round to 3 decimal places
        reasons: rec.reasons,
        tmdbImageUrl: rec.movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${rec.movie.poster_path}`
          : null
      })),
      metadata: {
        totalCandidates: candidateMovies.length,
        selectedMoviesCount: body.selectedMovies.length,
        weights: body.weights,
        processingTime: Date.now(), // Can be used to calculate actual processing time on client
        candidateSource,
        filters: {
          genres: body.genreFilter,
          year: body.yearFilter,
          rating: body.ratingFilter
        }
      }
    })

  } catch (error) {
    console.error('ML Recommendation API Error:', error)

    return Response.json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return API documentation
  return Response.json({
    name: 'ML Movie Recommendations API',
    description: 'Generate personalized movie recommendations using machine learning',
    method: 'POST',
    parameters: {
      selectedMovies: 'Array of TMDBMovie objects that user likes',
      weights: {
        genre: 'Weight for genre similarity (0-100)',
        rating: 'Weight for rating similarity (0-100)',
        director: 'Weight for director similarity (0-100)',
        cast: 'Weight for cast similarity (0-100)',
        cinematography: 'Weight for cinematography similarity (0-100)',
        keywords: 'Weight for theme/keyword similarity (0-100)',
        year: 'Weight for release year similarity (0-100)'
      },
      limit: 'Maximum number of recommendations (default: 20, max: 50)',
      minScore: 'Minimum similarity score (0-1, default: 0.1)',
      candidateSource: 'Source for candidate movies: popular|top_rated|discover|mixed',
      genreFilter: 'Array of genre IDs to filter by',
      yearFilter: 'Year to filter by',
      ratingFilter: 'Minimum rating to filter by',
      excludeMovieIds: 'Array of movie IDs to exclude (disliked/seen)',
      movieRatings: 'Map of movieId to user rating (1-10) for weighted profiles'
    },
    example: {
      selectedMovies: [
        {
          id: 550,
          title: 'Fight Club',
          overview: 'A ticking-time-bomb insomniac...',
          release_date: '1999-10-15',
          vote_average: 8.8,
          poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          genre_ids: [18]
        }
      ],
      weights: {
        genre: 75,
        rating: 60,
        director: 50,
        cast: 65,
        cinematography: 40,
        keywords: 55,
        year: 30
      },
      limit: 10,
      candidateSource: 'mixed'
    }
  })
}
