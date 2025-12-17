"use client"

import { useRouter } from "next/navigation"
import { Play, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function SimpleLanding() {
  const router = useRouter()

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
                <img
                  src="/logo.png"
                  alt="Screen On Fire"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-xl font-bold">ScreenOnFire</span>
              </div>
              
              <nav className="flex items-center gap-6">
                {/* Navigation items can be added here */}
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
    </div>
  )
}