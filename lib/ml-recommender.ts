/**
 * ML-based Movie Recommendation System
 * Uses content-based filtering with weighted feature matching
 */

import { TMDBMovie, TMDBMovieDetails } from './tmdb-supabase'
import { getMovieDetailsServer } from './tmdb-server'

export interface MovieFeatures {
  id: number
  title: string
  genres: number[]
  genreNames: string[]
  rating: number
  year: number
  popularity: number
  runtime: number
  director: string[]
  cast: string[]
  keywords: string[]
  language: string
  featureVector: number[]
}

export interface RecommendationWeights {
  genre: number
  rating: number
  director: number
  cast: number
  cinematography: number
  keywords: number
  year: number
}

export interface RecommendationResult {
  movie: TMDBMovie
  score: number
  reasons: string[]
}

export interface RecommendationRequest {
  selectedMovies: TMDBMovie[]
  weights: RecommendationWeights
  excludeIds: number[]
  limit: number
  minScore?: number
}

// Simple in-memory cache for movie details to reduce API calls
const movieDetailsCache = new Map<number, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

async function getCachedMovieDetails(movieId: number): Promise<any> {
  const cached = movieDetailsCache.get(movieId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const details = await getMovieDetailsServer(movieId)
    movieDetailsCache.set(movieId, { data: details, timestamp: Date.now() })
    return details
  } catch (error) {
    console.warn(`Failed to fetch details for movie ${movieId}:`, error)
    return null
  }
}

/**
 * Extract comprehensive features from a movie
 * @param movie - The movie to extract features from
 * @param fetchDetails - Whether to fetch detailed info (cast/crew). Set to false for candidates to reduce API calls.
 */
export async function extractMovieFeatures(movie: TMDBMovie, fetchDetails: boolean = true): Promise<MovieFeatures> {
  const year = new Date(movie.release_date || '2000-01-01').getFullYear()
  let keywords = generateKeywords(movie.title, movie.overview)

  // Start with basic features from the movie object
  let genres = movie.genre_ids || []
  let genreNames: string[] = []
  let cast: string[] = []
  let director: string[] = []
  let runtime = 120

  // Only fetch detailed info if requested (for selected movies, not all candidates)
  if (fetchDetails) {
    try {
      const details = await getCachedMovieDetails(movie.id)

      if (details) {
        // Extract genres
        if (details.genres?.length > 0) {
          genres = details.genres.map((g: { id: number; name: string }) => g.id)
          genreNames = details.genres.map((g: { id: number; name: string }) => g.name)
        }

        // Extract cast and crew
        if (details.credits?.cast?.length > 0) {
          cast = details.credits.cast.slice(0, 10).map((c: { name: string }) => c.name.toLowerCase())
        }
        if (details.credits?.crew?.length > 0) {
          director = details.credits.crew
            .filter((c: { job: string }) => c.job === 'Director')
            .map((c: { name: string }) => c.name.toLowerCase())
        }

        // Extract TMDB curated keywords and merge with text-parsed keywords
        if (details.keywords?.keywords?.length > 0) {
          const tmdbKeywords = details.keywords.keywords
            .map((k: { id: number; name: string }) => k.name.toLowerCase())
          keywords = [...new Set([...tmdbKeywords, ...keywords])].slice(0, 30)
        }

        runtime = details.runtime || 120
      }
    } catch (error) {
      console.warn(`Failed to extract detailed features for movie ${movie.id}:`, error)
    }
  }

  // Create feature vector
  const featureVector = createFeatureVector({
    genres,
    rating: movie.vote_average,
    year,
    popularity: movie.popularity || 0,
    runtime,
    director,
    cast,
    keywords,
    language: movie.original_language || 'en'
  })

  return {
    id: movie.id,
    title: movie.title,
    genres,
    genreNames,
    rating: movie.vote_average,
    year,
    popularity: movie.popularity || 0,
    runtime,
    director,
    cast,
    keywords,
    language: movie.original_language || 'en',
    featureVector
  }
}

