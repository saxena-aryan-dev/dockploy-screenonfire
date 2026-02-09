"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Play,
  Star,
  Clock,
  Calendar,
  ArrowLeft,
  Grid3X3,
  List,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
  getMovieWatchProviders,
  getImageUrl,
  formatRuntime,
  type TMDBMovieDetails,
  type TMDBMovie,
} from "@/lib/tmdb-supabase"
import { AiReviewModal } from "@/components/ai-review-modal"
import { Bot } from "lucide-react"
import { getYear } from "@/lib/date"
import { useMovieActions } from "@/hooks/useMovieActions"

interface Cast {
  id: number
  name: string
  character: string
  profile_path: string | null
}

interface Crew {
  id: number
  name: string
  job: string
}

interface Video {
  id: string
  key: string
  name: string
  type: string
  site: string
}

interface WatchProvider {
  logo_path: string
  provider_name: string
  provider_id: number
}

interface WatchProviders {
  flatrate?: WatchProvider[]
  rent?: WatchProvider[]
  buy?: WatchProvider[]
}

// Provider URL mapping for popular streaming services
const getProviderURL = (providerId: number, movieTitle: string) => {
  const encodedTitle = encodeURIComponent(movieTitle)
  
  const providerUrls: { [key: number]: string } = {
    8: `https://www.netflix.com/search?q=${encodedTitle}`, // Netflix
    9: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`, // Amazon Prime Video
    337: `https://www.disneyplus.com/search?q=${encodedTitle}`, // Disney+
    384: `https://www.hbomax.com/search?q=${encodedTitle}`, // HBO Max
    15: `https://tv.apple.com/search?term=${encodedTitle}`, // Apple TV+
    531: `https://www.paramountplus.com/search?query=${encodedTitle}`, // Paramount+
    386: `https://www.peacocktv.com/search?q=${encodedTitle}`, // Peacock
    387: `https://www.starz.com/search?query=${encodedTitle}`, // Starz
    43: `https://www.crunchyroll.com/search?q=${encodedTitle}`, // Crunchyroll
    2: `https://tv.apple.com/search?term=${encodedTitle}`, // Apple iTunes
    3: `https://play.google.com/store/search?q=${encodedTitle}&c=movies`, // Google Play Movies
    68: `https://www.microsoft.com/en-us/search?q=${encodedTitle}`, // Microsoft Store
    10: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`, // Amazon Video
    192: `https://www.youtube.com/results?search_query=${encodedTitle}+movie`, // YouTube
    350: `https://tv.apple.com/search?term=${encodedTitle}`, // Apple TV
  }
  
  return providerUrls[providerId] || `https://www.google.com/search?q=watch+${encodedTitle}+online`
}

