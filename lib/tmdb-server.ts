/**
 * Server-side TMDB API utilities
 * For use in API routes and server components
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org';
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN ||
  process.env.TMDB_ACCESS_TOKEN ||
  "";

async function retryFetch(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // For 429 or 5xx, wait with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Fetch from TMDB API directly (server-side only)
 */
export async function fetchFromTMDBServer(path: string, params?: Record<string, string | number>): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
    }
    
    const queryString = searchParams.toString();
    const url = `${TMDB_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
    
    const response = await retryFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
        'Accept': 'application/json',
        'User-Agent': 'ScreenOnFire/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch from TMDB: ${path}`, error);
    throw error;
  }
}

/**
 * Get movie details with credits (server-side)
 */
export async function getMovieDetailsServer(movieId: number): Promise<any> {
  try {
    return await fetchFromTMDBServer(`/3/movie/${movieId}`, {
      append_to_response: 'credits,keywords'
    });
  } catch (error) {
    console.warn(`Failed to fetch movie details for ${movieId}:`, error);
    // Return minimal fallback data
    return {
      id: movieId,
      title: 'Unknown Movie',
      overview: 'Movie details unavailable',
      release_date: '2000-01-01',
      vote_average: 0,
      poster_path: null,
      backdrop_path: null,
      runtime: 120,
      genres: [],
      credits: {
        cast: [],
        crew: []
      }
    };
  }
}

/**
 * Get similar movies (server-side)
 */
export async function getSimilarMoviesServer(movieId: number, page: number = 1): Promise<any> {
  try {
    return await fetchFromTMDBServer(`/3/movie/${movieId}/similar`, { page: page.toString() });
  } catch (error) {
    console.warn(`Failed to fetch similar movies for ${movieId}:`, error);
    return { results: [] };
  }
}

/**
 * Get popular movies (server-side)
 */
export async function getPopularMoviesServer(page: number = 1): Promise<any> {
  try {
    return await fetchFromTMDBServer('/3/movie/popular', { page: page.toString() });
  } catch (error) {
    console.warn('Failed to fetch popular movies:', error);
    return { results: [] };
  }
}

/**
 * Get top rated movies (server-side)
 */
export async function getTopRatedMoviesServer(page: number = 1): Promise<any> {
  try {
    return await fetchFromTMDBServer('/3/movie/top_rated', { page: page.toString() });
  } catch (error) {
    console.warn('Failed to fetch top rated movies:', error);
    return { results: [] };
  }
}

/**
 * Discover movies with filters (server-side)
 */
export async function discoverMoviesServer(params: {
  genres?: number[]
  minRating?: number
  year?: number
  sortBy?: string
  page?: number
  country?: string
  originalLanguage?: string
}): Promise<any> {
  try {
    const queryParams: Record<string, string> = {
      page: (params.page || 1).toString(),
      sort_by: params.sortBy || 'popularity.desc'
    };
    
    if (params.genres && params.genres.length > 0) {
      queryParams.with_genres = params.genres.join(',');
    }
    if (params.minRating) {
      queryParams['vote_average.gte'] = params.minRating.toString();
    }
    if (params.year) {
      queryParams.primary_release_year = params.year.toString();
    }
    if (params.country) {
      queryParams.with_origin_country = params.country;
    }
    if (params.originalLanguage) {
      queryParams.with_original_language = params.originalLanguage;
    }
    
    return await fetchFromTMDBServer('/3/discover/movie', queryParams);
  } catch (error) {
    console.warn('Failed to discover movies:', error);
    return { results: [] };
  }
}

/**
 * Get TMDB recommendations for a movie (collaborative filtering - "users who liked X also liked Y")
 */
export async function getMovieRecommendationsServer(movieId: number, page: number = 1): Promise<any> {
  try {
    return await fetchFromTMDBServer(`/3/movie/${movieId}/recommendations`, { page: page.toString() });
  } catch (error) {
    console.warn(`Failed to fetch TMDB recommendations for ${movieId}:`, error);
    return { results: [] };
  }
}