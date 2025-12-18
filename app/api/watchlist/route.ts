import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user's watchlist
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      watchlist,
      count: watchlist.length
    })
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    // Return empty watchlist instead of 500 error for development
    return NextResponse.json({
      success: false,
      watchlist: [],
      count: 0,
      error: 'Database not available (using empty watchlist)'
    })
  }
}

// POST: Add movie to watchlist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, movieId, movieTitle, posterUrl } = body

    if (!userId || !movieId || !movieTitle) {
      return NextResponse.json(
        { error: 'userId, movieId, and movieTitle are required' },
        { status: 400 }
      )
    }

    // Check if already in watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Movie already in watchlist' },
        { status: 409 }
      )
    }

    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        userId,
        movieId: Number(movieId),
        movieTitle,
        posterUrl: posterUrl || null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Movie added to watchlist',
      watchlistItem
    })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    // Return success=false but not 500 for development
    return NextResponse.json({
      success: false,
      error: 'Database not available (watchlist not saved)',
      message: 'Movie not added - database unavailable'
    })
  }
}

// DELETE: Remove movie from watchlist
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const movieId = searchParams.get('movieId')

    if (!userId || !movieId) {
      return NextResponse.json(
        { error: 'userId and movieId are required' },
        { status: 400 }
      )
    }

    await prisma.watchlistItem.delete({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Movie removed from watchlist'
    })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    // Return success=false but not 500 for development
    return NextResponse.json({
      success: false,
      error: 'Database not available (watchlist not updated)',
      message: 'Movie not removed - database unavailable'
    })
  }
}
