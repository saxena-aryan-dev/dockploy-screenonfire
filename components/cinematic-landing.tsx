"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Play, Sparkles, Heart, LogOut, Search, Star,
  Filter, ChevronLeft, ChevronRight
} from "lucide-react"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { OptimizedImage } from "@/components/optimized-image"
import MovieGrid from "@/components/movie-grid"
import { PopularMoviesCarousel } from "@/components/popular-movies-carousel"
import { useScrollY } from "@/hooks/useScrollAnimation"
import { useSession } from "@/components/providers/auth-provider"
import { UserMenu } from "@/components/user-menu"
import { AuthButtons } from "@/components/auth-buttons"
import { AuthModal } from "@/components/auth/auth-modal"
import { useMovieActions } from "@/hooks/useMovieActions"
import {
  getGenres,
  searchMovies,
  getPopularMovies,
  getTopRatedMovies,
  discoverMovies,
  getIndianMovies,
  getPopularSeries,
  getTopRatedSeries,
  getIndianSeries,
  getImageUrl,
  type TMDBMovie,
  type TMDBGenre,
} from "@/lib/tmdb-supabase"
import { getYear } from "@/lib/date"

export default function CinematicLanding() {
  const [movies, setMovies] = useState<TMDBMovie[]>([])
  const [genres, setGenres] = useState<TMDBGenre[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [minRating, setMinRating] = useState("0")
  const [sortBy, setSortBy] = useState("popularity.desc")
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<"popular" | "top-rated" | "search" | "discover" | "indian" | "trending">("popular")
  const [showFilters, setShowFilters] = useState(false)
  const [watchedMovies, setWatchedMovies] = useState<Set<string>>(new Set())
  const [featuredMovie, setFeaturedMovie] = useState<TMDBMovie | null>(null)
  const [contentType, setContentType] = useState<"movies" | "series">("movies")
  const [sortType, setSortType] = useState<"popular" | "trending" | "top-rated" | "indian">("popular")
  const [showAuthModal, setShowAuthModal] = useState(false)

  const router = useRouter()
  const scrollY = useScrollY()

  // Auth session
  const { data: session } = useSession()

  // Movie actions hook for like/dislike/watchlist
  const {
    isInWatchlist,
    isLiked,
    isDisliked,
    addToWatchlist,
    removeFromWatchlist,
    likeMovie,
    dislikeMovie
  } = useMovieActions({
    onAuthRequired: () => {
      setShowAuthModal(true)
    }
  })

  // Scroll-based animation values - use stable default for SSR
  const [heroHeight, setHeroHeight] = useState(1000)

  useEffect(() => {
    // Set actual window height on client only
    setHeroHeight(window.innerHeight)
  }, [])

  // Hero opacity: fade out as user scrolls
  const heroOpacity = Math.max(0, 1 - scrollY / heroHeight)

  // Hero scale: slight zoom out effect
  const heroScale = 1 + (scrollY / heroHeight) * 0.1

  // Hero blur: progressively blur as user scrolls
  const heroBlur = Math.min(10, (scrollY / heroHeight) * 10)

  // Discover section opacity: fade in as hero fades out
  const discoverOpacity = Math.min(1, scrollY / (heroHeight * 0.5))

  // Background color transition
  const bgColorProgress = Math.min(1, scrollY / heroHeight)
  const backgroundColor = `rgb(${bgColorProgress * 17}, ${bgColorProgress * 24}, ${bgColorProgress * 39})`


  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const genreData = await getGenres()
        setGenres(genreData)
        await loadPopularMovies()
      } catch (error) {
        console.error("Error loading initial data:", error)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (movies.length > 0 && !featuredMovie) {
      setFeaturedMovie(movies[0])
    }
  }, [movies, featuredMovie])

  // Auto-slide featured movie every 5 seconds
  useEffect(() => {
    if (movies.length <= 1) return

    const interval = setInterval(() => {
      const currentIndex = movies.findIndex((m) => m.id === featuredMovie?.id) || 0
      const nextIndex = (currentIndex + 1) % movies.length
      setFeaturedMovie(movies[nextIndex])
    }, 5000) // Change every 5 seconds

    return () => clearInterval(interval)
  }, [movies, featuredMovie])


  // Unified content loading function
  const loadContent = useCallback(async (
    type: "movies" | "series",
    sort: "popular" | "trending" | "top-rated" | "indian",
    page = 1,
    append = false
  ) => {
    setIsLoading(true)
    try {
      let data

      // Load content based on type and sort
      if (sort === "indian") {
        // Indian content for movies or series
        if (type === "movies") {
          data = await getIndianMovies(page)
        } else {
          const seriesData = await getIndianSeries(page)
          data = {
            ...seriesData,
            results: seriesData.results.map((s: any) => ({
              ...s,
              title: s.name,
              release_date: s.first_air_date,
              media_type: 'tv'
            }))
          }
        }
      } else if (type === "movies") {
        if (sort === "popular") data = await getPopularMovies(page)
        else if (sort === "trending") data = await getPopularMovies(page)
        else data = await getTopRatedMovies(page)
      } else if (type === "series") {
        if (sort === "popular") {
          const seriesData = await getPopularSeries(page)
          data = {
            ...seriesData,
            results: seriesData.results.map((s: any) => ({
              ...s,
              title: s.name,
              release_date: s.first_air_date,
              media_type: 'tv'
            }))
          }
        } else if (sort === "trending") {
          const seriesData = await getPopularSeries(page)
          data = {
            ...seriesData,
            results: seriesData.results.map((s: any) => ({
              ...s,
              title: s.name,
              release_date: s.first_air_date,
              media_type: 'tv'
            }))
          }
        } else {
          const seriesData = await getTopRatedSeries(page)
          data = {
            ...seriesData,
            results: seriesData.results.map((s: any) => ({
              ...s,
              title: s.name,
              release_date: s.first_air_date,
              media_type: 'tv'
            }))
          }
        }
      }

      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setContentType(type)
      setSortType(sort)
      setActiveTab(sort)
      if (page === 1 && !append && data.results.length > 0) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error(`Error loading ${type} (${sort}):`, error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadPopularMovies = useCallback(async (page = 1, append = false) => {
    await loadContent("movies", "popular", page, append)
  }, [loadContent])

  const loadTopRatedMovies = useCallback(async (page = 1, append = false) => {
    await loadContent(contentType, "top-rated", page, append)
  }, [loadContent, contentType])

  const loadIndianMovies = useCallback(async (page = 1, append = false) => {
    await loadContent(contentType, "indian", page, append)
  }, [loadContent, contentType])

  const handleSearch = useCallback(async (page = 1, append = false) => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const data = await searchMovies(searchQuery, page)
      setMovies(prev => append ? [...prev, ...data.results] : data.results)
      setTotalPages(data.total_pages)
      setCurrentPage(page)
      setHasMore(page < data.total_pages)
      setActiveTab("search")
      if (page === 1 && !append && data.results.length > 0) setFeaturedMovie(data.results[0])
    } catch (error) {
      console.error("Error searching movies:", error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  const handleDiscover = useCallback(async (page = 1, append = false) => {
    setIsLoading(true)
    try {
      const params: any = {
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        minRating: Number.parseFloat(minRating) || undefined,
        sortBy,
        page,
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
  }, [selectedGenres, minRating, sortBy])

  const handleGenreChange = (genreId: number, checked: boolean) => {
    if (checked) {
      setSelectedGenres([...selectedGenres, genreId])
    } else {
      setSelectedGenres(selectedGenres.filter((id) => id !== genreId))
    }
  }

  const getMovieGenres = (movie: TMDBMovie) => {
    if (movie.genre_names && movie.genre_names.length > 0) {
      return movie.genre_names
    }
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      return movie.genre_ids.map((id) => genres.find((g) => g.id === id)?.name).filter(Boolean)
    }
    return []
  }

  const loadMoreMovies = () => {
    const nextPage = currentPage + 1
    switch (activeTab) {
      case "popular":
      case "trending":
      case "top-rated":
        loadContent(contentType, sortType, nextPage, true)
        break
      case "search":
        handleSearch(nextPage, true)
        break
      case "discover":
        handleDiscover(nextPage, true)
        break
      case "indian":
        loadIndianMovies(nextPage, true)
        break
    }
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

  // Scroll to discover section smoothly
  const scrollToDiscover = () => {
    window.scrollTo({
      top: heroHeight,
      behavior: 'smooth'
    })
  }

  return (
    <div
      className="min-h-screen text-white transition-colors duration-700"
      style={{ backgroundColor }}
      suppressHydrationWarning
    >
      {/* Floating Header */}
      <motion.header
        className="fixed top-0 w-full z-50 border-b backdrop-blur-sm transition-all duration-300"
        style={{
          borderColor: `rgba(75, 85, 99, ${bgColorProgress})`,
          backgroundColor: `rgba(0, 0, 0, ${Math.min(0.95, bgColorProgress * 0.95)})`
        }}
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => router.push('/')}>
              <OptimizedImage
                src="/logo.png"
                alt="Screen On Fire"
                width={48}
                height={48}
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
                priority={true}
              />
              <span className="text-lg md:text-xl font-bold hidden sm:inline">ScreenOnFire</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {/* Content Type Selector */}
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                <Button
                  variant={contentType === "movies" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setContentType("movies")
                    loadContent("movies", sortType)
                  }}
                  className={contentType === "movies" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white hover:bg-gray-700"}
                >
                  Movies
                </Button>
                <Button
                  variant={contentType === "series" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setContentType("series")
                    loadContent("series", sortType)
                  }}
                  className={contentType === "series" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white hover:bg-gray-700"}
                >
                  Series
                </Button>
              </div>

              {/* Sort Type Selector */}
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                <Button
                  variant={sortType === "popular" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSortType("popular")
                    loadContent(contentType, "popular")
                  }}
                  className={sortType === "popular" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white hover:bg-gray-700"}
                >
                  Popular
                </Button>
                <Button
                  variant={sortType === "trending" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSortType("trending")
                    loadContent(contentType, "trending")
                  }}
                  className={sortType === "trending" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white hover:bg-gray-700"}
                >
                  Trending
                </Button>
                <Button
                  variant={sortType === "top-rated" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSortType("top-rated")
                    loadContent(contentType, "top-rated")
                  }}
                  className={sortType === "top-rated" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white hover:bg-gray-700"}
                >
                  Top Rated
                </Button>
                <Button
                  variant={sortType === "indian" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSortType("indian")
                    loadContent(contentType, "indian")
                  }}
                  className={sortType === "indian" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white hover:bg-gray-700"}
                >
                  🇮🇳 Indian
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")} className="text-gray-300 hover:text-white">
                🤖 AI
              </Button>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search - Hidden on mobile */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 w-48 lg:w-64 bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
                />
              </div>

              {/* Auth UI */}
              {session?.user ? (
                <UserMenu user={session.user} />
              ) : (
                <AuthButtons
                  onLoginClick={() => setShowAuthModal(true)}
                />
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 w-full bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
            />
          </div>

          {/* Mobile Quick Nav */}
          <div className="lg:hidden mt-3 space-y-2">
            {/* Content Type Selector - Mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Button
                variant={contentType === "movies" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setContentType("movies")
                  loadContent("movies", sortType)
                }}
                className={`whitespace-nowrap ${contentType === "movies" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white"}`}
              >
                Movies
              </Button>
              <Button
                variant={contentType === "series" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setContentType("series")
                  loadContent("series", sortType)
                }}
                className={`whitespace-nowrap ${contentType === "series" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white"}`}
              >
                Series
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")} className="text-gray-300 hover:text-white whitespace-nowrap">
                🤖 AI
              </Button>
            </div>

            {/* Sort Type Selector - Mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Button
                variant={sortType === "popular" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSortType("popular")
                  loadContent(contentType, "popular")
                }}
                className={`whitespace-nowrap ${sortType === "popular" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white"}`}
              >
                Popular
              </Button>
              <Button
                variant={sortType === "trending" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSortType("trending")
                  loadContent(contentType, "trending")
                }}
                className={`whitespace-nowrap ${sortType === "trending" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white"}`}
              >
                Trending
              </Button>
              <Button
                variant={sortType === "top-rated" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSortType("top-rated")
                  loadContent(contentType, "top-rated")
                }}
                className={`whitespace-nowrap ${sortType === "top-rated" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white"}`}
              >
                Top Rated
              </Button>
              <Button
                variant={sortType === "indian" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setSortType("indian")
                  loadContent(contentType, "indian")
                }}
                className={`whitespace-nowrap ${sortType === "indian" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "text-gray-300 hover:text-white"}`}
              >
                🇮🇳 Indian
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Fades and Scales on Scroll */}
      <section className="relative h-screen flex flex-col justify-center items-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1950&q=80')",
            opacity: heroOpacity,
            scale: heroScale,
            filter: `blur(${heroBlur}px)`,
          }}
          suppressHydrationWarning
        >
          <div className="absolute inset-0 bg-black/75" />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          className="relative z-10 text-center max-w-4xl mx-auto px-4"
          style={{
            opacity: heroOpacity,
            y: -scrollY * 0.5, // Parallax effect
          }}
          suppressHydrationWarning
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Badge className="mb-6 bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              <Sparkles className="w-4 h-4 mr-1" />
              AI-Powered Movie Discovery
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Discover Your Next{" "}
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Favorite Movie
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Explore thousands of movies with intelligent recommendations, create personalized watchlists, and discover cinema that moves you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={scrollToDiscover}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3 text-lg transition-all duration-300 hover:scale-105"
              >
                <Play className="w-5 h-5 mr-2" />
                Discover Movies
              </Button>

              <Button
                size="lg"
                onClick={() => router.push('/recommendations')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3 text-lg transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                AI Recommendations
              </Button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">50K+</div>
                <div className="text-gray-400 text-sm">Movies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">AI</div>
                <div className="text-gray-400 text-sm">Powered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">24/7</div>
                <div className="text-gray-400 text-sm">Updated</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          style={{ opacity: heroOpacity }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          suppressHydrationWarning
        >
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <span className="text-sm">Scroll to explore</span>
            <ChevronRight className="w-6 h-6 rotate-90" />
          </div>
        </motion.div>
      </section>

      {/* Discover Section - Fades In as Hero Fades Out */}
      <motion.section
        className="relative min-h-screen bg-gradient-to-b from-gray-900 to-black"
        style={{
          opacity: discoverOpacity,
        }}
        suppressHydrationWarning
      >
        {/* Background with animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />

        <div className="relative z-10">
          {/* Featured Movie Banner with Sliding Carousel */}
          <AnimatePresence mode="wait">
            {featuredMovie && (
              <motion.div
                key={featuredMovie.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative h-[75vh] sm:h-[80vh] lg:h-[85vh] overflow-hidden border-b border-gray-800"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transform scale-105 transition-transform duration-700"
                  style={{
                    backgroundImage: `url(${getImageUrl(featuredMovie.backdrop_path, "original")})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60 md:via-black/90 md:to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
                </div>

                {/* Navigation Arrows */}
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
                    const nextIndex = (currentIndex + 1) % movies.length
                    setFeaturedMovie(movies[nextIndex])
                  }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-yellow-500 text-white hover:text-black h-12 w-12 md:h-14 md:w-14 rounded-full backdrop-blur-sm transition-all duration-300 border border-white/20 hover:border-yellow-500 hover:scale-110 shadow-xl"
                >
                  <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                </Button>

                <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex items-center">
                  <div className="mx-8 md:mx-12 w-full">
                    <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
                      {/* Content Section */}
                      <motion.div
                        className="order-2 lg:order-1 space-y-4 sm:space-y-5 lg:space-y-6"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      >
                        <div className="space-y-2">
                          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight line-clamp-2 lg:line-clamp-3">
                            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent drop-shadow-2xl">
                              {featuredMovie.title}
                            </span>
                          </h2>
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

                        {/* Overview */}
                        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-3 lg:line-clamp-4 max-w-3xl font-light">
                          {featuredMovie.overview}
                        </p>

                        {/* Action Buttons */}
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
                            variant="outline"
                            className={`border-2 font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                              isInWatchlist(featuredMovie.id)
                                ? "border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                                : "border-white/40 text-white hover:border-white hover:bg-white/10"
                            }`}
                            onClick={() => {
                              if (isInWatchlist(featuredMovie.id)) {
                                removeFromWatchlist(featuredMovie.id)
                              } else {
                                addToWatchlist(featuredMovie)
                              }
                            }}
                          >
                            <Heart
                              className={`h-5 w-5 mr-2 transition-all duration-300 ${
                                isInWatchlist(featuredMovie.id) ? "fill-current text-blue-400 scale-110" : ""
                              }`}
                            />
                            <span className="hidden sm:inline">{isInWatchlist(featuredMovie.id) ? "In your Watchlist" : "Add to Watchlist"}</span>
                            <span className="sm:hidden">{isInWatchlist(featuredMovie.id) ? "Added" : "Add"}</span>
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
                      </motion.div>

                      {/* Poster Section */}
                      <motion.div
                        className="order-1 lg:order-2 hidden sm:flex justify-center lg:justify-end"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      >
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
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Movies Grid Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            {/* Section Header */}
            <motion.div
              className="flex flex-col md:flex-row md:items-center justify-between mb-12 pb-8 border-b-2 border-gray-800"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 md:mb-0">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-3 tracking-tight">
                  <span className="bg-gradient-to-r from-white via-yellow-100 to-yellow-500 bg-clip-text text-transparent">
                    {activeTab === "search" && `Search Results for "${searchQuery}"`}
                    {activeTab === "discover" && "Discover Movies"}
                    {(activeTab === "popular" || activeTab === "trending" || activeTab === "top-rated" || activeTab === "indian") && (
                      <>
                        {sortType === "popular" && "Popular "}
                        {sortType === "trending" && "Trending "}
                        {sortType === "top-rated" && "Top Rated "}
                        {sortType === "indian" && "🇮🇳 Indian "}
                        {contentType === "movies" && "Movies"}
                        {contentType === "series" && "Series"}
                      </>
                    )}
                  </span>
                </h2>
                <p className="text-gray-400 text-sm md:text-base font-medium">
                  {movies.length > 0 ? `Showing ${movies.length} ${contentType === "series" ? (movies.length === 1 ? 'series' : 'series') : (movies.length === 1 ? 'movie' : 'movies')}` : 'Loading...'}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-2 font-semibold transition-all duration-300 hover:scale-105 px-6 py-3 text-sm ${
                  showFilters
                    ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                    : "border-gray-700 text-white bg-transparent hover:border-yellow-500 hover:bg-gray-900"
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </motion.div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-black border-2 border-yellow-500/30 mb-12 shadow-2xl shadow-yellow-500/10 overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b-2 border-gray-800 p-5">
                      <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                        <Filter className="h-6 w-6 text-yellow-500" />
                        Advanced Filters
                      </h3>
                    </div>
                    <CardContent className="p-6 md:p-8">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                          <label className="text-sm font-semibold mb-3 block">Genres</label>
                          <div className="grid grid-cols-2 gap-3">
                            {genres.slice(0, 8).map((genre) => (
                              <div key={genre.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`genre-${genre.id}`}
                                  checked={selectedGenres.includes(genre.id)}
                                  onCheckedChange={(checked) => handleGenreChange(genre.id, checked as boolean)}
                                />
                                <label htmlFor={`genre-${genre.id}`} className="text-sm text-gray-300">
                                  {genre.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-3 block">Min Rating</label>
                          <Select value={minRating} onValueChange={setMinRating}>
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Any</SelectItem>
                              <SelectItem value="6">6.0+</SelectItem>
                              <SelectItem value="7">7.0+</SelectItem>
                              <SelectItem value="8">8.0+</SelectItem>
                              <SelectItem value="9">9.0+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-semibold mb-3 block">Sort By</label>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="popularity.desc">Most Popular</SelectItem>
                              <SelectItem value="vote_average.desc">Top Rated</SelectItem>
                              <SelectItem value="release_date.desc">Newest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDiscover()}
                        className="w-full mt-8 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-6 text-base transition-all duration-300 hover:scale-105 rounded-lg"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <span className="animate-spin">⏳</span> Loading...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 justify-center">
                            <Filter className="h-5 w-5" /> Apply Filters
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Carousel for Popular/Top Rated/Trending/Indian */}
            {(activeTab === "popular" || activeTab === "top-rated" || activeTab === "trending" || activeTab === "indian") && movies.length > 0 && (
              <motion.div
                className="mb-10"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <PopularMoviesCarousel
                  movies={movies}
                  title={
                    sortType === "popular" ? (
                      contentType === "movies" ? "Most popular movies this week" :
                      "Most popular series this week"
                    ) :
                    sortType === "trending" ? (
                      contentType === "movies" ? "Trending movies now" :
                      "Trending series now"
                    ) :
                    sortType === "indian" ? (
                      contentType === "movies" ? "Popular Indian movies" :
                      "Popular Indian series"
                    ) :
                    (
                      contentType === "movies" ? "Top rated movies of all time" :
                      "Top rated series of all time"
                    )
                  }
                  isInWatchlist={isInWatchlist}
                  onAddToWatchlist={addToWatchlist}
                  onRemoveFromWatchlist={removeFromWatchlist}
                  onMarkAsWatched={handleMarkAsWatched}
                  watchedMovies={watchedMovies}
                />
              </motion.div>
            )}

            {/* Movie Grid with Staggered Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <MovieGrid
                movies={movies}
                isLoading={isLoading}
                isInWatchlist={isInWatchlist}
                onAddToWatchlist={addToWatchlist}
                onRemoveFromWatchlist={removeFromWatchlist}
                onLoadMovies={loadPopularMovies}
              />
            </motion.div>

            {/* Load More */}
            {movies.length > 0 && hasMore && (
              <motion.div
                className="flex flex-col items-center gap-6 mt-16 mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Button
                  onClick={loadMoreMovies}
                  disabled={isLoading}
                  variant="outline"
                  className="border-2 border-gray-700 hover:border-yellow-500 bg-transparent hover:bg-gray-900 text-white px-12 py-6 text-base font-semibold transition-all duration-300 hover:scale-105 rounded-lg group"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span>Loading...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Load More</span>
                      <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
                <div className="text-center">
                  <p className="text-gray-400 text-sm font-medium">
                    Showing <span className="text-yellow-500 font-semibold">{movies.length}</span> of{" "}
                    <span className="text-white font-semibold">{totalPages * 20}</span> movies
                  </p>
                  <p className="text-gray-500 text-xs mt-1 font-medium">Page {currentPage} of {totalPages}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </div>
  )
}
