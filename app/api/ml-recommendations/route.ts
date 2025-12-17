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
  getSimilarMoviesServer
} from '@/lib/tmdb-server'

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

      // PRIORITY 1: Get similar movies for ALL selected movies (not just first 3)
      // Similar movies from TMDB are the most relevant candidates
      console.log(`Fetching similar movies for ${body.selectedMovies.length} selected movies...`)
      const similarMoviePromises = body.selectedMovies.map(async (movie) => {
        try {
          // Fetch 2 pages of similar movies for each selected movie
          const [page1, page2] = await Promise.all([
            getSimilarMoviesServer(movie.id, 1),
            getSimilarMoviesServer(movie.id, 2)
          ])
          const results = [...(page1.results || []), ...(page2.results || [])]
          console.log(`Found ${results.length} similar movies for "${movie.title}"`)
          return results
        } catch (error) {
          console.warn(`Failed to get similar movies for ${movie.id}:`, error)
          return []
        }
      })

      const similarMovieLists = await Promise.all(similarMoviePromises)
      const similarMovies = similarMovieLists.flat().filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id)
      )

      console.log(`Total similar movies found: ${similarMovies.length}`)

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

      // PRIORITIZE: Similar movies first, then genre matches, then popular/top-rated
      // This ensures Harry Potter → other Harry Potter movies and magic movies
      // Tag similar movies so the ML algorithm can boost their scores
      const similarMovieIds = new Set(similarMovies.map(m => m.id))
      const taggedSimilarMovies = similarMovies.map(m => ({ ...m, _isSimilar: true }))
      const taggedGenreMovies = genreBasedMovies.map(m => ({ ...m, _isGenreMatch: true }))

      candidateMovies = [
        ...taggedSimilarMovies,     // Most relevant - TMDB identified as similar
        ...taggedGenreMovies,       // Same genres
        ...candidateMovies          // General popular/top-rated
      ]

      // Final deduplication and limit to reasonable size for processing
      candidateMovies = candidateMovies
        .filter((movie, index, self) => index === self.findIndex(m => m.id === movie.id))
        .slice(0, 300) // Increased limit for better selection

      console.log(`Final candidate pool: ${candidateMovies.length} unique movies (${similarMovies.length} similar, ${genreBasedMovies.length} genre-matched)`)

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

    // Exclude selected movies from candidates
    const selectedIds = body.selectedMovies.map(m => m.id)

    // Generate ML recommendations
    const recommendationRequest: RecommendationRequest = {
      selectedMovies: body.selectedMovies,
      weights: body.weights,
      excludeIds: selectedIds,
      limit,
      minScore
    }

    console.log(`Generating recommendations from ${candidateMovies.length} candidates...`)
    const recommendations = await generateRecommendations(recommendationRequest, candidateMovies)

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
      ratingFilter: 'Minimum rating to filter by'
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