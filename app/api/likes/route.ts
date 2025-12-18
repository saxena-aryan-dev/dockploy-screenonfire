import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user's likes and dislikes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'like' or 'dislike' or 'all'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (type === 'like') {
      const likes = await prisma.movieLike.findMany({
        where: { userId },
        orderBy: { likedAt: 'desc' }
      })
      return NextResponse.json({
        success: true,
        likes,
        count: likes.length
      })
    } else if (type === 'dislike') {
      const dislikes = await prisma.movieDislike.findMany({
        where: { userId },
        orderBy: { dislikedAt: 'desc' }
      })
      return NextResponse.json({
        success: true,
        dislikes,
        count: dislikes.length
      })
    } else {
      // Get both likes and dislikes
      const [likes, dislikes] = await Promise.all([
        prisma.movieLike.findMany({
          where: { userId },
          orderBy: { likedAt: 'desc' }
        }),
        prisma.movieDislike.findMany({
          where: { userId },
          orderBy: { dislikedAt: 'desc' }
        })
      ])

      return NextResponse.json({
        success: true,
        likes,
        dislikes,
        likesCount: likes.length,
        dislikesCount: dislikes.length
      })
    }
  } catch (error) {
    console.error('Error fetching likes/dislikes:', error)
    // Return empty arrays instead of 500 error for development
    return NextResponse.json({
      success: false,
      likes: [],
      dislikes: [],
      likesCount: 0,
      dislikesCount: 0,
      error: 'Database not available (using empty lists)'
    })
  }
}

// POST: Like or dislike a movie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, movieId, movieTitle, type } = body

    if (!userId || !movieId || !movieTitle || !type) {
      return NextResponse.json(
        { error: 'userId, movieId, movieTitle, and type (like/dislike) are required' },
        { status: 400 }
      )
    }

    if (type !== 'like' && type !== 'dislike') {
      return NextResponse.json(
        { error: 'type must be either "like" or "dislike"' },
        { status: 400 }
      )
    }

    const movieIdNum = Number(movieId)

    if (type === 'like') {
      // Remove dislike if exists
      await prisma.movieDislike.deleteMany({
        where: {
          userId,
          movieId: movieIdNum
        }
      })

      // Check if already liked
      const existing = await prisma.movieLike.findUnique({
        where: {
          userId_movieId: {
            userId,
            movieId: movieIdNum
          }
        }
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Movie already liked' },
          { status: 409 }
        )
      }

      const like = await prisma.movieLike.create({
        data: {
          userId,
          movieId: movieIdNum,
          movieTitle
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Movie liked',
        like
      })
    } else {
      // Remove like if exists
      await prisma.movieLike.deleteMany({
        where: {
          userId,
          movieId: movieIdNum
        }
      })

      // Check if already disliked
      const existing = await prisma.movieDislike.findUnique({
        where: {
          userId_movieId: {
            userId,
            movieId: movieIdNum
          }
        }
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Movie already disliked' },
          { status: 409 }
        )
      }

      const dislike = await prisma.movieDislike.create({
        data: {
          userId,
          movieId: movieIdNum,
          movieTitle
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Movie disliked',
        dislike
      })
    }
  } catch (error) {
    console.error('Error liking/disliking movie:', error)
    // Return success=false but not 500 for development
    return NextResponse.json({
      success: false,
      error: 'Database not available (like/dislike not saved)',
      message: 'Action not saved - database unavailable'
    })
  }
}

// DELETE: Remove like or dislike
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const movieId = searchParams.get('movieId')
    const type = searchParams.get('type') // 'like' or 'dislike'

    if (!userId || !movieId || !type) {
      return NextResponse.json(
        { error: 'userId, movieId, and type are required' },
        { status: 400 }
      )
    }

    if (type !== 'like' && type !== 'dislike') {
      return NextResponse.json(
        { error: 'type must be either "like" or "dislike"' },
        { status: 400 }
      )
    }

    const movieIdNum = Number(movieId)

    if (type === 'like') {
      await prisma.movieLike.delete({
        where: {
          userId_movieId: {
            userId,
            movieId: movieIdNum
          }
        }
      })
    } else {
      await prisma.movieDislike.delete({
        where: {
          userId_movieId: {
            userId,
            movieId: movieIdNum
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Movie ${type} removed`
    })
  } catch (error) {
    console.error('Error removing like/dislike:', error)
    // Return success=false but not 500 for development
    return NextResponse.json({
      success: false,
      error: 'Database not available (like/dislike not removed)',
      message: 'Action not saved - database unavailable'
    })
  }
}