/**
 * Generate keywords from title and overview
 */
function generateKeywords(title: string, overview: string): string[] {
  const text = `${title} ${overview}`.toLowerCase()
  
  // Remove common words and punctuation
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ])
  
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 20) // Limit to top 20 keywords
}

/**
 * Create a numerical feature vector from movie attributes
 */
function createFeatureVector(features: {
  genres: number[]
  rating: number
  year: number
  popularity: number
  runtime: number
  director: string[]
  cast: string[]
  keywords: string[]
  language: string
}): number[] {
  const vector: number[] = []
  
  // Genre features (one-hot encoding for common genres)
  const commonGenres = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37]
  commonGenres.forEach(genreId => {
    vector.push(features.genres.includes(genreId) ? 1 : 0)
  })
  
  // Normalized rating (0-1)
  vector.push(features.rating / 10)
  
  // Normalized year (relative to 1900-2030)
  vector.push((features.year - 1900) / 130)
  
  // Normalized popularity (log scale)
  vector.push(Math.log(features.popularity + 1) / 10)
  
  // Normalized runtime (0-1, assuming max 300 minutes)
  vector.push(Math.min(features.runtime / 300, 1))
  
  // Language features (common languages)
  const commonLanguages = ['en', 'hi', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh']
  commonLanguages.forEach(lang => {
    vector.push(features.language === lang ? 1 : 0)
  })
  
  return vector
}

