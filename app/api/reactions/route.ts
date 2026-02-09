import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch reactions for a discussion (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const discussionId = searchParams.get('discussionId')

    if (!discussionId) {
      return NextResponse.json(
        { error: 'discussionId is required' },
        { status: 400 }
      )
    }

    const reactions = await prisma.discussionReaction.findMany({
      where: { discussionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group reactions by type and count
    const reactionCounts = reactions.reduce((acc: any, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = {
          type: reaction.type,
          count: 0,
          users: []
        }
      }
      acc[reaction.type].count++
      acc[reaction.type].users.push({
        id: reaction.user.id,
        name: reaction.user.name,
        image: reaction.user.image
      })
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      reactions,
      reactionCounts: Object.values(reactionCounts),
      totalCount: reactions.length
    })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    )
  }
}

// POST: Add a reaction to a discussion
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
    const { discussionId, type } = body

    if (!discussionId || !type) {
      return NextResponse.json(
        { error: 'discussionId and type are required' },
        { status: 400 }
      )
    }

    // Valid reaction types
    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user already reacted with this type
    const existing = await prisma.discussionReaction.findUnique({
      where: {
        discussionId_userId_type: {
          discussionId,
          userId,
          type
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reacted with this type' },
        { status: 409 }
      )
    }

    const reaction = await prisma.discussionReaction.create({
      data: {
        userId,
        discussionId,
        type
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Reaction added',
      reaction
    })
  } catch (error) {
    console.error('Error adding reaction:', error)
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    )
  }
}

// DELETE: Remove a reaction
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
    const type = searchParams.get('type')

    if (!discussionId || !type) {
      return NextResponse.json(
        { error: 'discussionId and type are required' },
        { status: 400 }
      )
    }

    await prisma.discussionReaction.delete({
      where: {
        discussionId_userId_type: {
          discussionId,
          userId,
          type
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Reaction removed'
    })
  } catch (error) {
    console.error('Error removing reaction:', error)
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    )
  }
}