export default function MovieDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const movieId = params.id as string

  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null)
  const [cast, setCast] = useState<Cast[]>([])
  const [crew, setCrew] = useState<Crew[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [similarMovies, setSimilarMovies] = useState<TMDBMovie[]>([])
  const [watchProviders, setWatchProviders] = useState<WatchProviders>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("cast")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [aiReview, setAiReview] = useState("")
  const [isReviewLoading, setIsReviewLoading] = useState(false)

  // Movie actions hook
  const movieActions = useMovieActions({
    initialWatchlist: [],
    initialLikes: [],
    initialDislikes: []
  })

  useEffect(() => {
    if (movieId) {
      loadMovieData()
    }
  }, [movieId])

  const loadMovieData = async () => {
    try {
      setIsLoading(true)

      // Load ALL data in parallel for maximum performance
      const [movieData, creditsData, videosData, similarData, providersData] = await Promise.allSettled([
        getMovieDetails(Number(movieId)),
        getMovieCredits(Number(movieId)),
        getMovieVideos(Number(movieId)),
        getSimilarMovies(Number(movieId)),
        getMovieWatchProviders(Number(movieId)),
      ])

      // Set data with fallbacks
      setMovie(movieData.status === 'fulfilled' ? movieData.value : null)
      setCast(creditsData.status === 'fulfilled' ? creditsData.value.cast.slice(0, 20) : [])
      setCrew(creditsData.status === 'fulfilled' ? creditsData.value.crew : [])
      setVideos(videosData.status === 'fulfilled' ? videosData.value : [])
      setSimilarMovies(similarData.status === 'fulfilled' ? similarData.value.results : [])

      // Log providers data for debugging
      if (providersData.status === 'fulfilled') {
        console.log('Watch Providers Data:', providersData.value)
        setWatchProviders(providersData.value)
      } else {
        console.log('Failed to load watch providers:', providersData.reason)
        setWatchProviders({})
      }

    } catch (error) {
      console.error("Error loading movie data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDirector = () => {
    return crew.find((person) => person.job === "Director")?.name || "Unknown"
  }

  const getCertification = () => {
    // This would typically come from TMDB release dates endpoint
    return "UA13+" // Placeholder
  }

  const handleAiReview = async () => {
    if (!movie) return
    setIsReviewModalOpen(true)
    setIsReviewLoading(true)
    setAiReview("") // clear previous review
    
    try {
      const response = await fetch("/api/movie-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: movie.title, stream: true }),
      })

      if (!response.ok) throw new Error(await response.text())

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      setIsReviewLoading(false) // Stop showing loading, start showing streaming text
      let accumulatedText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.error)
              }
              
              if (data.text) {
                accumulatedText += data.text
                setAiReview(accumulatedText)
              }
              
              if (data.done) {
                return // Streaming complete
              }
            } catch (parseError) {
              // Ignore malformed JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("AI review error:", error)
      setAiReview("Sorry, I couldn't generate a review right now. Please try again later.")
      setIsReviewLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header Skeleton */}
        <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        </header>

        {/* Hero Section Skeleton */}
        <section className="relative bg-gradient-to-t from-black via-black/80 to-black/40">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="grid lg:grid-cols-3 gap-12 items-start">
              {/* Poster Skeleton */}
              <div className="lg:col-span-1">
                <div className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
              </div>

              {/* Info Skeleton */}
              <div className="lg:col-span-2 space-y-8">
                <div className="space-y-6">
                  <div className="h-12 bg-gray-800 rounded-lg animate-pulse w-3/4" />
                  <div className="flex flex-wrap gap-4">
                    <div className="h-12 w-24 bg-gray-800 rounded-full animate-pulse" />
                    <div className="h-12 w-24 bg-gray-800 rounded-full animate-pulse" />
                    <div className="h-12 w-32 bg-gray-800 rounded-full animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-20 bg-gray-800 rounded-full animate-pulse" />
                    <div className="h-10 w-20 bg-gray-800 rounded-full animate-pulse" />
                    <div className="h-10 w-24 bg-gray-800 rounded-full animate-pulse" />
                  </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="flex flex-wrap gap-3">
                  <div className="h-14 w-32 bg-gray-800 rounded-xl animate-pulse" />
                  <div className="h-14 w-32 bg-gray-800 rounded-xl animate-pulse" />
                  <div className="h-14 w-40 bg-gray-800 rounded-xl animate-pulse" />
                  <div className="h-14 w-32 bg-gray-800 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-12 bg-gray-800 rounded-lg animate-pulse w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Movie not found</h1>
          <Button onClick={() => router.push("/discover")} className="bg-yellow-500 text-black hover:bg-yellow-600">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold truncate">{movie.title}</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url(${getImageUrl(movie.backdrop_path, "original")})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            {/* Poster */}
            <div className="lg:col-span-1">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-black/20 backdrop-blur-sm rounded-xl p-2 border border-white/10">
                  <img
                    src={getImageUrl(movie.poster_path, "w780") || "/placeholder.svg"}
                    alt={movie.title}
                    className="w-full rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                    {movie.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-lg">
                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                    <span className="text-gray-300">/10</span>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                    <Calendar className="h-5 w-5 text-gray-300" />
                    <span className="text-white font-medium">{getYear(movie.release_date)}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                    <Clock className="h-5 w-5 text-gray-300" />
                    <span className="text-white font-medium">{formatRuntime(movie.runtime)}</span>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-400/30">
                    <span className="text-yellow-300 font-medium">{getCertification()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {movie.genres.map((genre) => (
                    <div
                      key={genre.id}
                      className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20 transition-all duration-300"
                    >
                      <span className="text-white font-medium">{genre.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4" suppressHydrationWarning>
                <button
                  onClick={handleAiReview}
                  className="group relative px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-white to-gray-100 text-black font-bold text-sm sm:text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-white/20 transform hover:scale-105 transition-all duration-300 border border-white/20"
                  suppressHydrationWarning
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                    <span className="hidden sm:inline">AI Review</span>
                    <span className="sm:hidden">AI</span>
                  </div>
                </button>

                {/* Watchlist Button */}
                <button
                  onClick={() => {
                    if (movieActions.isInWatchlist(Number(movieId))) {
                      movieActions.removeFromWatchlist(Number(movieId))
                    } else {
                      movie && movieActions.addToWatchlist(movie as unknown as TMDBMovie)
                    }
                  }}
                  className={`group relative px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-bold text-sm sm:text-base lg:text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 border ${
                    movieActions.isInWatchlist(Number(movieId))
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/30 hover:shadow-blue-500/20'
                      : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white border-gray-700/50 hover:shadow-gray-500/20'
                  }`}
                  suppressHydrationWarning
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    <Heart className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-all ${movieActions.isInWatchlist(Number(movieId)) ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">{movieActions.isInWatchlist(Number(movieId)) ? "In your Watchlist" : "Add to Watchlist"}</span>
                    <span className="sm:hidden">{movieActions.isInWatchlist(Number(movieId)) ? "Added" : "Add"}</span>
                  </div>
                </button>

                {/* Like Button */}
                <button
                  onClick={() => movie && movieActions.likeMovie(movie as unknown as TMDBMovie)}
                  className={`group relative px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-bold text-sm sm:text-base lg:text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 border ${
                    movieActions.isLiked(Number(movieId))
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400/30 hover:shadow-green-500/20'
                      : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white border-gray-700/50 hover:shadow-gray-500/20'
                  }`}
                  suppressHydrationWarning
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    <ThumbsUp className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${movieActions.isLiked(Number(movieId)) ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Like</span>
                  </div>
                </button>

                {/* Dislike Button */}
                <button
                  onClick={() => movie && movieActions.dislikeMovie(movie as unknown as TMDBMovie)}
                  className={`group relative px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-bold text-sm sm:text-base lg:text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 border ${
                    movieActions.isDisliked(Number(movieId))
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400/30 hover:shadow-red-500/20'
                      : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white border-gray-700/50 hover:shadow-gray-500/20'
                  }`}
                  suppressHydrationWarning
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    <ThumbsDown className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${movieActions.isDisliked(Number(movieId)) ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Dislike</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 bg-gray-900 border-gray-800 gap-1 p-1">
            <TabsTrigger value="cast" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              Cast
            </TabsTrigger>
            <TabsTrigger value="synopsis" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              Synopsis
            </TabsTrigger>
            <TabsTrigger value="watch" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <span className="hidden sm:inline" suppressHydrationWarning>Where to Watch</span>
              <span className="sm:hidden" suppressHydrationWarning>Watch</span>
            </TabsTrigger>
            <TabsTrigger value="trailers" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              Trailers
            </TabsTrigger>
            <TabsTrigger value="similar" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <span className="hidden sm:inline" suppressHydrationWarning>Similar Titles</span>
              <span className="sm:hidden" suppressHydrationWarning>Similar</span>
            </TabsTrigger>
          </TabsList>

          {/* Where to Watch */}
          <TabsContent value="watch" className="mt-8">
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-gray-300 text-sm">
                  Click on a provider to search for "{movie.title}" on their platform
                </p>
              </div>

              {watchProviders.flatrate && watchProviders.flatrate.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-4 text-yellow-500 flex items-center gap-2">
                    <Play className="w-6 h-6" />
                    Stream
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {watchProviders.flatrate.map((provider) => (
                      <Card
                        key={provider.provider_id}
                        className="bg-gray-900 border-gray-800 hover:border-yellow-500 transition-all duration-300 group cursor-pointer overflow-hidden"
                        onClick={() => window.open(getProviderURL(provider.provider_id, movie.title), '_blank')}
                      >
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 group-hover:ring-2 group-hover:ring-yellow-500 transition-all">
                              <img
                                src={getImageUrl(provider.logo_path, "w200") || "https://via.placeholder.com/100/1f2937/9ca3af?text=?"}
                                alt={provider.provider_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white group-hover:text-yellow-500 transition-colors">{provider.provider_name}</p>
                              <p className="text-sm text-gray-400">Subscription Required</p>
                            </div>
                          </div>
                          <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-yellow-500 transition-colors flex-shrink-0 ml-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {watchProviders.rent && watchProviders.rent.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-4 text-yellow-500 flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Rent or Buy
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {watchProviders.rent.map((provider) => (
                      <Card
                        key={provider.provider_id}
                        className="bg-gray-900 border-gray-800 hover:border-yellow-500 transition-all duration-300 group cursor-pointer overflow-hidden"
                        onClick={() => window.open(getProviderURL(provider.provider_id, movie.title), '_blank')}
                      >
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 group-hover:ring-2 group-hover:ring-yellow-500 transition-all">
                              <img
                                src={getImageUrl(provider.logo_path, "w200") || "https://via.placeholder.com/100/1f2937/9ca3af?text=?"}
                                alt={provider.provider_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white group-hover:text-yellow-500 transition-colors">{provider.provider_name}</p>
                              <p className="text-sm text-gray-400">Rental Available</p>
                            </div>
                          </div>
                          <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-yellow-500 transition-colors flex-shrink-0 ml-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {watchProviders.buy && watchProviders.buy.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-4 text-yellow-500 flex items-center gap-2">
                    <ExternalLink className="w-6 h-6" />
                    Buy
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {watchProviders.buy.map((provider) => (
                      <Card
                        key={provider.provider_id}
                        className="bg-gray-900 border-gray-800 hover:border-yellow-500 transition-all duration-300 group cursor-pointer overflow-hidden"
                        onClick={() => window.open(getProviderURL(provider.provider_id, movie.title), '_blank')}
                      >
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 group-hover:ring-2 group-hover:ring-yellow-500 transition-all">
                              <img
                                src={getImageUrl(provider.logo_path, "w200") || "https://via.placeholder.com/100/1f2937/9ca3af?text=?"}
                                alt={provider.provider_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white group-hover:text-yellow-500 transition-colors">{provider.provider_name}</p>
                              <p className="text-sm text-gray-400">Purchase Available</p>
                            </div>
                          </div>
                          <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-yellow-500 transition-colors flex-shrink-0 ml-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {(!watchProviders.flatrate || watchProviders.flatrate.length === 0) &&
                (!watchProviders.rent || watchProviders.rent.length === 0) &&
                (!watchProviders.buy || watchProviders.buy.length === 0) && (
                  <div className="text-center py-16 bg-gray-900/50 border border-gray-800 rounded-xl">
                    <ExternalLink className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No Streaming Options Found</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      We couldn't find any streaming services for this movie in your region. Try searching on popular platforms directly.
                    </p>
                    <Button
                      className="bg-yellow-500 text-black hover:bg-yellow-600"
                      onClick={() => window.open(`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+online`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Search on Google
                    </Button>
                  </div>
                )}
            </div>
          </TabsContent>

          {/* Synopsis */}
          <TabsContent value="synopsis" className="mt-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold mb-4 text-yellow-500">Overview</h3>
                <p className="text-gray-300 leading-relaxed text-lg">{movie.overview}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-500">Director</h3>
                  <p className="text-gray-300 text-lg">{getDirector()}</p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-500">Release Date</h3>
                  <p className="text-gray-300 text-lg">{movie.release_date}</p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-500">Runtime</h3>
                  <p className="text-gray-300 text-lg">{formatRuntime(movie.runtime)}</p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-500">Rating</h3>
                  <p className="text-gray-300 text-lg">{movie.vote_average.toFixed(1)}/10</p>
                </div>
              </div>

              {movie.tagline && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-6">
                  <p className="text-gray-300 italic text-lg">"{movie.tagline}"</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Cast */}
          <TabsContent value="cast" className="mt-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-yellow-500">Cast & Crew</h3>
                <p className="text-gray-400 text-sm">{cast.length} cast members</p>
              </div>

              {cast.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {cast.map((actor) => (
                    <Card key={actor.id} className="bg-gray-900 border-gray-800 hover:border-yellow-500 transition-all duration-300 group overflow-hidden">
                      <div className="aspect-[2/3] overflow-hidden">
                        <img
                          src={
                            getImageUrl(actor.profile_path, "w300") ||
                            "https://via.placeholder.com/300x450/1f2937/9ca3af?text=No+Image"
                          }
                          alt={actor.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm text-white mb-1 line-clamp-2 group-hover:text-yellow-500 transition-colors">{actor.name}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2">{actor.character}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No cast information available</p>
                </div>
              )}

              {crew.filter(c => c.job === "Director" || c.job === "Producer" || c.job === "Writer").length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4 text-yellow-500">Key Crew</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {crew
                      .filter(c => c.job === "Director" || c.job === "Producer" || c.job === "Writer")
                      .slice(0, 6)
                      .map((crewMember) => (
                        <div key={crewMember.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 transition-colors">
                          <p className="font-semibold text-white">{crewMember.name}</p>
                          <p className="text-sm text-gray-400">{crewMember.job}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Trailers */}
          <TabsContent value="trailers" className="mt-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-yellow-500">Videos & Trailers</h3>
                <p className="text-gray-400 text-sm">{videos.length} videos available</p>
              </div>

              {videos.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
                  {videos.slice(0, 6).map((video) => (
                    <Card key={video.id} className="bg-gray-900 border-gray-800 hover:border-yellow-500 transition-all duration-300 group overflow-hidden">
                      <div className="aspect-video relative group cursor-pointer overflow-hidden">
                        <img
                          src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                          alt={video.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-all duration-300">
                          <div className="transform group-hover:scale-110 transition-transform duration-300">
                            <Button
                              size="lg"
                              className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16 shadow-2xl"
                              onClick={() => window.open(`https://www.youtube.com/watch?v=${video.key}`, "_blank")}
                            >
                              <Play className="h-8 w-8 fill-white" />
                            </Button>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                          {video.type}
                        </div>
                      </div>
                      <CardContent className="p-4 bg-gray-900">
                        <h4 className="font-semibold text-white line-clamp-2 group-hover:text-yellow-500 transition-colors">{video.name}</h4>
                        <p className="text-xs text-gray-400 mt-1">YouTube • {video.site}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-900/50 border border-gray-800 rounded-xl">
                  <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Trailers Available</h3>
                  <p className="text-gray-500">No videos or trailers are available for this movie yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Similar Titles */}
          <TabsContent value="similar" className="mt-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Similar Movies</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-yellow-500 text-black" : "border-gray-600 text-white"}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "bg-yellow-500 text-black" : "border-gray-600 text-white"}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {similarMovies.length > 0 ? (
                <div
                  className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-4"}
                >
                  {similarMovies.slice(0, 12).map((similarMovie) => (
                    <Card
                      key={similarMovie.id}
                      className={`bg-gray-900 border-gray-800 hover:border-yellow-500 transition-all duration-300 group cursor-pointer ${
                        viewMode === "list" ? "flex" : ""
                      }`}
                      onClick={() => router.push(`/movies/${similarMovie.id}`)}
                    >
                      <div
                        className={`${viewMode === "list" ? "w-24 flex-shrink-0" : "aspect-[2/3]"} relative overflow-hidden rounded-t-lg ${viewMode === "list" ? "rounded-l-lg rounded-tr-none" : ""}`}
                      >
                        <img
                          src={getImageUrl(similarMovie.poster_path) || "/placeholder.svg"}
                          alt={similarMovie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2">
                          <div className="flex items-center gap-1 bg-black/80 rounded px-2 py-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs font-semibold text-white">
                              {similarMovie.vote_average.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <CardContent className={`p-3 ${viewMode === "list" ? "flex-1" : ""}`}>
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2 text-white group-hover:text-yellow-500 transition-colors">
                          {similarMovie.title}
                        </h4>
                        <p className="text-xs text-gray-400">{getYear(similarMovie.release_date)}</p>
                        {viewMode === "list" && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-3">{similarMovie.overview}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No similar movies found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AiReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        review={aiReview}
        isLoading={isReviewLoading}
        movieTitle={movie.title}
      />
    </div>
  )
}
