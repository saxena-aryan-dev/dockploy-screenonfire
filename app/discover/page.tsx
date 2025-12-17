"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, Film, Star, Filter, Play, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import MovieGrid from "@/components/movie-grid"
import { OptimizedImage } from "@/components/optimized-image"
import { ultraFastImageLoader } from "@/lib/ultra-fast-image"
import { PopularMoviesCarousel } from "@/components/popular-movies-carousel"
import {
  getGenres,
  searchMovies,
  getPopularMovies,
  getTopRatedMovies,
  discoverMovies,
  getIndianMovies,
  getBollywoodMovies,
  getHindiMovies,
  getImageUrl,
  type TMDBMovie,
  type TMDBGenre,
} from "@/lib/tmdb-supabase"
import { getYear } from "@/lib/date"

export default function MovieRecommender() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [minRating, setMinRating] = useState("0")
  const [sortBy, setSortBy] = useState("popularity.desc")
  const [movies, setMovies] = useState<TMDBMovie[]>([])
  const [genres, setGenres] = useState<TMDBGenre[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<"popular" | "top-rated" | "search" | "discover" | "indian" | "bollywood" | "hindi">("popular")
  const [hasMore, setHasMore] = useState(true)
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<"all" | "indian" | "bollywood" | "hindi">("all")
  const [featuredMovie, setFeaturedMovie] = useState<TMDBMovie | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()
  const [watchedMovies, setWatchedMovies] = useState<Set<string>>(new Set())

  // Load genres on mount
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const genreData = await getGenres()
        setGenres(genreData)
      } catch (error) {
        console.error("Error loading genres:", error)
      }
    }
    loadGenres()
  }, [])

  // Reload content when mediaType changes (including initial load)
  useEffect(() => {
    console.log(`[MediaType Change] Loading ${mediaType} content...`)

    // Reset to popular tab when switching between movies and series
    setMovies([])
    setFeaturedMovie(null)

    // Load popular content for the selected media type
    const loadContent = async () => {
      setIsLoading(true)
      try {
        const data = await getPopularMovies(1, mediaType)
        console.log(`[MediaType Change] Loaded ${data.results.length} ${mediaType} results`)
        setMovies(data.results)
        setTotalPages(data.total_pages)
        setCurrentPage(1)
        setHasMore(1 < data.total_pages)
        setActiveTab("popular")
        if (data.results.length > 0) setFeaturedMovie(data.results[0])
      } catch (error) {
        console.error(`Error loading popular ${mediaType}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    loadContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType])

  useEffect(() => {
    if (movies.length > 0 && !featuredMovie) {
      setFeaturedMovie(movies[0])
    }
  }, [movies, featuredMovie])

  // Ultra-aggressive preloading for INSTANT navigation
  useEffect(() => {
    if (!featuredMovie || movies.length === 0) return

    const currentIndex = movies.findIndex((m) => m.id === featuredMovie.id)
    if (currentIndex === -1) return

    // INSTANT LOADING STRATEGY:
    // 1. Preload EVERYTHING immediately for instant switching
    const allUrls: string[] = []

    movies.forEach(movie => {
      // Multiple sizes for different use cases
      if (movie.poster_path) {
        allUrls.push(
          getImageUrl(movie.poster_path, "w185"), // Thumbnail
          getImageUrl(movie.poster_path, "w342"), // Main size
          getImageUrl(movie.poster_path, "w500")  // High quality
        )
      }
      if (movie.backdrop_path) {
        allUrls.push(
          getImageUrl(movie.backdrop_path, "w780"),  // Main background
          getImageUrl(movie.backdrop_path, "w1280") // High quality background
        )
      }
    })

    // Remove duplicates and filter out null values
    const uniqueUrls = [...new Set(allUrls)].filter(Boolean) as string[]

    // IMMEDIATE preload for next/prev (highest priority)
    const immediateUrls: string[] = []
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + movies.length) % movies.length
      const movie = movies[index]
      if (movie?.poster_path) {
        immediateUrls.push(getImageUrl(movie.poster_path, "w342"))
      }
      if (movie?.backdrop_path) {
        immediateUrls.push(getImageUrl(movie.backdrop_path, "w780"))
      }
    }

    // Load immediate images first
    ultraFastImageLoader.preloadImages(immediateUrls)

    // Then load everything else in chunks for instant switching
    const remainingUrls = uniqueUrls.filter(url => !immediateUrls.includes(url))
    
    // Process in small batches to avoid blocking
    let batchIndex = 0
    const batchSize = 8
    const loadNextBatch = () => {
      const batch = remainingUrls.slice(batchIndex, batchIndex + batchSize)
      if (batch.length > 0) {
        ultraFastImageLoader.preloadImages(batch)
        batchIndex += batchSize
        
        // Continue loading next batch after a tiny delay
        setTimeout(loadNextBatch, 10)
      }
    }
    
    // Start batch loading after immediate images
    setTimeout(loadNextBatch, 50)

  }, [featuredMovie, movies])

  // Memoized movie functions to prevent recreation on every render
  const loadPopularMovies = useCallback(async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const data = await getPopularMovies(page, mediaType)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("popular")
      if (page === 1 && !append) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error(`Error loading popular ${mediaType}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [mediaType])

  const loadTopRatedMovies = useCallback(async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const data = await getTopRatedMovies(page, mediaType)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("top-rated")
      if (page === 1 && !append) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error(`Error loading top rated ${mediaType}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [mediaType])

  const loadIndianMovies = async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const data = await getIndianMovies(page)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("indian")
      if (page === 1 && !append) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error("Error loading Indian movies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBollywoodMovies = async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const data = await getBollywoodMovies(page)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("bollywood")
      if (page === 1 && !append) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error("Error loading Bollywood movies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadHindiMovies = async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const data = await getHindiMovies(page)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("hindi")
      if (page === 1 && !append) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error("Error loading Hindi movies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(async (page = 1, append = false) => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const data = await searchMovies(searchQuery, page, mediaType)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("search")
      if (page === 1 && !append && data.results.length > 0) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error(`Error searching ${mediaType}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, mediaType])

  const handleDiscover = useCallback(async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const params: any = {
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        minRating: Number.parseFloat(minRating) || undefined,
        sortBy,
        page,
      }

      if (selectedCountryFilter === "indian") {
        params.country = "IN"
      } else if (selectedCountryFilter === "bollywood") {
        params.country = "IN"
        params.originalLanguage = "hi"
      } else if (selectedCountryFilter === "hindi") {
        params.originalLanguage = "hi"
      }

      const data = await discoverMovies(params)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("discover")
      if (page === 1 && !append && data.results.length > 0) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error("Error discovering movies:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedGenres, minRating, sortBy, selectedCountryFilter])

  const handleGenreChange = (genreId: number, checked: boolean) => {
    if (checked) {
      setSelectedGenres([...selectedGenres, genreId])
    } else {
      setSelectedGenres(selectedGenres.filter((id) => id !== genreId))
    }
  }

  const getMovieGenres = (movie: TMDBMovie) => {
    // Use genre_names if available (from database), otherwise fallback to genre_ids
    if (movie.genre_names && movie.genre_names.length > 0) {
      return movie.genre_names
    }
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      return movie.genre_ids.map((id) => genres.find((g) => g.id === id)?.name).filter(Boolean)
    }
    return []
  }

  // Map of tab to loader function for cleaner code
  const tabLoaders = useMemo(() => ({
    "popular": loadPopularMovies,
    "top-rated": loadTopRatedMovies,
    "search": handleSearch,
    "discover": handleDiscover,
    "indian": loadIndianMovies,
    "bollywood": loadBollywoodMovies,
    "hindi": loadHindiMovies,
  }), [loadPopularMovies, loadTopRatedMovies, handleSearch, handleDiscover])

  const handlePageChange = (page: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    tabLoaders[activeTab]?.(page)
  }

  const loadMoreMovies = () => {
    tabLoaders[activeTab]?.(currentPage + 1, true)
  }

  const handleMarkAsWatched = useCallback((movieId: string) => {
    setWatchedMovies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(movieId)) {
        newSet.delete(movieId)
      } else {
        newSet.add(movieId)
      }
      return newSet
    })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => router.push('/')}>
                <OptimizedImage
                  src="/logo.png"
                  alt="Screen On Fire"
                  width={40}
                  height={40}
                  className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  priority={true}
                />
                <span className="text-lg md:text-xl font-bold hidden sm:inline">ScreenOnFire</span>
              </div>

              {/* Movies/Series Toggle */}
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
                <button
                  onClick={() => {
                    console.log('[Button Click] Switching to Movies')
                    setMediaType("movie")
                  }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded transition-all duration-200 ${
                    mediaType === "movie"
                      ? "bg-yellow-500 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Film className="h-4 w-4 inline mr-1" />
                  <span className="hidden md:inline">Movies</span>
                </button>
                <button
                  onClick={() => {
                    console.log('[Button Click] Switching to TV shows')
                    setMediaType("tv")
                  }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded transition-all duration-200 ${
                    mediaType === "tv"
                      ? "bg-yellow-500 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Play className="h-4 w-4 inline mr-1" />
                  <span className="hidden md:inline">Series</span>
                </button>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => loadPopularMovies()} className="text-gray-300 hover:text-white">
                Popular
              </Button>
              <Button variant="ghost" size="sm" onClick={() => loadTopRatedMovies()} className="text-gray-300 hover:text-white">
                Top Rated
              </Button>
              <Button variant="ghost" size="sm" onClick={() => loadIndianMovies()} className="text-gray-300 hover:text-white">
                🇮🇳 Indian
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")} className="text-gray-300 hover:text-white">
                🤖 AI
              </Button>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Search - Hidden on mobile, shown in filters */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={`Search ${mediaType === 'tv' ? 'TV shows' : 'movies'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 w-48 lg:w-80 bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={`Search ${mediaType === 'tv' ? 'TV shows' : 'movies'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 w-full bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
            />
          </div>

          {/* Mobile Quick Nav */}
          <div className="lg:hidden mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Button variant="ghost" size="sm" onClick={() => loadPopularMovies()} className="text-gray-300 hover:text-white whitespace-nowrap">
              Popular
            </Button>
            <Button variant="ghost" size="sm" onClick={() => loadTopRatedMovies()} className="text-gray-300 hover:text-white whitespace-nowrap">
              Top Rated
            </Button>
            <Button variant="ghost" size="sm" onClick={() => loadIndianMovies()} className="text-gray-300 hover:text-white whitespace-nowrap">
              🇮🇳 Indian
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")} className="text-gray-300 hover:text-white whitespace-nowrap">
              🤖 AI
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - IMDb Inspired */}
      {featuredMovie && (
        <section className="relative h-[60vh] sm:h-[70vh] lg:h-[85vh] overflow-hidden border-b border-gray-800">
          {/* Background Image with Parallax Effect */}
          <div
            className="absolute inset-0 bg-cover bg-center transform scale-105 transition-transform duration-700"
            style={{
              backgroundImage: `url(${getImageUrl(featuredMovie.backdrop_path, "original")})`,
            }}
          >
            {/* Enhanced Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-black/60 md:via-black/90 md:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex items-center">
            <div className="w-full">
              <div className="relative">
                {/* Enhanced Navigation Arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const currentIndex = movies.findIndex((m) => m.id === featuredMovie?.id) || 0
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : movies.length - 1
                    setFeaturedMovie(movies[prevIndex])
                  }}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-yellow-500 text-white hover:text-black h-12 w-12 md:h-14 md:w-14 rounded-full backdrop-blur-sm transition-all duration-300 border border-white/20 hover:border-yellow-500 hover:scale-110 shadow-xl"
                >
                  <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const currentIndex = movies.findIndex((m) => m.id === featuredMovie?.id) || 0
                    const nextIndex = currentIndex < movies.length - 1 ? currentIndex + 1 : 0
                    setFeaturedMovie(movies[nextIndex])
                  }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-yellow-500 text-white hover:text-black h-12 w-12 md:h-14 md:w-14 rounded-full backdrop-blur-sm transition-all duration-300 border border-white/20 hover:border-yellow-500 hover:scale-110 shadow-xl"
                >
                  <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                </Button>

                <div className="mx-12 md:mx-16">
                  <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
                    {/* Enhanced Content Section */}
                    <div className="order-2 lg:order-1 space-y-4 sm:space-y-5 lg:space-y-7 animate-in fade-in slide-in-from-left duration-700">
                      {/* Title with Gradient */}
                      <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight">
                          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent drop-shadow-2xl">
                            {featuredMovie.title}
                          </span>
                        </h1>
                      </div>

                      {/* Rating & Meta Info */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 bg-black/40 border border-gray-700 backdrop-blur-sm rounded-lg px-3 py-1.5">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-base font-semibold text-white">{featuredMovie.vote_average.toFixed(1)}</span>
                          <span className="text-gray-400 text-xs">/10</span>
                        </div>
                        <div className="h-5 w-px bg-gray-700" />
                        <span className="text-base font-medium text-gray-300">{getYear(featuredMovie.release_date)}</span>
                        <div className="h-5 w-px bg-gray-700" />
                        <Badge className="bg-gray-800 border border-gray-700 text-gray-300 font-medium text-xs px-2.5 py-1">
                          #{(movies.findIndex((m) => m.id === featuredMovie?.id) || 0) + 1} Trending
                        </Badge>
                      </div>

                      {/* Genre Tags */}
                      <div className="flex flex-wrap gap-2">
                        {getMovieGenres(featuredMovie)
                          .slice(0, 3)
                          .map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="border-gray-700 bg-black/40 backdrop-blur-sm text-gray-300 text-xs px-2.5 py-1 cursor-default"
                            >
                              {genre}
                            </Badge>
                          ))}
                      </div>

                      {/* Overview - Better Typography */}
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-3 lg:line-clamp-4 max-w-3xl font-light">
                        {featuredMovie.overview}
                      </p>

                      {/* Enhanced Action Buttons - IMDb Style */}
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                        <Button
                          size="lg"
                          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 group"
                          onClick={() => {
                            window.open(
                              `https://www.youtube.com/results?search_query=${encodeURIComponent(featuredMovie.title + " trailer")}`,
                              "_blank",
                            )
                          }}
                        >
                          <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                          Watch Trailer
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          className="border border-white/20 text-white hover:bg-white/10 hover:border-white/40 font-semibold transition-all duration-300"
                          onClick={() => router.push(`/movies/${featuredMovie.id}`)}
                        >
                          More Info
                        </Button>
                      </div>
                    </div>

                    {/* Enhanced Poster - IMDb Style */}
                    <div className="order-1 lg:order-2 hidden sm:flex justify-center lg:justify-end animate-in fade-in slide-in-from-right duration-700">
                      <div className="relative group cursor-pointer" onClick={() => router.push(`/movies/${featuredMovie.id}`)}>
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-all duration-500" />

                        {/* Poster Container */}
                        <div className="relative w-40 sm:w-48 md:w-56 lg:w-72 xl:w-80 aspect-[2/3] rounded-xl overflow-hidden shadow-xl transform transition-all duration-300 group-hover:scale-102 border border-gray-800 group-hover:border-gray-700">
                          <OptimizedImage
                            src={getImageUrl(featuredMovie.poster_path, "w500") || "/placeholder.svg"}
                            alt={featuredMovie.title}
                            className="w-full h-full object-cover"
                            priority={true}
                            width={400}
                            height={600}
                            blur={false}
                          />
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              <p className="text-white text-sm font-semibold">Click for details</p>
                            </div>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="absolute -top-2 -right-2 bg-black/90 backdrop-blur-sm text-white rounded-lg p-2 flex flex-col items-center justify-center font-semibold shadow-xl border border-gray-700">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mb-0.5" />
                          <span className="text-sm">{featuredMovie.vote_average.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Section - Enhanced Layout */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Section Header - IMDb Style */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-800">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                {activeTab === "popular" && `Popular ${mediaType === 'tv' ? 'TV Shows' : 'Movies'}`}
                {activeTab === "top-rated" && `Top Rated ${mediaType === 'tv' ? 'TV Shows' : 'Movies'}`}
                {activeTab === "search" && `Search Results for "${searchQuery}"`}
                {activeTab === "discover" && `Discover ${mediaType === 'tv' ? 'TV Shows' : 'Movies'}`}
                {activeTab === "indian" && "🇮🇳 Indianise"}
                {activeTab === "bollywood" && "🎬 Bollywood Movies"}
                {activeTab === "hindi" && "🗣️ Hindi Movies"}
              </span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              {movies.length > 0
                ? `Showing ${movies.length} ${mediaType === 'tv' ? (movies.length === 1 ? 'TV show' : 'TV shows') : (movies.length === 1 ? 'movie' : 'movies')}`
                : `Loading ${mediaType === 'tv' ? 'TV shows' : 'movies'}...`}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`border-2 font-semibold transition-all duration-300 hover:scale-105 ${
              showFilters
                ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                : "border-gray-600 text-white bg-gray-900 hover:border-yellow-500"
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Enhanced Filters Panel */}
        {showFilters && (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-2 border-gray-800 mb-10 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-gray-800 p-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Filter className="h-5 w-5 text-yellow-500" />
                Advanced Filters
              </h3>
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="text-sm font-bold mb-4 block text-white uppercase tracking-wider">Genres</label>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-500/20 scrollbar-track-gray-800 pr-2">
                    {genres.slice(0, 8).map((genre) => (
                      <div key={genre.id} className="flex items-center space-x-2 group">
                        <Checkbox
                          id={`genre-${genre.id}`}
                          checked={selectedGenres.includes(genre.id)}
                          onCheckedChange={(checked) => handleGenreChange(genre.id, checked as boolean)}
                          className="border-gray-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        />
                        <label
                          htmlFor={`genre-${genre.id}`}
                          className="text-sm text-gray-300 cursor-pointer group-hover:text-yellow-500 transition-colors font-medium"
                        >
                          {genre.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold mb-3 block text-white uppercase tracking-wider">Min Rating</label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white hover:border-yellow-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="0" className="hover:bg-yellow-500/20">Any</SelectItem>
                      <SelectItem value="6" className="hover:bg-yellow-500/20">⭐ 6.0+</SelectItem>
                      <SelectItem value="7" className="hover:bg-yellow-500/20">⭐ 7.0+</SelectItem>
                      <SelectItem value="8" className="hover:bg-yellow-500/20">⭐ 8.0+</SelectItem>
                      <SelectItem value="9" className="hover:bg-yellow-500/20">⭐ 9.0+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-bold mb-3 block text-white uppercase tracking-wider">Region</label>
                  <Select value={selectedCountryFilter} onValueChange={(value: "all" | "indian" | "bollywood" | "hindi") => setSelectedCountryFilter(value)}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white hover:border-yellow-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="hover:bg-yellow-500/20">🌍 All Regions</SelectItem>
                      <SelectItem value="indian" className="hover:bg-yellow-500/20">🇮🇳 Indian</SelectItem>
                      <SelectItem value="bollywood" className="hover:bg-yellow-500/20">🎬 Bollywood</SelectItem>
                      <SelectItem value="hindi" className="hover:bg-yellow-500/20">🗣️ Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-bold mb-3 block text-white uppercase tracking-wider">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white hover:border-yellow-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="popularity.desc" className="hover:bg-yellow-500/20">🔥 Most Popular</SelectItem>
                      <SelectItem value="vote_average.desc" className="hover:bg-yellow-500/20">⭐ Top Rated</SelectItem>
                      <SelectItem value="release_date.desc" className="hover:bg-yellow-500/20">🆕 Newest First</SelectItem>
                      <SelectItem value="release_date.asc" className="hover:bg-yellow-500/20">📅 Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <Button
                    onClick={() => handleDiscover()}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 font-bold shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Loading...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Apply Filters
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movies Grid */}
        <MovieGrid
          movies={movies}
          isLoading={isLoading}
          onLoadMovies={loadPopularMovies}
        />

        {/* Enhanced Load More Button */}
        {movies.length > 0 && hasMore && (
          <div className="flex flex-col items-center gap-6 mt-12">
            <Button
              onClick={loadMoreMovies}
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 px-12 py-7 text-lg font-bold shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-110 group"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <span className="animate-spin text-2xl">⏳</span>
                  <span>Loading More {mediaType === 'tv' ? 'TV Shows' : 'Movies'}...</span>
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  <span>Load More {mediaType === 'tv' ? 'TV Shows' : 'Movies'}</span>
                  <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Showing <span className="text-yellow-500 font-bold">{movies.length}</span> of{" "}
                <span className="text-white font-bold">{totalPages * 20}</span> {mediaType === 'tv' ? 'TV shows' : 'movies'}
              </p>
              <p className="text-gray-500 text-xs mt-1">Page {currentPage} of {totalPages}</p>
            </div>
          </div>
        )}

        {/* Enhanced Movie Count */}
        {movies.length > 0 && !hasMore && (
          <div className="text-center mt-12 p-6 bg-gray-900/50 rounded-xl border border-gray-800">
            <p className="text-gray-300 text-lg">
              You've reached the end! Showing all <span className="text-yellow-500 font-bold">{movies.length}</span> {mediaType === 'tv' ? 'TV shows' : 'movies'}
            </p>
          </div>
        )}

        {/* Traditional Pagination - Still available for manual page jumping */}
        {movies.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 pt-6 border-t border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <span className="text-gray-400 text-sm">
              Jump to page {currentPage}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
