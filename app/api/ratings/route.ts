import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch movie ratings (by user or by movie)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const movieId = searchParams.get('movieId')

    if (!userId && !movieId) {
      return NextResponse.json(
        { error: 'Either userId or movieId is required' },
        { status: 400 }
      )
    }

    if (userId && movieId) {
      // Get specific user's rating for a movie
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
    } else if (userId) {
      // Get all ratings by user
      const ratings = await prisma.movieRating.findMany({
        where: { userId },
        orderBy: { ratedAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        ratings,
        count: ratings.length
      })
    } else {
      // Get all ratings for a movie
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
    const body = await req.json()
    const { userId, movieId, movieTitle, rating } = body

    if (!userId || !movieId || !movieTitle || rating === undefined) {
      return NextResponse.json(
        { error: 'userId, movieId, movieTitle, and rating are required' },
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
    const body = await req.json()
    const { userId, movieId, rating } = body

    if (!userId || !movieId || rating === undefined) {
      return NextResponse.json(
        { error: 'userId, movieId, and rating are required' },
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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const movieId = searchParams.get('movieId')

    if (!userId || !movieId) {
      return NextResponse.json(
        { error: 'userId and movieId are required' },
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
