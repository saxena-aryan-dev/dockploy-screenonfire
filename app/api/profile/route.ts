import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user profile with stats (public by userId/email for display, full stats for own profile)
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
        image: true,
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

// POST: Create a new user (redirect to auth)
export async function POST(req: NextRequest) {
  try {
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

// PUT: Update user profile (own profile only)
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
    const { name, image } = body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        image: image !== undefined ? image : undefined,
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

// DELETE: Delete user account (own account only)
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
