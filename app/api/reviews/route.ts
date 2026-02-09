import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch movie reviews (public by movieId, auth for user's own reviews)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const movieId = searchParams.get('movieId')
    const forUser = searchParams.get('forUser')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const queryOptions: any = {
      orderBy: { createdAt: 'desc' }
    }

    if (limit) {
      queryOptions.take = Number(limit)
    }

    if (offset) {
      queryOptions.skip = Number(offset)
    }

    if (forUser) {
      // Auth required for user-specific reviews
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const userId = session.user.id

      if (movieId) {
        // Get current user's review for a specific movie
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
                image: true
              }
            }
          }
        })

        return NextResponse.json({
          success: true,
          review
        })
      } else {
        // Get all reviews by current user
        const reviews = await prisma.movieReview.findMany({
          ...queryOptions,
          where: { userId }
        })

        return NextResponse.json({
          success: true,
          reviews,
          count: reviews.length
        })
      }
    } else if (movieId) {
      // Public: Get all reviews for a movie
      const reviews = await prisma.movieReview.findMany({
        ...queryOptions,
        where: { movieId: Number(movieId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        reviews,
        count: reviews.length
      })
    } else {
      return NextResponse.json(
        { error: 'movieId or forUser parameter is required' },
        { status: 400 }
      )
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await req.json()
    const { movieId, movieTitle, content, rating } = body

    if (!movieId || !movieTitle || !content) {
      return NextResponse.json(
        { error: 'movieId, movieTitle, and content are required' },
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
            image: true
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

// PUT: Update existing review (ownership check)
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
    const { reviewId, content, rating } = body

    if (!reviewId || !content) {
      return NextResponse.json(
        { error: 'reviewId and content are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.movieReview.findUnique({
      where: { id: reviewId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only edit your own reviews' },
        { status: 403 }
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
            image: true
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

// DELETE: Remove review (ownership check)
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
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.movieReview.findUnique({
      where: { id: reviewId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own reviews' },
        { status: 403 }
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
