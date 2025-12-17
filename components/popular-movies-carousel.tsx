"use client"

import { Star, Eye, Heart, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/optimized-image"
import { getImageUrl, type TMDBMovie } from "@/lib/tmdb-supabase"
import { getYear } from "@/lib/date"

interface PopularMoviesCarouselProps {
  movies: TMDBMovie[]
  title?: string
  isInWatchlist: (movieId: string) => boolean
  onAddToWatchlist: (movie: TMDBMovie) => void
  onRemoveFromWatchlist?: (movieId: string) => void
  onMarkAsWatched?: (movieId: string) => void
  watchedMovies?: Set<string>
}

export function PopularMoviesCarousel({
  movies,
  title = "Most popular movies this week",
  isInWatchlist,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onMarkAsWatched,
  watchedMovies = new Set(),
}: PopularMoviesCarouselProps) {
  const router = useRouter()

  const handleMarkWatched = (e: React.MouseEvent, movieId: string) => {
    e.stopPropagation()
    if (onMarkAsWatched) {
      onMarkAsWatched(movieId)
    }
  }

  const handleWatchlistToggle = (e: React.MouseEvent, movie: TMDBMovie) => {
    e.stopPropagation()
    const inWatchlist = isInWatchlist(movie.id.toString())
    if (inWatchlist && onRemoveFromWatchlist) {
      onRemoveFromWatchlist(movie.id.toString())
    } else {
      onAddToWatchlist(movie)
    }
  }

  return (
    <div className="w-full py-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-yellow-500" />
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        <ChevronRight className="w-6 h-6 text-gray-400" />
      </div>

      {/* Horizontal Scrolling Container */}
      <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {movies.slice(0, 10).map((movie, index) => {
          const isWatched = watchedMovies.has(movie.id.toString())
          const inWatchlist = isInWatchlist(movie.id.toString())
          const rating = movie.vote_average || 0
          const voteCount = movie.vote_count || 0

          return (
            <div
              key={movie.id}
              className="flex-shrink-0 w-[90vw] sm:w-[500px] lg:w-[600px] bg-zinc-900/80 rounded-lg overflow-hidden hover:bg-zinc-800/90 transition-colors duration-200 group snap-start border border-gray-800 hover:border-gray-700"
            >
              <div className="flex h-full">
                {/* Poster Section */}
                <div className="relative w-36 sm:w-48 md:w-56 flex-shrink-0">
                  <OptimizedImage
                    src={getImageUrl(movie.poster_path, "w342")}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    width={224}
                    height={336}
                    priority={index < 3}
                  />

                  {/* Heart Button (Add/Remove from Watchlist) */}
                  <Button
                    size="icon"
                    onClick={(e) => handleWatchlistToggle(e, movie)}
                    className={`absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                      inWatchlist
                        ? "bg-yellow-500 text-black hover:bg-yellow-400 scale-110"
                        : "bg-black/70 hover:bg-black/90 text-white border-2 border-gray-700 hover:border-yellow-500"
                    }`}
                  >
                    <Heart className={`w-5 h-5 transition-all duration-300 ${inWatchlist ? "fill-current" : ""}`} />
                  </Button>

                  {/* Rank Badge */}
                  <div className="absolute top-3 right-3 bg-gray-900/90 backdrop-blur-sm text-white px-2.5 py-1 rounded font-semibold text-xs border border-gray-700">
                    #{index + 1}
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
                  {/* Title */}
                  <h3
                    className="text-base sm:text-lg font-semibold mb-2 text-white line-clamp-2 cursor-pointer hover:text-yellow-500 transition-colors"
                    onClick={() => router.push(`/movies/${movie.id}`)}
                  >
                    {movie.title}
                  </h3>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                    <span>{getYear(movie.release_date)}</span>
                    {movie.original_language && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{movie.original_language}</span>
                      </>
                    )}
                    {movie.adult !== undefined && (
                      <>
                        <span>•</span>
                        <span className="border border-gray-700 px-1.5 py-0.5 rounded text-xs">
                          {movie.adult ? "R" : "PG"}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Rating & Vote Count */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold text-sm text-white">
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        ({voteCount > 1000 ? `${(voteCount / 1000).toFixed(1)}K` : voteCount})
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors"
                      onClick={() => router.push(`/movies/${movie.id}`)}
                    >
                      <Star className="w-3.5 h-3.5" />
                      Rate
                    </button>
                  </div>

                  {/* Mark as Watched Button */}
                  {onMarkAsWatched && (
                    <button
                      onClick={(e) => handleMarkWatched(e, movie.id.toString())}
                      className={`flex items-center gap-1.5 mb-3 text-xs transition-colors ${
                        isWatched
                          ? "text-green-500 font-medium"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isWatched ? "Watched" : "Mark as watched"}
                    </button>
                  )}

                  {/* Synopsis */}
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                    {movie.overview || "No description available."}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
