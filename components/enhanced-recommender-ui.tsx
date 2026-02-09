'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Search, X, RotateCcw, Grid3X3, Grid2X2, Star, Menu,
  Sparkles, Filter, Download, History,
  Heart, Users, Palette, Calendar, ChevronDown, ChevronUp,
  Film, Award, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Type definitions
type Movie = {
  id: number;
  title: string;
  year?: number;
  posterPath?: string;
  poster_path?: string;
  genres?: string[];
  genre_ids?: number[];
  genre_names?: string[];
  rating?: number;
  vote_average?: number;
  overview?: string;
  release_date?: string;
  popularity?: number;
  original_language?: string;
};

type RecommendationResult = {
  movie: Movie;
  score: number;
  reasons: string[];
  tmdbImageUrl?: string;
};

type Weights = {
  genre: number;
  rating: number;
  director: number;
  cast: number;
  cinematography: number;
  keywords: number;
  year: number;
};

const DEFAULT_WEIGHTS: Weights = {
  genre: 75,
  rating: 60,
  director: 50,
  cast: 65,
  cinematography: 40,
  keywords: 55,
  year: 30
};

// Enhanced MovieCard with more info - now with Link for prefetching
const EnhancedMovieCard: React.FC<{
  movie: Movie;
  recommendation?: RecommendationResult;
  loading?: boolean;
}> = ({ movie, recommendation, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-xl animate-pulse">
        <div className="aspect-[2/3] bg-gray-700" />
        <div className="p-4 space-y-3">
          <div className="h-5 bg-gray-700 rounded-lg w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-700 rounded-full w-16" />
            <div className="h-6 bg-gray-700 rounded-full w-16" />
          </div>
        </div>
      </div>
    );
  }

  const posterUrl = movie.posterPath || movie.poster_path
    ? `https://image.tmdb.org/t/p/w342${movie.posterPath || movie.poster_path}`
    : '/placeholder.jpg';

  const matchScore = recommendation ? Math.round(recommendation.score * 100) : null;

  return (
    <Link href={`/movies/${movie.id}`} prefetch={true}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer border border-gray-800 hover:border-yellow-500/50">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />

        {/* Match Score Badge */}
        {matchScore && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span className="text-black font-bold text-sm">{matchScore}%</span>
          </div>
        )}

        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-black/90 backdrop-blur-sm rounded-full">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
            <span className="text-white text-sm font-semibold">{movie.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 p-4 w-full">
            <p className="text-white text-sm line-clamp-3">{movie.overview}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-bold text-white text-base leading-tight line-clamp-2 group-hover:text-yellow-400 transition-colors">
          {movie.title}
        </h3>

        {movie.year && (
          <p className="text-gray-400 text-sm flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {movie.year}
          </p>
        )}

        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {movie.genres.slice(0, 2).map((genre, index) => (
              <span
                key={index}
                className="text-xs text-gray-300 bg-gray-700/50 px-2.5 py-1 rounded-full border border-gray-600/50"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Recommendation Reasons */}
        {recommendation && recommendation.reasons.length > 0 && (
          <div className="pt-2 border-t border-gray-700 space-y-1">
            {recommendation.reasons.slice(0, 2).map((reason, i) => (
              <p key={i} className="text-xs text-yellow-400/90 flex items-start gap-1">
                <span className="text-yellow-500 mt-0.5">✓</span>
                <span>{reason}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      </div>
    </Link>
  );
};

// Enhanced Weight Slider with visual feedback
const EnhancedWeightSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  helpText?: string;
}> = ({ label, value, onChange, icon, helpText }) => {
  const getIntensityColor = (val: number) => {
    if (val >= 80) return 'from-yellow-500 to-orange-500';
    if (val >= 60) return 'from-blue-500 to-cyan-500';
    if (val >= 40) return 'from-green-500 to-emerald-500';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          <div className="text-yellow-400">{icon}</div>
          {label}
        </label>
        <span className={`text-sm font-bold bg-gradient-to-r ${getIntensityColor(value)} bg-clip-text text-transparent`}>
          {value}%
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer enhanced-slider"
          style={{
            background: `linear-gradient(to right, rgb(234, 179, 8) 0%, rgb(234, 179, 8) ${value}%, rgb(55, 65, 81) ${value}%, rgb(55, 65, 81) 100%)`
          }}
        />
      </div>
      {helpText && (
        <p className="text-xs text-gray-500 italic">{helpText}</p>
      )}
    </div>
  );
};

// Main Enhanced Recommender UI
const EnhancedRecommenderUI: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [gridDensity, setGridDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [excludeMovieIds, setExcludeMovieIds] = useState<number[]>([]);
  const [movieRatings, setMovieRatings] = useState<Record<number, number>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Search TMDB
  const searchMovies = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/tmdb?path=/3/search/movie&query=${encodeURIComponent(query)}&page=1`);
      if (response.ok) {
        const data = await response.json();
        const movies: Movie[] = (data.results || []).slice(0, 8).map((tmdbMovie: any) => ({
          id: tmdbMovie.id,
          title: tmdbMovie.title,
          year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : undefined,
          posterPath: tmdbMovie.poster_path,
          poster_path: tmdbMovie.poster_path,
          genres: [],
          genre_ids: tmdbMovie.genre_ids || [],
          rating: tmdbMovie.vote_average,
          vote_average: tmdbMovie.vote_average,
          overview: tmdbMovie.overview,
          release_date: tmdbMovie.release_date,
          popularity: tmdbMovie.popularity,
          original_language: tmdbMovie.original_language
        }));

        const selectedIds = new Set(selectedMovies.map(m => m.id));
        setSearchResults(movies.filter(movie => !selectedIds.has(movie.id)));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [selectedMovies]);

  useEffect(() => {
    const timeoutId = setTimeout(() => searchMovies(searchTerm), 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMovies]);

  const handleLoadFromHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const response = await fetch('/api/user-movie-profile');
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to load your movie history');
          return;
        }
        throw new Error('Failed to load history');
      }

      const data = await response.json();

      // Map TMDB movie objects to component's Movie type
      const historyMovies: Movie[] = [
        ...(data.likes || []),
        ...(data.watchlist || [])
      ]
        .filter((movie: any, index: number, self: any[]) =>
          index === self.findIndex(m => m.id === movie.id)
        )
        .map((tmdbMovie: any) => ({
          id: tmdbMovie.id,
          title: tmdbMovie.title,
          year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : undefined,
          posterPath: tmdbMovie.poster_path,
          poster_path: tmdbMovie.poster_path,
          genres: [],
          genre_ids: tmdbMovie.genre_ids || [],
          rating: tmdbMovie.vote_average,
          vote_average: tmdbMovie.vote_average,
          overview: tmdbMovie.overview,
          release_date: tmdbMovie.release_date,
          popularity: tmdbMovie.popularity,
          original_language: tmdbMovie.original_language
        }));

      if (historyMovies.length === 0) {
        setError('No liked or watchlisted movies found. Like some movies first!');
        return;
      }

      setSelectedMovies(historyMovies);

      // Store exclusion IDs (disliked + seen)
      const excludeIds = [
        ...(data.dislikes || []),
        ...(data.seen || [])
      ];
      setExcludeMovieIds(excludeIds);

      // Store ratings for weighted profiles
      if (data.ratings && data.ratings.length > 0) {
        const ratingsMap: Record<number, number> = {};
        for (const r of data.ratings) {
          ratingsMap[r.movieId] = r.rating;
        }
        setMovieRatings(ratingsMap);
      }

    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load your movie history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const handleAddMovie = useCallback((movie: Movie) => {
    setSelectedMovies(prev => {
      if (prev.find(m => m.id === movie.id)) return prev;
      return [...prev, movie];
    });
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  const handleRemoveMovie = useCallback((id: number) => {
    setSelectedMovies(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleWeightsChange = useCallback((partial: Partial<Weights>) => {
    setWeights(prev => ({ ...prev, ...partial }));
  }, []);

  const handleGetRecommendations = useCallback(async () => {
    if (selectedMovies.length === 0) {
      setError('Please select at least one movie');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMessage('Analyzing your movie preferences...');

    try {
      const tmdbMovies = selectedMovies.map(movie => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview || '',
        release_date: movie.release_date || `${movie.year || 2000}-01-01`,
        vote_average: movie.vote_average || movie.rating || 0,
        poster_path: movie.poster_path || movie.posterPath || null,
        backdrop_path: null,
        genre_ids: movie.genre_ids || [],
        popularity: movie.popularity || 50,
        original_language: movie.original_language || 'en'
      }));

      // Show progress messages
      setTimeout(() => setLoadingMessage('Finding similar movies from TMDB...'), 1000);
      setTimeout(() => setLoadingMessage('Extracting movie features (cast, genres, themes)...'), 3000);
      setTimeout(() => setLoadingMessage('Calculating similarity scores...'), 5000);
      setTimeout(() => setLoadingMessage('Applying your custom preferences...'), 7000);
      setTimeout(() => setLoadingMessage('Selecting diverse recommendations...'), 9000);

      const requestBody: any = {
        selectedMovies: tmdbMovies,
        weights: weights,
        limit: 24,
        minScore: 0.08, // Lowered threshold for more diverse recommendations
        candidateSource: 'mixed'
      };

      // Phase 3a: Pass exclusion IDs (disliked + seen movies)
      if (excludeMovieIds.length > 0) {
        requestBody.excludeMovieIds = excludeMovieIds;
      }

      // Phase 2c: Pass user ratings for weighted profiles
      if (Object.keys(movieRatings).length > 0) {
        requestBody.movieRatings = movieRatings;
      }

      const response = await fetch('/api/ml-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      setLoadingMessage('Almost done...');
      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setMetadata(data.metadata);
      setLoadingMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to get recommendations');
      setRecommendations([]);
      setLoadingMessage('');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMovies, weights, excludeMovieIds, movieRatings]);

  const handleReset = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS);
    setSelectedMovies([]);
    setRecommendations([]);
    setError(null);
    setMetadata(null);
    setExcludeMovieIds([]);
    setMovieRatings({});
  }, []);

  const sortedRecommendations = useMemo(() => {
    if (recommendations.length === 0) return [];
    const sorted = [...recommendations];

    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => (b.movie.vote_average || 0) - (a.movie.vote_average || 0));
      case 'year':
        return sorted.sort((a, b) => {
          const yearA = a.movie.year || new Date(a.movie.release_date || '2000').getFullYear();
          const yearB = b.movie.year || new Date(b.movie.release_date || '2000').getFullYear();
          return yearB - yearA;
        });
      case 'relevance':
      default:
        return sorted.sort((a, b) => b.score - a.score);
    }
  }, [recommendations, sortBy]);

  const gridCols = gridDensity === 'comfortable'
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  const rightPaneContent = (
    <div className="space-y-6">
      {/* Load from History */}
      {session?.user && (
        <button
          onClick={handleLoadFromHistory}
          disabled={isLoadingHistory}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {isLoadingHistory ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading your movies...
            </>
          ) : (
            <>
              <History className="w-4 h-4" />
              Load from My History
            </>
          )}
        </button>
      )}

      {/* Movie Search */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-yellow-400" />
          Add Favorite Movies
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search movies..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-h-64 overflow-y-auto">
            {searchResults.map((movie) => (
              <button
                key={movie.id}
                onClick={() => handleAddMovie(movie)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors"
              >
                <img
                  src={movie.posterPath ? `https://image.tmdb.org/t/p/w92${movie.posterPath}` : '/placeholder.jpg'}
                  alt={movie.title}
                  className="w-12 h-18 object-cover rounded"
                />
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium line-clamp-1">{movie.title}</p>
                  <p className="text-gray-400 text-xs">{movie.year} • ⭐ {movie.rating?.toFixed(1)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedMovies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMovies.map(movie => (
              <div
                key={movie.id}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-600/30 rounded-full px-3 py-1.5"
              >
                <span className="text-white text-sm truncate max-w-[120px]">{movie.title}</span>
                <button
                  onClick={() => handleRemoveMovie(movie.id)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
      >
        <span className="text-white font-medium flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Advanced Settings
        </span>
        {showAdvancedSettings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Weight Sliders */}
      {showAdvancedSettings && (
        <div className="space-y-4 p-4 bg-gray-800/50 rounded-xl">
          <EnhancedWeightSlider
            label="Genre Match"
            icon={<Film className="w-3.5 h-3.5" />}
            value={weights.genre}
            onChange={(value) => handleWeightsChange({ genre: value })}
            helpText="How important is genre similarity?"
          />
          <EnhancedWeightSlider
            label="Rating Quality"
            icon={<Star className="w-3.5 h-3.5" />}
            value={weights.rating}
            onChange={(value) => handleWeightsChange({ rating: value })}
            helpText="Prefer highly-rated films"
          />
          <EnhancedWeightSlider
            label="Director Style"
            icon={<Award className="w-3.5 h-3.5" />}
            value={weights.director}
            onChange={(value) => handleWeightsChange({ director: value })}
            helpText="Match filmmaking style"
          />
          <EnhancedWeightSlider
            label="Cast Similarity"
            icon={<Users className="w-3.5 h-3.5" />}
            value={weights.cast}
            onChange={(value) => handleWeightsChange({ cast: value })}
            helpText="Same actors/actresses"
          />
          <EnhancedWeightSlider
            label="Visual Style"
            icon={<Palette className="w-3.5 h-3.5" />}
            value={weights.cinematography}
            onChange={(value) => handleWeightsChange({ cinematography: value })}
            helpText="Cinematography aesthetics"
          />
          <EnhancedWeightSlider
            label="Themes/Keywords"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            value={weights.keywords}
            onChange={(value) => handleWeightsChange({ keywords: value })}
            helpText="Similar story themes"
          />
          <EnhancedWeightSlider
            label="Release Era"
            icon={<Clock className="w-3.5 h-3.5" />}
            value={weights.year}
            onChange={(value) => handleWeightsChange({ year: value })}
            helpText="Time period preference"
          />

          <button
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleGetRecommendations}
          disabled={isLoading || selectedMovies.length === 0}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-black disabled:text-gray-500 font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              {loadingMessage || 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Get AI Recommendations
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-gray-800 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                <img
                  src="/logo.png"
                  alt="Screen On Fire"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold hidden sm:inline">ScreenOnFire</span>
              </div>
              <span className="text-gray-500">|</span>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="hidden sm:inline">AI Movie Recommendations</span>
                <span className="sm:hidden">AI Picks</span>
              </h1>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="relevance">Best Match</option>
                  <option value="rating">Highest Rated</option>
                  <option value="year">Latest First</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setGridDensity('comfortable')}
                  className={`p-2 rounded transition-colors ${gridDensity === 'comfortable' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridDensity('compact')}
                  className={`p-2 rounded transition-colors ${gridDensity === 'compact' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex max-w-screen-2xl mx-auto">
        <div className="flex-1 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {selectedMovies.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
              <div className="text-8xl mb-6 animate-bounce">🎬</div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Discover Your Perfect Movies
              </h2>
              <p className="text-gray-400 max-w-lg mb-6 text-lg">
                Select your favorite films and our AI will find perfectly matched recommendations tailored just for you
              </p>
              <div className="flex gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>AI-Powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Personalized</span>
                </div>
              </div>
            </div>
          ) : recommendations.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <div className="text-7xl mb-6">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-3">Ready to Discover?</h3>
              <p className="text-gray-400 max-w-md mb-6">
                You've selected {selectedMovies.length} movie{selectedMovies.length > 1 ? 's' : ''}.
                Click the button to get AI-powered recommendations!
              </p>
              <button
                onClick={handleGetRecommendations}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Get My Recommendations
              </button>
            </div>
          ) : (
            <>
              {metadata && (
                <div className="mb-6 p-5 bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border border-yellow-500/30 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-400 font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        {sortedRecommendations.length} AI Recommendations Generated
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Analyzed {metadata.totalCandidates} movies • Based on {selectedMovies.length} favorites
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && loadingMessage && (
                <div className="mb-6 p-5 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl">
                  <p className="text-blue-400 font-medium text-center flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    {loadingMessage}
                  </p>
                </div>
              )}

              <div className={`grid gap-6 ${gridCols}`}>
                {isLoading
                  ? Array(12).fill(0).map((_, i) => (
                      <EnhancedMovieCard key={i} movie={{} as Movie} loading={true} />
                    ))
                  : sortedRecommendations.map((rec) => (
                      <EnhancedMovieCard
                        key={rec.movie.id}
                        movie={rec.movie}
                        recommendation={rec}
                      />
                    ))
                }
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-gray-900/50 backdrop-blur-xl border-l border-gray-800 p-6 overflow-y-auto max-h-screen sticky top-16">
          {rightPaneContent}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden p-4">
        {selectedMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-bold text-white mb-2">Start Discovering</h3>
            <p className="text-gray-400 text-sm mb-4">
              Tap the menu to add your favorite movies
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 ${gridCols}`}>
            {isLoading
              ? Array(8).fill(0).map((_, i) => (
                  <EnhancedMovieCard key={i} movie={{} as Movie} loading={true} />
                ))
              : sortedRecommendations.map((rec) => (
                  <EnhancedMovieCard
                    key={rec.movie.id}
                    movie={rec.movie}
                    recommendation={rec}
                  />
                ))
            }
          </div>
        )}

        {/* Floating Menu Button */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black p-4 rounded-full shadow-2xl transition-all z-50 flex items-center gap-2"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Panel */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setIsMobileFilterOpen(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Preferences</h2>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {rightPaneContent}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .enhanced-slider::-webkit-slider-thumb {
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);
        }

        .enhanced-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </div>
  );
};

export default EnhancedRecommenderUI;
