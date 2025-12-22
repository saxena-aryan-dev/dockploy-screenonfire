import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user profile with stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Either userId or email is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email: email! },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            watchlist: true,
            likes: true,
            dislikes: true,
            seen: true,
            reviews: true,
            ratings: true,
            discussions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get additional statistics
    const [
      recentActivity,
      topGenres,
      averageRating
    ] = await Promise.all([
      // Recent activity (last 5 actions)
      Promise.all([
        prisma.watchlistItem.findMany({
          where: { userId: user.id },
          orderBy: { addedAt: 'desc' },
          take: 5,
          select: { movieTitle: true, addedAt: true }
        }),
        prisma.movieReview.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { movieTitle: true, createdAt: true }
        })
      ]).then(([watchlist, reviews]) => ({
        watchlist,
        reviews
      })),

      // Top genres (from liked movies)
      prisma.movieLike.findMany({
        where: { userId: user.id },
        select: { movieId: true }
      }),

      // Average rating given by user
      prisma.movieRating.aggregate({
        where: { userId: user.id },
        _avg: { rating: true }
      })
    ])

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats: {
          watchlistCount: user._count.watchlist,
          likesCount: user._count.likes,
          dislikesCount: user._count.dislikes,
          seenCount: user._count.seen,
          reviewsCount: user._count.reviews,
          ratingsCount: user._count.ratings,
          discussionsCount: user._count.discussions,
          averageRating: averageRating._avg.rating
            ? Math.round(averageRating._avg.rating * 10) / 10
            : null
        },
        recentActivity
      }
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// POST: Create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, avatar } = body

    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Use the /api/auth/register endpoint instead
    return NextResponse.json(
      { error: 'Please use /api/auth/register to create a new account' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PUT: Update user profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, name, avatar } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated',
      user
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

// DELETE: Delete user account
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Delete user (will cascade delete all related data)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'User account deleted'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
