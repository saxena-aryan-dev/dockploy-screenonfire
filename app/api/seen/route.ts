import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user's seen/watched movies
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
    const body = await req.json()
    const { userId, movieId, movieTitle } = body

    if (!userId || !movieId || !movieTitle) {
      return NextResponse.json(
        { error: 'userId, movieId, and movieTitle are required' },
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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const movieId = searchParams.get('movieId')

    if (!userId || !movieId) {
      return NextResponse.json(
        { error: 'userId and movieId are required' },
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
