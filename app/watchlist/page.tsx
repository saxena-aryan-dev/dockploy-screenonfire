"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Film, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OptimizedImage } from "@/components/optimized-image"
import { useSession } from "@/components/providers/auth-provider"
import { AuthModal } from "@/components/auth/auth-modal"
import { UserMenu } from "@/components/user-menu"
import { AuthButtons } from "@/components/auth-buttons"
import { getImageUrl, type TMDBMovie } from "@/lib/tmdb-supabase"

interface WatchlistItem {
  id: string
  userId: string
  movieId: number
  movieTitle: string
  posterUrl: string | null
  addedAt: Date
}

export default function WatchlistPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  useEffect(() => {
    if (session?.user) {
      loadWatchlist()
    } else {
      setIsLoading(false)
    }
  }, [session])

  const loadWatchlist = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/watchlist')

      if (response.ok) {
        const data = await response.json()
        setWatchlist(data.watchlist || [])
      } else {
        console.error('Failed to load watchlist')
        setWatchlist([])
      }
    } catch (error) {
      console.error('Error loading watchlist:', error)
      setWatchlist([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (movieId: number) => {
    try {
      setRemovingId(movieId)
      const response = await fetch(`/api/watchlist?movieId=${movieId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setWatchlist(prev => prev.filter(item => item.movieId !== movieId))
      } else {
        console.error('Failed to remove from watchlist')
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    } finally {
      setRemovingId(null)
    }
  }

  // If not authenticated, show login prompt
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                <OptimizedImage
                  src="/logo.png"
                  alt="Screen On Fire"
                  width={40}
                  height={40}
                  className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  priority={true}
                />
                <span className="text-lg md:text-xl font-bold">ScreenOnFire</span>
              </div>
              <AuthButtons
                onLoginClick={() => setShowAuthModal(true)}
              />
            </div>
          </div>
        </header>

        {/* Login Required Message */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center space-y-6 p-8">
            <div className="flex justify-center">
              <div className="bg-yellow-500/10 p-6 rounded-full">
                <Heart className="h-16 w-16 text-yellow-500" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">My Watchlist</h1>
            <p className="text-gray-400 text-lg max-w-md">
              Sign in to save your favorite movies and create your personal watchlist
            </p>
            <Button
              size="lg"
              onClick={() => setShowAuthModal(true)}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>

        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
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
            </div>

            <nav className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/discover')} className="text-gray-300 hover:text-white">
                Discover
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/recommendations')} className="text-gray-300 hover:text-white">
                🤖 AI
              </Button>
            </nav>

            <UserMenu user={session.user} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              My Watchlist
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {watchlist.length > 0
              ? `You have ${watchlist.length} ${watchlist.length === 1 ? 'movie' : 'movies'} saved`
              : 'Your watchlist is empty'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && watchlist.length === 0 && (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="bg-gray-800 p-8 rounded-full">
                <Film className="h-20 w-20 text-gray-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Your watchlist is empty</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start adding movies to your watchlist by clicking the heart icon on any movie
            </p>
            <Button
              size="lg"
              onClick={() => router.push('/discover')}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              Discover Movies
            </Button>
          </div>
        )}

        {/* Watchlist Grid */}
        {!isLoading && watchlist.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {watchlist.map((item) => (
              <Card
                key={item.id}
                className="bg-gray-900 border-gray-800 overflow-hidden group hover:border-yellow-500 transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-0 relative">
                  {/* Movie Poster */}
                  <div
                    className="aspect-[2/3] relative cursor-pointer"
                    onClick={() => router.push(`/movies/${item.movieId}`)}
                  >
                    {item.posterUrl ? (
                      <OptimizedImage
                        src={item.posterUrl}
                        alt={item.movieTitle}
                        className="w-full h-full object-cover"
                        width={300}
                        height={450}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Film className="h-12 w-12 text-gray-600" />
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
                          {item.movieTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(item.movieId)
                      }}
                      disabled={removingId === item.movieId}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      {removingId === item.movieId ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
