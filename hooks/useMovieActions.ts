"use client"

import { useState, useCallback, useEffect } from 'react'
import { TMDBMovie } from '@/lib/tmdb-supabase'

interface UseMovieActionsProps {
  userId: string
  initialWatchlist?: number[]
  initialLikes?: number[]
  initialDislikes?: number[]
}

interface MovieActionState {
  watchlist: Set<number>
  likes: Set<number>
  dislikes: Set<number>
  loading: Set<number>
}

export function useMovieActions({
  userId,
  initialWatchlist = [],
  initialLikes = [],
  initialDislikes = []
}: UseMovieActionsProps) {
  const [state, setState] = useState<MovieActionState>({
    watchlist: new Set(initialWatchlist),
    likes: new Set(initialLikes),
    dislikes: new Set(initialDislikes),
    loading: new Set()
  })

  // Load user's data on mount
  useEffect(() => {
    if (!userId) return

    const loadUserData = async () => {
      try {
        const [watchlistRes, likesRes] = await Promise.all([
          fetch(`/api/watchlist?userId=${userId}`),
          fetch(`/api/likes?userId=${userId}`)
        ])

        if (watchlistRes.ok) {
          const watchlistData = await watchlistRes.json()
          const watchlistIds = watchlistData.watchlist?.map((item: any) => item.movieId) || []
          setState(prev => ({ ...prev, watchlist: new Set(watchlistIds) }))
        }

        if (likesRes.ok) {
          const likesData = await likesRes.json()
          const likeIds = likesData.likes?.map((item: any) => item.movieId) || []
          const dislikeIds = likesData.dislikes?.map((item: any) => item.movieId) || []
          setState(prev => ({
            ...prev,
            likes: new Set(likeIds),
            dislikes: new Set(dislikeIds)
          }))
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }

    loadUserData()
  }, [userId])

  const addToWatchlist = useCallback(async (movie: TMDBMovie) => {
    if (!userId) return

    const movieId = movie.id

    // Optimistic update
    setState(prev => ({
      ...prev,
      watchlist: new Set([...prev.watchlist, movieId]),
      loading: new Set([...prev.loading, movieId])
    }))

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          movieId,
          movieTitle: movie.title,
          posterUrl: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null
        })
      })

      if (!response.ok) {
        // Revert on error
        setState(prev => {
          const newWatchlist = new Set(prev.watchlist)
          newWatchlist.delete(movieId)
          return { ...prev, watchlist: newWatchlist }
        })
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      // Revert on error
      setState(prev => {
        const newWatchlist = new Set(prev.watchlist)
        newWatchlist.delete(movieId)
        return { ...prev, watchlist: newWatchlist }
      })
    } finally {
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(movieId)
        return { ...prev, loading: newLoading }
      })
    }
  }, [userId])

  const removeFromWatchlist = useCallback(async (movieIdStr: string) => {
    if (!userId) return

    const movieId = parseInt(movieIdStr)

    // Optimistic update
    setState(prev => {
      const newWatchlist = new Set(prev.watchlist)
      newWatchlist.delete(movieId)
      return {
        ...prev,
        watchlist: newWatchlist,
        loading: new Set([...prev.loading, movieId])
      }
    })

    try {
      const response = await fetch(
        `/api/watchlist?userId=${userId}&movieId=${movieId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        // Revert on error
        setState(prev => ({
          ...prev,
          watchlist: new Set([...prev.watchlist, movieId])
        }))
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      // Revert on error
      setState(prev => ({
        ...prev,
        watchlist: new Set([...prev.watchlist, movieId])
      }))
    } finally {
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(movieId)
        return { ...prev, loading: newLoading }
      })
    }
  }, [userId])

  const likeMovie = useCallback(async (movie: TMDBMovie) => {
    if (!userId) return

    const movieId = movie.id
    const wasLiked = state.likes.has(movieId)

    // Optimistic update
    setState(prev => {
      const newLikes = new Set(prev.likes)
      const newDislikes = new Set(prev.dislikes)

      if (wasLiked) {
        // Unlike
        newLikes.delete(movieId)
      } else {
        // Like (and remove dislike if exists)
        newLikes.add(movieId)
        newDislikes.delete(movieId)
      }

      return {
        ...prev,
        likes: newLikes,
        dislikes: newDislikes,
        loading: new Set([...prev.loading, movieId])
      }
    })

    try {
      if (wasLiked) {
        // Remove like
        const response = await fetch(
          `/api/likes?userId=${userId}&movieId=${movieId}&type=like`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          // Revert on error
          setState(prev => ({
            ...prev,
            likes: new Set([...prev.likes, movieId])
          }))
        }
      } else {
        // Add like
        const response = await fetch('/api/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            movieId,
            movieTitle: movie.title,
            type: 'like'
          })
        })

        if (!response.ok) {
          // Revert on error
          setState(prev => {
            const newLikes = new Set(prev.likes)
            newLikes.delete(movieId)
            return { ...prev, likes: newLikes }
          })
        }
      }
    } catch (error) {
      console.error('Error liking movie:', error)
      // Revert on error
      if (wasLiked) {
        setState(prev => ({
          ...prev,
          likes: new Set([...prev.likes, movieId])
        }))
      } else {
        setState(prev => {
          const newLikes = new Set(prev.likes)
          newLikes.delete(movieId)
          return { ...prev, likes: newLikes }
        })
      }
    } finally {
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(movieId)
        return { ...prev, loading: newLoading }
      })
    }
  }, [userId, state.likes])

  const dislikeMovie = useCallback(async (movie: TMDBMovie) => {
    if (!userId) return

    const movieId = movie.id
    const wasDisliked = state.dislikes.has(movieId)

    // Optimistic update
    setState(prev => {
      const newLikes = new Set(prev.likes)
      const newDislikes = new Set(prev.dislikes)

      if (wasDisliked) {
        // Remove dislike
        newDislikes.delete(movieId)
      } else {
        // Dislike (and remove like if exists)
        newDislikes.add(movieId)
        newLikes.delete(movieId)
      }

      return {
        ...prev,
        likes: newLikes,
        dislikes: newDislikes,
        loading: new Set([...prev.loading, movieId])
      }
    })

    try {
      if (wasDisliked) {
        // Remove dislike
        const response = await fetch(
          `/api/likes?userId=${userId}&movieId=${movieId}&type=dislike`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          // Revert on error
          setState(prev => ({
            ...prev,
            dislikes: new Set([...prev.dislikes, movieId])
          }))
        }
      } else {
        // Add dislike
        const response = await fetch('/api/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            movieId,
            movieTitle: movie.title,
            type: 'dislike'
          })
        })

        if (!response.ok) {
          // Revert on error
          setState(prev => {
            const newDislikes = new Set(prev.dislikes)
            newDislikes.delete(movieId)
            return { ...prev, dislikes: newDislikes }
          })
        }
      }
    } catch (error) {
      console.error('Error disliking movie:', error)
      // Revert on error
      if (wasDisliked) {
        setState(prev => ({
          ...prev,
          dislikes: new Set([...prev.dislikes, movieId])
        }))
      } else {
        setState(prev => {
          const newDislikes = new Set(prev.dislikes)
          newDislikes.delete(movieId)
          return { ...prev, dislikes: newDislikes }
        })
      }
    } finally {
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(movieId)
        return { ...prev, loading: newLoading }
      })
    }
  }, [userId, state.dislikes])

  return {
    // State checkers
    isInWatchlist: (movieId: number) => state.watchlist.has(movieId),
    isLiked: (movieId: number) => state.likes.has(movieId),
    isDisliked: (movieId: number) => state.dislikes.has(movieId),
    isLoading: (movieId: number) => state.loading.has(movieId),

    // Actions
    addToWatchlist,
    removeFromWatchlist,
    likeMovie,
    dislikeMovie,

    // Raw state (for debugging or advanced use)
    watchlist: Array.from(state.watchlist),
    likes: Array.from(state.likes),
    dislikes: Array.from(state.dislikes)
  }
}
