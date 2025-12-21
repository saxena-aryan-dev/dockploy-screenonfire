import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user's watchlist
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: session.user.id },
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
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { movieId, movieTitle, posterUrl } = body

    if (!movieId || !movieTitle) {
      return NextResponse.json(
        { error: 'movieId and movieTitle are required' },
        { status: 400 }
      )
    }

    // Check if already in watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_movieId: {
          userId: session.user.id,
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
        userId: session.user.id,
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
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const movieId = searchParams.get('movieId')

    if (!movieId) {
      return NextResponse.json(
        { error: 'movieId is required' },
        { status: 400 }
      )
    }

    await prisma.watchlistItem.delete({
      where: {
        userId_movieId: {
          userId: session.user.id,
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
