import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch movie reviews
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const movieId = searchParams.get('movieId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    if (!userId && !movieId) {
      return NextResponse.json(
        { error: 'Either userId or movieId is required' },
        { status: 400 }
      )
    }

    const queryOptions: any = {
      orderBy: { createdAt: 'desc' }
    }

    if (limit) {
      queryOptions.take = Number(limit)
    }

    if (offset) {
      queryOptions.skip = Number(offset)
    }

    if (userId && movieId) {
      // Get specific user's review for a movie
      const review = await prisma.movieReview.findFirst({
        where: {
          userId,
          movieId: Number(movieId)
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        review
      })
    } else if (userId) {
      // Get all reviews by user
      const reviews = await prisma.movieReview.findMany({
        ...queryOptions,
        where: { userId }
      })

      return NextResponse.json({
        success: true,
        reviews,
        count: reviews.length
      })
    } else {
      // Get all reviews for a movie
      const reviews = await prisma.movieReview.findMany({
        ...queryOptions,
        where: { movieId: Number(movieId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        reviews,
        count: reviews.length
      })
    }
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST: Create a new review
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, movieId, movieTitle, content, rating } = body

    if (!userId || !movieId || !movieTitle || !content) {
      return NextResponse.json(
        { error: 'userId, movieId, movieTitle, and content are required' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this movie
    const existing = await prisma.movieReview.findFirst({
      where: {
        userId,
        movieId: Number(movieId)
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this movie. Use PUT to update your review.' },
        { status: 409 }
      )
    }

    const review = await prisma.movieReview.create({
      data: {
        userId,
        movieId: Number(movieId),
        movieTitle,
        content,
        rating: rating ? Number(rating) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Review created',
      review
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// PUT: Update existing review
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { reviewId, content, rating } = body

    if (!reviewId || !content) {
      return NextResponse.json(
        { error: 'reviewId and content are required' },
        { status: 400 }
      )
    }

    const review = await prisma.movieReview.update({
      where: { id: reviewId },
      data: {
        content,
        rating: rating !== undefined ? Number(rating) : undefined,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Review updated',
      review
    })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE: Remove review
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      )
    }

    await prisma.movieReview.delete({
      where: { id: reviewId }
    })

    return NextResponse.json({
      success: true,
      message: 'Review deleted'
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