/**
 * Calculate cosine similarity between two feature vectors
 */
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i]
    normA += vectorA[i] * vectorA[i]
    normB += vectorB[i] * vectorB[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Detect if two movies are part of the same franchise by analyzing title similarity
 * Returns a bonus score (0-0.5) if franchise is detected
 */
function detectFranchise(titleA: string, titleB: string): number {
  // Remove common words and split into significant words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'of', 'in', 'to', 'for', 'part', 'chapter'])

  const getSignificantWords = (title: string): string[] => {
    return title
      .toLowerCase()
      .replace(/[:\-\u2013\u2014]/g, ' ') // Replace colons and dashes with spaces
      .replace(/[^\w\s]/g, '') // Remove other punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  }

  const wordsA = getSignificantWords(titleA)
  const wordsB = getSignificantWords(titleB)

  // Check for consecutive word matches (e.g., "harry potter")
  for (let i = 0; i < wordsA.length - 1; i++) {
    const bigram = `${wordsA[i]} ${wordsA[i + 1]}`
    for (let j = 0; j < wordsB.length - 1; j++) {
      const bigramB = `${wordsB[j]} ${wordsB[j + 1]}`
      if (bigram === bigramB) {
        // Strong franchise indicator (e.g., "harry potter", "lord rings")
        return 0.5
      }
    }
  }

  // Check for single significant word matches (e.g., "avengers", "godfather")
  const commonWords = wordsA.filter(word => wordsB.includes(word) && word.length > 4)
  if (commonWords.length >= 2) {
    // Multiple unique words match
    return 0.4
  } else if (commonWords.length === 1) {
    // Single unique word (might be franchise)
    return 0.3
  }

  return 0
}

/**
 * Calculate weighted similarity between two movies
 * Only counts features where both movies have data (avoids penalizing missing data)
 */
function calculateWeightedSimilarity(
  movieA: MovieFeatures,
  movieB: MovieFeatures,
  weights: RecommendationWeights
): { similarity: number; reasons: string[] } {
  const reasons: string[] = []
  let totalScore = 0
  let totalWeight = 0

  // Franchise/Series detection - check if titles share significant words
  // This catches series like "Harry Potter and the...", "Lord of the Rings: The..."
  const franchiseBonus = detectFranchise(movieA.title, movieB.title)
  if (franchiseBonus > 0) {
    totalScore += franchiseBonus
    totalWeight += 0.5 // Add weight for franchise matching
    reasons.unshift('Part of same franchise/series')
  }

  // Genre similarity (most reliable feature - always available from genre_ids)
  if (weights.genre > 0 && movieA.genres.length > 0 && movieB.genres.length > 0) {
    const genreSimilarity = calculateGenreSimilarity(movieA.genres, movieB.genres)
    totalScore += genreSimilarity * (weights.genre / 100)
    totalWeight += weights.genre / 100

    if (genreSimilarity > 0.3) {
      const commonGenres = movieA.genreNames.filter(genre =>
        movieB.genreNames.some(g => g.toLowerCase() === genre.toLowerCase())
      )
      if (commonGenres.length > 0) {
        reasons.push(`Similar genres: ${commonGenres.slice(0, 3).join(', ')}`)
      } else {
        reasons.push(`Genre match: ${Math.round(genreSimilarity * 100)}%`)
      }
    }
  }

  // Rating similarity
  if (weights.rating > 0 && movieA.rating > 0 && movieB.rating > 0) {
    const ratingDiff = Math.abs(movieA.rating - movieB.rating)
    const ratingSimilarity = Math.max(0, 1 - ratingDiff / 5) // Tighter range for better discrimination
    totalScore += ratingSimilarity * (weights.rating / 100)
    totalWeight += weights.rating / 100

    if (ratingSimilarity > 0.6 && movieB.rating >= 7) {
      reasons.push(`Highly rated (${movieB.rating.toFixed(1)}/10)`)
    }
  }

  // Director similarity - only count if BOTH have director data
  if (weights.director > 0 && movieA.director.length > 0 && movieB.director.length > 0) {
    const directorSimilarity = calculateArraySimilarity(movieA.director, movieB.director)
    totalScore += directorSimilarity * (weights.director / 100)
    totalWeight += weights.director / 100

    if (directorSimilarity > 0) {
      const commonDirectors = movieA.director.filter(d =>
        movieB.director.some(bd => bd.toLowerCase() === d.toLowerCase())
      )
      if (commonDirectors.length > 0) {
        reasons.push(`Same director: ${commonDirectors[0]}`)
      }
    }
  }

  // Cast similarity - only count if BOTH have cast data
  if (weights.cast > 0 && movieA.cast.length > 0 && movieB.cast.length > 0) {
    const castSimilarity = calculateArraySimilarity(movieA.cast, movieB.cast)
    totalScore += castSimilarity * (weights.cast / 100)
    totalWeight += weights.cast / 100

    if (castSimilarity > 0) {
      const commonCast = movieA.cast.filter(c =>
        movieB.cast.some(bc => bc.toLowerCase() === c.toLowerCase())
      )
      if (commonCast.length > 0) {
        reasons.push(`Features ${commonCast.slice(0, 2).map(n => n.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')).join(', ')}`)
      }
    }
  }

  // Keywords/themes similarity
  if (weights.keywords > 0 && movieA.keywords.length > 0 && movieB.keywords.length > 0) {
    const keywordSimilarity = calculateArraySimilarity(movieA.keywords, movieB.keywords)
    totalScore += keywordSimilarity * (weights.keywords / 100)
    totalWeight += weights.keywords / 100

    if (keywordSimilarity > 0.2) {
      reasons.push(`Similar themes and style`)
    }
  }

  // Year/era similarity
  if (weights.year > 0 && movieA.year > 1900 && movieB.year > 1900) {
    const yearDiff = Math.abs(movieA.year - movieB.year)
    const yearSimilarity = Math.max(0, 1 - yearDiff / 30) // 30-year range for better discrimination
    totalScore += yearSimilarity * (weights.year / 100)
    totalWeight += weights.year / 100

    if (yearSimilarity > 0.7) {
      reasons.push(`From similar era (${movieB.year})`)
    }
  }

  // Visual/cinematography similarity (using feature vector - always available)
  if (weights.cinematography > 0) {
    const cinematographySimilarity = cosineSimilarity(movieA.featureVector, movieB.featureVector)
    totalScore += cinematographySimilarity * (weights.cinematography / 100)
    totalWeight += weights.cinematography / 100

    if (cinematographySimilarity > 0.7) {
      reasons.push(`Similar visual style`)
    }
  }

  // Calculate final similarity
  // If no features could be compared, return a small base score based on popularity
  if (totalWeight === 0) {
    return { similarity: 0.1, reasons: ['Based on popularity'] }
  }

  const finalSimilarity = totalScore / totalWeight

  return { similarity: finalSimilarity, reasons }
}

/**
 * Calculate similarity between two genre arrays
 */
function calculateGenreSimilarity(genresA: number[], genresB: number[]): number {
  if (genresA.length === 0 || genresB.length === 0) return 0
  
  const setA = new Set(genresA)
  const setB = new Set(genresB)
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  
  return intersection.size / union.size // Jaccard similarity
}

/**
 * Calculate similarity between two string arrays
 */
function calculateArraySimilarity(arrayA: string[], arrayB: string[]): number {
  if (arrayA.length === 0 || arrayB.length === 0) return 0
  
  const setA = new Set(arrayA.map(s => s.toLowerCase()))
  const setB = new Set(arrayB.map(s => s.toLowerCase()))
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  
  return intersection.size / Math.max(setA.size, setB.size)
}

/**
 * Generate movie profile from user's selected movies
 * @param movieRatings - Optional map of movieId to user rating (1-10) for weighted aggregation
 */
export function generateUserProfile(
  selectedMovieFeatures: MovieFeatures[],
  movieRatings?: Record<number, number>
): MovieFeatures {
  if (selectedMovieFeatures.length === 0) {
    throw new Error('No selected movies to generate profile from')
  }

  // Calculate rating-based weights for each movie
  const getWeight = (movieId: number): number => {
    if (!movieRatings || !(movieId in movieRatings)) return 1.0
    const rating = movieRatings[movieId]
    if (rating >= 8) return 1.5  // Highly rated: 1.5x influence
    if (rating >= 6) return 1.0  // Average: normal influence
    return 0.5                    // Low rated: 0.5x influence
  }

  // Aggregate genres with rating weights
  const genreCounts: Record<number, number> = {}
  for (const m of selectedMovieFeatures) {
    const w = getWeight(m.id)
    for (const genre of m.genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + w
    }
  }

  const topGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => parseInt(genre))

  // Calculate weighted averages
  const totalWeight = selectedMovieFeatures.reduce((sum, m) => sum + getWeight(m.id), 0)
  const avgRating = selectedMovieFeatures.reduce((sum, m) => sum + m.rating * getWeight(m.id), 0) / totalWeight
  const avgYear = selectedMovieFeatures.reduce((sum, m) => sum + m.year * getWeight(m.id), 0) / totalWeight
  const avgPopularity = selectedMovieFeatures.reduce((sum, m) => sum + m.popularity * getWeight(m.id), 0) / totalWeight
  const avgRuntime = selectedMovieFeatures.reduce((sum, m) => sum + m.runtime * getWeight(m.id), 0) / totalWeight

  // Aggregate keywords, directors, cast (with rating weights via repetition)
  const allKeywords: string[] = []
  const allDirectors: string[] = []
  const allCast: string[] = []
  for (const m of selectedMovieFeatures) {
    const w = getWeight(m.id)
    const reps = Math.max(1, Math.round(w)) // 0.5→1, 1.0→1, 1.5→2
    for (let i = 0; i < reps; i++) {
      allKeywords.push(...m.keywords)
      allDirectors.push(...m.director)
      allCast.push(...m.cast)
    }
  }
  
  const topKeywords = getMostCommon(allKeywords, 10)
  const topDirectors = getMostCommon(allDirectors, 5)
  const topCast = getMostCommon(allCast, 10)
  
  // Most common language
  const languages = selectedMovieFeatures.map(m => m.language)
  const topLanguage = getMostCommon(languages, 1)[0] || 'en'
  
  return {
    id: -1, // Profile ID
    title: 'User Profile',
    genres: topGenres,
    genreNames: [],
    rating: avgRating,
    year: Math.round(avgYear),
    popularity: avgPopularity,
    runtime: Math.round(avgRuntime),
    director: topDirectors,
    cast: topCast,
    keywords: topKeywords,
    language: topLanguage,
    featureVector: createFeatureVector({
      genres: topGenres,
      rating: avgRating,
      year: Math.round(avgYear),
      popularity: avgPopularity,
      runtime: Math.round(avgRuntime),
      director: topDirectors,
      cast: topCast,
      keywords: topKeywords,
      language: topLanguage
    })
  }
}

/**
 * Get most common items from array
 */
function getMostCommon<T>(arr: T[], limit: number): T[] {
  const counts = arr.reduce((acc, item) => {
    acc[item as string] = (acc[item as string] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([item]) => item as T)
}

/**
 * Apply diversity-aware selection to balance relevance and variety
 * Ensures we don't show 20 Harry Potter movies and nothing else
 */
function applyDiversitySelection(
  recommendations: RecommendationResult[],
  limit: number
): RecommendationResult[] {
  if (recommendations.length <= limit) {
    return recommendations.sort((a, b) => b.score - a.score)
  }

  const selected: RecommendationResult[] = []
  const remaining = [...recommendations].sort((a, b) => b.score - a.score)

  // Greedy selection with diversity penalty
  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0
    let bestScore = -1

    for (let i = 0; i < Math.min(remaining.length, 10); i++) {
      const candidate = remaining[i]

      // Calculate diversity penalty based on similarity to already selected movies
      let diversityPenalty = 0
      for (const selectedMovie of selected) {
        // Franchise similarity penalty (prevent too many from same series)
        const franchiseSimilarity = detectFranchise(candidate.movie.title, selectedMovie.movie.title)
        diversityPenalty += franchiseSimilarity * 0.3

        // Genre overlap penalty
        const candidateGenres = new Set(candidate.movie.genre_ids || [])
        const selectedGenres = new Set(selectedMovie.movie.genre_ids || [])
        const genreOverlap = [...candidateGenres].filter(g => selectedGenres.has(g)).length
        const genreOverlapRatio = genreOverlap / Math.max(candidateGenres.size, 1)
        diversityPenalty += genreOverlapRatio * 0.1
      }

      // Adjusted score = base score - diversity penalty
      // After 5 selections, reduce diversity penalty to allow more similar movies
      const diversityWeight = selected.length < 5 ? 1.0 : 0.5
      const adjustedScore = candidate.score - (diversityPenalty * diversityWeight)

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore
        bestIndex = i
      }
    }

    // Add best candidate and remove from remaining
    selected.push(remaining[bestIndex])
    remaining.splice(bestIndex, 1)
  }

  return selected
}

/**
 * Main recommendation function
 * Uses a two-phase approach:
 * 1. Quick scoring with basic features for all candidates
 * 2. Detailed scoring with full API data for top candidates
 */
export async function generateRecommendations(
  request: RecommendationRequest,
  candidateMovies: TMDBMovie[],
  movieRatings?: Record<number, number>
): Promise<RecommendationResult[]> {
  try {
    console.log(`Starting recommendation generation for ${request.selectedMovies.length} selected movies and ${candidateMovies.length} candidates`)

    // Phase 1: Extract FULL features for selected movies (these are few, so API calls are acceptable)
    const selectedFeatures: MovieFeatures[] = []

    for (const movie of request.selectedMovies) {
      try {
        const features = await extractMovieFeatures(movie, true) // fetchDetails = true
        selectedFeatures.push(features)
        console.log(`Extracted features for "${movie.title}": ${features.genres.length} genres, ${features.cast.length} cast, ${features.director.length} directors`)
      } catch (error) {
        console.warn(`Failed to extract features for selected movie ${movie.id} (${movie.title}):`, error)
      }
    }

    if (selectedFeatures.length === 0) {
      console.error('Failed to extract features for any selected movies')
      return []
    }

    // Generate user profile from selected movies (with optional rating weights)
    const userProfile = generateUserProfile(selectedFeatures, movieRatings)
    console.log(`User profile: genres=${userProfile.genres.slice(0, 5).join(',')}, cast=${userProfile.cast.slice(0, 3).join(',')}, directors=${userProfile.director.join(',')}`)

    // Filter out excluded movies
    const filteredCandidates = candidateMovies.filter(
      movie => !request.excludeIds.includes(movie.id)
    )

    console.log(`Processing ${filteredCandidates.length} candidate movies (after exclusions)`)

    // Detect if user preferences require detailed features (cast, director)
    const detailWeightSum = request.weights.cast + request.weights.director
    const totalWeightSum = Object.values(request.weights).reduce((sum, w) => sum + w, 0)
    const detailWeightRatio = detailWeightSum / totalWeightSum

    // If user heavily weights cast/director, we need to process more candidates with full details
    // Otherwise, quick scoring will filter out good matches prematurely
    const needsDetailedScoring = detailWeightRatio > 0.25 // More than 25% weight on detail features

    if (needsDetailedScoring) {
      console.log(`High weight on cast/director (${Math.round(detailWeightRatio * 100)}%) - using detailed scoring for more candidates`)
    }

    // Phase 2: Quick scoring with basic features (no API calls)
    const quickScores: { movie: TMDBMovie; score: number }[] = []

    // Create adjusted weights for quick scoring that emphasize available features
    const quickScoringWeights = { ...request.weights }
    if (needsDetailedScoring) {
      // Temporarily boost genre/rating/year weights for quick filtering
      // since cast/director data isn't available yet
      const availableWeightSum = quickScoringWeights.genre + quickScoringWeights.rating +
                                  quickScoringWeights.year + quickScoringWeights.keywords +
                                  quickScoringWeights.cinematography
      const boostFactor = totalWeightSum / Math.max(availableWeightSum, 1)

      quickScoringWeights.genre = Math.min(100, quickScoringWeights.genre * boostFactor)
      quickScoringWeights.rating = Math.min(100, quickScoringWeights.rating * boostFactor)
      quickScoringWeights.year = Math.min(100, quickScoringWeights.year * boostFactor)
    }

    for (const candidate of filteredCandidates) {
      // Extract basic features without API call
      const candidateFeatures = await extractMovieFeatures(candidate, false) // fetchDetails = false

      // Calculate quick similarity score with adjusted weights
      const { similarity } = calculateWeightedSimilarity(
        userProfile,
        candidateFeatures,
        quickScoringWeights
      )

      quickScores.push({ movie: candidate, score: similarity })
    }

    // Dynamically adjust how many candidates to process in detail
    // If user weights cast/director heavily, process more candidates
    let topCandidatesCount = Math.min(50, request.limit * 3)
    if (needsDetailedScoring) {
      topCandidatesCount = Math.min(100, request.limit * 5) // Process more candidates
    }

    const topCandidates = quickScores
      .sort((a, b) => b.score - a.score)
      .slice(0, topCandidatesCount)

    console.log(`Phase 2: Detailed scoring for top ${topCandidates.length} candidates (detail-heavy: ${needsDetailedScoring})`)

    // Phase 3: Detailed scoring with full API data for top candidates
    const recommendations: RecommendationResult[] = []
    const batchSize = needsDetailedScoring ? 10 : 8 // Larger batches for faster processing

    // Adjust minimum score threshold when detail features are heavily weighted
    // Since Phase 2 couldn't properly score these, we should be more lenient
    let effectiveMinScore = request.minScore || 0.1
    if (needsDetailedScoring) {
      effectiveMinScore = Math.max(0.05, (request.minScore || 0.1) - 0.05)
      console.log(`Lowered minScore threshold to ${effectiveMinScore} for detail-heavy weights`)
    }

    for (let i = 0; i < topCandidates.length; i += batchSize) {
      const batch = topCandidates.slice(i, i + batchSize)

      // Add small delay between batches to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      const batchPromises = batch.map(async ({ movie: candidate }) => {
        try {
          // Fetch detailed features for this candidate
          const candidateFeatures = await extractMovieFeatures(candidate, true) // fetchDetails = true

          // Calculate detailed similarity to user profile using ACTUAL user weights
          const { similarity, reasons } = calculateWeightedSimilarity(
            userProfile,
            candidateFeatures,
            request.weights // Use original weights, not quick scoring weights
          )

          let finalScore = similarity
          const finalReasons = [...reasons]

          // BOOST: If TMDB identified this as similar to a selected movie, boost score
          if ((candidate as any)._isSimilar) {
            finalScore = Math.min(1.0, similarity * 1.25) // 25% boost for TMDB-similar movies
            finalReasons.unshift('Identified by TMDB as highly similar')
            console.log(`Boosted "${candidate.title}" from ${similarity.toFixed(3)} to ${finalScore.toFixed(3)} (TMDB similar)`)
          }
          // BOOST: TMDB collaborative filtering recommendations
          else if ((candidate as any)._isRecommended) {
            finalScore = Math.min(1.0, similarity * 1.20) // 20% boost for TMDB recommendations
            finalReasons.unshift('Recommended by TMDB collaborative filtering')
            console.log(`Boosted "${candidate.title}" from ${similarity.toFixed(3)} to ${finalScore.toFixed(3)} (TMDB recommended)`)
          }
          // BOOST: Genre-matched movies get smaller boost
          else if ((candidate as any)._isGenreMatch) {
            finalScore = Math.min(1.0, similarity * 1.15) // 15% boost for genre matches
            if (finalScore > similarity) {
              finalReasons.unshift('Strong genre match')
            }
          }
          // BOOST: User preference-matched movies
          else if ((candidate as any)._isPreferenceMatch) {
            finalScore = Math.min(1.0, similarity * 1.10) // 10% boost for preference matches
            if (finalScore > similarity) {
              finalReasons.unshift('Matches your genre preferences')
            }
          }

          // Apply minimum score filter
          if (finalScore >= effectiveMinScore) {
            return {
              movie: candidate,
              score: finalScore,
              reasons: finalReasons
            }
          }
          return null
        } catch (error) {
          console.warn(`Failed to process candidate movie ${candidate.id} (${candidate.title}):`, error)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      const validResults = batchResults.filter((result): result is RecommendationResult => result !== null)
      recommendations.push(...validResults)

      // Log progress for long-running operations
      if (needsDetailedScoring && i % 20 === 0) {
        console.log(`Processed ${i + batch.length}/${topCandidates.length} candidates, found ${recommendations.length} recommendations so far`)
      }
    }

    console.log(`Total recommendations found: ${recommendations.length}`)

    // Apply diversity-aware selection to prevent showing only franchise movies
    // Balance between relevance (high scores) and diversity (different franchises/genres)
    const diverseRecommendations = applyDiversitySelection(recommendations, request.limit)

    // Log top recommendations for debugging
    console.log(`\n=== TOP ${Math.min(5, diverseRecommendations.length)} RECOMMENDATIONS ===`)
    diverseRecommendations.slice(0, 5).forEach((rec, i) => {
      console.log(`${i + 1}. "${rec.movie.title}" (${rec.score.toFixed(3)}) - ${rec.reasons.slice(0, 2).join(', ')}`)
    })
    console.log(`\nReturning ${diverseRecommendations.length} diverse recommendations`)
    return diverseRecommendations

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return []
  }
}