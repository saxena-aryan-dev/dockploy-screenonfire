"use client"

import { memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Star, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OptimizedImage } from "@/components/optimized-image"
import { getImageUrl, type TMDBMovie } from "@/lib/tmdb-supabase"
import { getYear } from "@/lib/date"

interface MovieCardProps {
  movie: TMDBMovie
  isInWatchlist: boolean
  onAddToWatchlist?: (movie: TMDBMovie) => void
  onRemoveFromWatchlist?: (movieId: number) => void
  isLiked?: boolean
  isDisliked?: boolean
  onLike?: (movie: TMDBMovie) => void
  onDislike?: (movie: TMDBMovie) => void
}

const MovieCard = memo(function MovieCard({
  movie,
  isInWatchlist,
  onAddToWatchlist,
  onRemoveFromWatchlist,
}: MovieCardProps) {
  const router = useRouter()

  const handleWatchlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isInWatchlist) {
      onRemoveFromWatchlist?.(movie.id)
    } else {
      onAddToWatchlist?.(movie)
    }
  }, [isInWatchlist, onRemoveFromWatchlist, onAddToWatchlist, movie])

  const handleMovieClick = useCallback(() => {
    router.push(`/movies/${movie.id}`)
  }, [router, movie.id])

  return (
    <Card
      className="bg-gray-900/50 backdrop-blur-sm border-gray-800 hover:border-gray-700 transition-all duration-200 group cursor-pointer relative overflow-hidden hover:shadow-xl hover:-translate-y-1"
      onClick={handleMovieClick}
    >
      {/* Poster Section with Enhanced Hover */}
      <div className="aspect-[2/3] relative overflow-hidden">
        <OptimizedImage
          src={getImageUrl(movie.poster_path, 'w342')}
          alt={`${movie.title} poster`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          placeholder="/placeholder.jpg"
          width={300}
          height={450}
          priority={false}
        />

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating Badge */}
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded px-2 py-1 shadow-lg border border-gray-700">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-semibold text-white">{movie.vote_average.toFixed(1)}</span>
          </div>
        </div>

        {/* Watchlist Heart Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleWatchlistToggle}
          className={`absolute top-2 right-2 h-8 w-8 rounded-full transition-all duration-200 z-10 ${
            isInWatchlist
              ? "bg-blue-500 hover:bg-blue-400 text-white"
              : "bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm border border-gray-700"
          }`}
        >
          <Heart
            className={`h-4 w-4 transition-all duration-200 ${
              isInWatchlist ? "fill-current" : ""
            }`}
          />
        </Button>

        {/* Hover Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black to-transparent">
          <p className="text-white text-xs font-medium line-clamp-2">
            {movie.title}
          </p>
        </div>
      </div>

      {/* Card Info Section */}
      <CardContent className="p-3 bg-gray-900/80">
        <h3 className="font-semibold text-sm mb-1.5 line-clamp-2 text-white group-hover:text-gray-200 transition-colors">{movie.title}</h3>
        <p className="text-xs text-gray-500 font-medium">{getYear(movie.release_date)}</p>
      </CardContent>
    </Card>
  )
})

export default MovieCard