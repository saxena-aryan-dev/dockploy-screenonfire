import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch movie ratings (public by movieId, auth required for user ratings)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const movieId = searchParams.get('movieId')
    const forUser = searchParams.get('forUser') // flag to get current user's rating

    if (forUser) {
      // Auth required for user-specific ratings
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const userId = session.user.id

      if (movieId) {
        // Get current user's rating for a specific movie
        const rating = await prisma.movieRating.findUnique({
          where: {
            userId_movieId: {
              userId,
              movieId: Number(movieId)
            }
          }
        })

        return NextResponse.json({
          success: true,
          rating
        })
      } else {
        // Get all ratings by current user
        const ratings = await prisma.movieRating.findMany({
          where: { userId },
          orderBy: { ratedAt: 'desc' }
        })

        return NextResponse.json({
          success: true,
          ratings,
          count: ratings.length
        })
      }
    } else if (movieId) {
      // Public: Get all ratings for a movie (aggregate)
      const ratings = await prisma.movieRating.findMany({
        where: { movieId: Number(movieId) },
        orderBy: { ratedAt: 'desc' }
      })

      // Calculate average rating
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0

      return NextResponse.json({
        success: true,
        ratings,
        count: ratings.length,
        averageRating: Math.round(avgRating * 10) / 10
      })
    } else {
      return NextResponse.json(
        { error: 'movieId or forUser parameter is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    )
  }
}

// POST: Create or update a movie rating
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
    const { movieId, movieTitle, rating } = body

    if (!movieId || !movieTitle || rating === undefined) {
      return NextResponse.json(
        { error: 'movieId, movieTitle, and rating are required' },
        { status: 400 }
      )
    }

    const ratingNum = Number(rating)

    if (ratingNum < 0 || ratingNum > 10) {
      return NextResponse.json(
        { error: 'Rating must be between 0 and 10' },
        { status: 400 }
      )
    }

    // Upsert (create or update)
    const movieRating = await prisma.movieRating.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      },
      update: {
        rating: ratingNum,
        updatedAt: new Date()
      },
      create: {
        userId,
        movieId: Number(movieId),
        movieTitle,
        rating: ratingNum
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Rating saved',
      rating: movieRating
    })
  } catch (error) {
    console.error('Error saving rating:', error)
    return NextResponse.json(
      { error: 'Failed to save rating' },
      { status: 500 }
    )
  }
}

// PUT: Update existing rating
export async function PUT(req: NextRequest) {
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
    const { movieId, rating } = body

    if (!movieId || rating === undefined) {
      return NextResponse.json(
        { error: 'movieId and rating are required' },
        { status: 400 }
      )
    }

    const ratingNum = Number(rating)

    if (ratingNum < 0 || ratingNum > 10) {
      return NextResponse.json(
        { error: 'Rating must be between 0 and 10' },
        { status: 400 }
      )
    }

    const movieRating = await prisma.movieRating.update({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      },
      data: {
        rating: ratingNum,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Rating updated',
      rating: movieRating
    })
  } catch (error) {
    console.error('Error updating rating:', error)
    return NextResponse.json(
      { error: 'Failed to update rating' },
      { status: 500 }
    )
  }
}

// DELETE: Remove rating
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

    await prisma.movieRating.delete({
      where: {
        userId_movieId: {
          userId,
          movieId: Number(movieId)
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Rating removed'
    })
  } catch (error) {
    console.error('Error removing rating:', error)
    return NextResponse.json(
      { error: 'Failed to remove rating' },
      { status: 500 }
    )
  }
}
