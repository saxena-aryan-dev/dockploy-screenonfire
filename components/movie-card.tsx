"use client"

import { memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Star, Heart, ThumbsUp, ThumbsDown, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OptimizedImage } from "@/components/optimized-image"
import { getImageUrl, type TMDBMovie } from "@/lib/tmdb-supabase"
import { getYear } from "@/lib/date"

interface MovieCardProps {
  movie: TMDBMovie
  isInWatchlist?: boolean
  isLiked?: boolean
  isDisliked?: boolean
  onAddToWatchlist?: (movie: TMDBMovie) => void
  onRemoveFromWatchlist?: (movieId: string) => void
  onLike?: (movie: TMDBMovie) => void
  onDislike?: (movie: TMDBMovie) => void
}

const MovieCard = memo(function MovieCard({
  movie,
  isInWatchlist = false,
  isLiked = false,
  isDisliked = false,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onLike,
  onDislike
}: MovieCardProps) {
  const router = useRouter()

  const handleWatchlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isInWatchlist && onRemoveFromWatchlist) {
      onRemoveFromWatchlist(movie.id.toString())
    } else if (!isInWatchlist && onAddToWatchlist) {
      onAddToWatchlist(movie)
    }
  }, [isInWatchlist, onRemoveFromWatchlist, onAddToWatchlist, movie])

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onLike) {
      onLike(movie)
    }
  }, [onLike, movie])

  const handleDislike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDislike) {
      onDislike(movie)
    }
  }, [onDislike, movie])

  const handleMovieClick = useCallback(() => {
    router.push(`/movies/${movie.id}`)
  }, [router, movie.id])

  return (
    <Card
      className="bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800 hover:border-yellow-500/50 transition-all duration-300 group cursor-pointer relative overflow-hidden shadow-2xl hover:shadow-yellow-500/20"
      onClick={handleMovieClick}
    >
      {/* Poster Section with Enhanced Hover */}
      <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl">
        <OptimizedImage
          src={getImageUrl(movie.poster_path, 'w342')}
          alt={`${movie.title} poster`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          placeholder="/placeholder.jpg"
          width={342}
          height={513}
          priority={false}
        />

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Glow Effect on Hover */}
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-t-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 -z-10" />

        {/* Rating Badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-1.5 bg-black/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 shadow-xl border border-yellow-500/30">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            <span className="text-sm font-bold text-white">{movie.vote_average.toFixed(1)}</span>
          </div>
        </div>

        {/* Watchlist Bookmark Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleWatchlistToggle}
          className={`absolute top-3 right-3 h-9 w-9 rounded-full transition-all duration-300 z-10 shadow-lg ${
            isInWatchlist
              ? "bg-yellow-500 hover:bg-yellow-400 text-black scale-110"
              : "bg-black/80 hover:bg-black text-white backdrop-blur-md border-2 border-gray-700 hover:border-yellow-500"
          }`}
          title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <Bookmark
            className={`h-4 w-4 transition-all duration-300 ${
              isInWatchlist ? "fill-current scale-110" : ""
            }`}
          />
        </Button>

        {/* Action Buttons Overlay - Shows on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/95 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-10">
          <div className="flex items-center justify-center gap-2">
            {/* Like Button */}
            {onLike && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLike}
                className={`flex-1 h-8 rounded-lg transition-all duration-300 ${
                  isLiked
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
                title={isLiked ? "Unlike" : "Like"}
              >
                <ThumbsUp
                  className={`h-3.5 w-3.5 mr-1 ${isLiked ? "fill-current" : ""}`}
                />
                <span className="text-xs font-semibold">Like</span>
              </Button>
            )}

            {/* Dislike Button */}
            {onDislike && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDislike}
                className={`flex-1 h-8 rounded-lg transition-all duration-300 ${
                  isDisliked
                    ? "bg-red-500 hover:bg-red-400 text-black"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
                title={isDisliked ? "Remove Dislike" : "Dislike"}
              >
                <ThumbsDown
                  className={`h-3.5 w-3.5 mr-1 ${isDisliked ? "fill-current" : ""}`}
                />
                <span className="text-xs font-semibold">Dislike</span>
              </Button>
            )}
          </div>
        </div>

        {/* View Details Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-sm shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            View Details
          </div>
        </div>
      </div>

      {/* Card Info Section */}
      <CardContent className="p-4 bg-gradient-to-b from-gray-900 to-black">
        <h3 className="font-bold text-base mb-2 line-clamp-2 text-white group-hover:text-yellow-500 transition-colors duration-300 leading-tight">{movie.title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 font-semibold">{getYear(movie.release_date)}</p>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs text-gray-400 font-medium">{movie.vote_average.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default MovieCard