"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Play, Sparkles, Heart, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth-modal"
import { supabase, type WatchlistItem } from "@/lib/supabase"

export default function SimpleLanding() {
  const [authUser, setAuthUser] = useState<any | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const router = useRouter()

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null)
      if (session?.user) {
        loadUserWatchlist(session.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      if (session?.user) {
        loadUserWatchlist(session.user.id)
      } else {
        setWatchlist([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserWatchlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        if (error.code === "42P01") {
          console.warn("The watchlist table is missing – run scripts/create-watchlist-table.sql")
          return
        }
        throw error
      }

      setWatchlist(data ?? [])
    } catch (err) {
      console.error("Error loading watchlist:", err)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section - Full Viewport */}
      <section className="relative h-screen flex flex-col justify-center items-center overflow-hidden">
        {/* Background with overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1950&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/75" />
        </div>

        {/* Header */}
        <header className="absolute top-0 w-full z-20 border-b border-gray-800/50 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-xl">S</span>
                </div>
                <span className="text-xl font-bold">ScreenOnFire</span>
              </div>
              
              <nav className="flex items-center gap-6">
                {authUser ? (
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => router.push("/watchlist")}
                      className="text-gray-300 hover:text-white"
                    >
                      Watchlist ({watchlist.length})
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSignOut}
                      className="text-gray-400 hover:text-white"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAuthModal(true)}
                    className="border-gray-700 text-white bg-gray-800/50"
                  >
                    Sign In
                  </Button>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
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
              onClick={() => router.push('/discover')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3 text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Discover Movies
            </Button>
            
            <Button 
              size="lg" 
              onClick={() => router.push('/recommendations')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI Recommendations
            </Button>
            
            {authUser && (
              <Button 
                size="lg"
                variant="outline"
                onClick={() => router.push('/watchlist')}
                className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
              >
                <Heart className="w-5 h-5 mr-2" />
                My Watchlist ({watchlist.length})
              </Button>
            )}
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
        </div>
      </section>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthSuccess={() => {}} />
    </div>
  )
}