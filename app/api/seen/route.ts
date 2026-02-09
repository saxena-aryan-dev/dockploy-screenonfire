import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user's seen/watched movies
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const seenMovies = await prisma.seenMovie.findMany({
      where: { userId },
      orderBy: { watchedAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      seenMovies,
      count: seenMovies.length
    })
  } catch (error) {
    console.error('Error fetching seen movies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seen movies' },
      { status: 500 }
    )
  }
}

// POST: Mark movie as seen/watched
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await req.json()
    const { movieId, movieTitle } = body

    if (!movieId || !movieTitle) {
      return NextResponse.json(
        { error: 'movieId and movieTitle are required' },
        { status: 400 }
      )
    }

    // Check if already marked as seen
    const existing = await prisma.seenMovie.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Movie already marked as seen' },
        { status: 409 }
      )
    }

    const seenMovie = await prisma.seenMovie.create({
      data: {
        userId,
        movieId: Number(movieId),
        movieTitle
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Movie marked as seen',
      seenMovie
    })
  } catch (error) {
    console.error('Error marking movie as seen:', error)
    return NextResponse.json(
      { error: 'Failed to mark movie as seen' },
      { status: 500 }
    )
  }
}

// DELETE: Remove movie from seen list
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const movieId = searchParams.get('movieId')

    if (!movieId) {
      return NextResponse.json(
        { error: 'movieId is required' },
        { status: 400 }
      )
    }

    await prisma.seenMovie.delete({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Movie removed from seen list'
    })
  } catch (error) {
    console.error('Error removing from seen list:', error)
    return NextResponse.json(
      { error: 'Failed to remove from seen list' },
      { status: 500 }
    )
  }
}
