import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch discussions for a movie or a specific discussion thread (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const movieId = searchParams.get('movieId')
    const discussionId = searchParams.get('discussionId')
    const userId = searchParams.get('userId')

    if (discussionId) {
      // Get specific discussion with all replies (recursive)
      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              },
              reactions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      return NextResponse.json({
        success: true,
        discussion
      })
    } else if (movieId) {
      // Get all top-level discussions for a movie (no parent)
      const discussions = await prisma.discussion.findMany({
        where: {
          movieId: Number(movieId),
          parentId: null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              replies: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        discussions,
        count: discussions.length
      })
    } else if (userId) {
      // Get all discussions by a user
      const discussions = await prisma.discussion.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          reactions: true,
          _count: {
            select: {
              replies: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        discussions,
        count: discussions.length
      })
    } else {
      return NextResponse.json(
        { error: 'Either movieId, discussionId, or userId is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching discussions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discussions' },
      { status: 500 }
    )
  }
}

// POST: Create a new discussion or reply
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
    const { movieId, content, parentId } = body

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    if (!parentId && !movieId) {
      return NextResponse.json(
        { error: 'movieId is required for top-level discussions' },
        { status: 400 }
      )
    }

    // If this is a reply, get the movieId from the parent discussion
    let finalMovieId = movieId ? Number(movieId) : undefined
    if (parentId && !finalMovieId) {
      const parent = await prisma.discussion.findUnique({
        where: { id: parentId },
        select: { movieId: true }
      })
      if (parent) {
        finalMovieId = parent.movieId
      }
    }

    if (!finalMovieId) {
      return NextResponse.json(
        { error: 'Could not determine movieId for discussion' },
        { status: 400 }
      )
    }

    const discussion = await prisma.discussion.create({
      data: {
        userId,
        movieId: finalMovieId,
        content,
        parentId: parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        reactions: true
      }
    })

    return NextResponse.json({
      success: true,
      message: parentId ? 'Reply created' : 'Discussion created',
      discussion
    })
  } catch (error) {
    console.error('Error creating discussion:', error)
    return NextResponse.json(
      { error: 'Failed to create discussion' },
      { status: 500 }
    )
  }
}

// PUT: Update existing discussion (ownership check via session)
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
    const { discussionId, content } = body

    if (!discussionId || !content) {
      return NextResponse.json(
        { error: 'discussionId and content are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.discussion.findUnique({
      where: { id: discussionId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only edit your own discussions' },
        { status: 403 }
      )
    }

    const discussion = await prisma.discussion.update({
      where: { id: discussionId },
      data: {
        content,
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
        },
        reactions: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Discussion updated',
      discussion
    })
  } catch (error) {
    console.error('Error updating discussion:', error)
    return NextResponse.json(
      { error: 'Failed to update discussion' },
      { status: 500 }
    )
  }
}

// DELETE: Remove discussion (ownership check via session)
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
    const discussionId = searchParams.get('discussionId')

    if (!discussionId) {
      return NextResponse.json(
        { error: 'discussionId is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.discussion.findUnique({
      where: { id: discussionId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own discussions' },
        { status: 403 }
      )
    }

    // Delete discussion (will cascade delete replies and reactions)
    await prisma.discussion.delete({
      where: { id: discussionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Discussion deleted'
    })
  } catch (error) {
    console.error('Error deleting discussion:', error)
    return NextResponse.json(
      { error: 'Failed to delete discussion' },
      { status: 500 }
    )
  }
}
