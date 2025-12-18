"use client"

import { memo } from "react"
import { Film } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MovieCard from "@/components/movie-card"
import type { TMDBMovie } from "@/lib/tmdb-supabase"

interface MovieGridProps {
  movies: TMDBMovie[]
  isLoading: boolean
  isInWatchlist?: (movieId: string) => boolean
  onAddToWatchlist?: (movie: TMDBMovie) => void
  onRemoveFromWatchlist?: (movieId: string) => void
  isLiked?: (movieId: number) => boolean
  isDisliked?: (movieId: number) => boolean
  onLike?: (movie: TMDBMovie) => void
  onDislike?: (movie: TMDBMovie) => void
  onLoadMovies?: () => void
}

const MovieGrid = memo(function MovieGrid({
  movies,
  isLoading,
  isInWatchlist,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isLiked,
  isDisliked,
  onLike,
  onDislike,
  onLoadMovies
}: MovieGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
        {[...Array(12)].map((_, i) => (
          <Card key={i} className="bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800 animate-pulse overflow-hidden shadow-xl">
            <div className="aspect-[2/3] bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl" />
            <CardContent className="p-4">
              <div className="h-5 bg-gray-700 rounded-lg mb-3" />
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 bg-gray-700 rounded" />
                <div className="h-4 w-12 bg-gray-700 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800 h-96 flex items-center justify-center">
        <CardContent className="text-center">
          <Film className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No movies found</h3>
          <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
          {onLoadMovies && (
            <Button onClick={onLoadMovies} className="bg-yellow-500 text-black hover:bg-yellow-600">
              Load Popular Movies
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as const // Custom easing curve
      }
    }
  }

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10 mb-8"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      {movies.map((movie, index) => (
        <motion.div
          key={movie.id}
          variants={itemVariants}
          whileHover={{
            scale: 1.05,
            y: -10,
            transition: { duration: 0.3, ease: "easeOut" }
          }}
          className="relative"
        >
          <MovieCard
            movie={movie}
            isInWatchlist={isInWatchlist ? isInWatchlist(movie.id.toString()) : false}
            onAddToWatchlist={onAddToWatchlist}
            onRemoveFromWatchlist={onRemoveFromWatchlist}
            isLiked={isLiked ? isLiked(movie.id) : false}
            isDisliked={isDisliked ? isDisliked(movie.id) : false}
            onLike={onLike}
            onDislike={onDislike}
          />
        </motion.div>
      ))}
    </motion.div>
  )
})

export default MovieGrid