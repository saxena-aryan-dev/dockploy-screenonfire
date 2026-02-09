import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Fetch user preferences
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const preferences = await prisma.userPreference.findUnique({
      where: { userId }
    })

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json({
        success: true,
        preferences: {
          userId,
          favoriteGenres: [],
          preferredLanguages: ['en'],
          emailNotifications: true,
          theme: 'dark'
        }
      })
    }

    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// POST: Create or update user preferences
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
    const { favoriteGenres, preferredLanguages, emailNotifications, theme } = body

    // Upsert preferences (create or update)
    const preferences = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        favoriteGenres: favoriteGenres !== undefined ? favoriteGenres : undefined,
        preferredLanguages: preferredLanguages !== undefined ? preferredLanguages : undefined,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
        theme: theme !== undefined ? theme : undefined,
        updatedAt: new Date()
      },
      create: {
        userId,
        favoriteGenres: favoriteGenres || [],
        preferredLanguages: preferredLanguages || ['en'],
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        theme: theme || 'dark'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Preferences saved',
      preferences
    })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}

// PUT: Update specific preference fields
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
    const { favoriteGenres, preferredLanguages, emailNotifications, theme } = body

    // Check if preferences exist
    const existing = await prisma.userPreference.findUnique({
      where: { userId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Preferences not found. Use POST to create preferences first.' },
        { status: 404 }
      )
    }

    const updateData: any = { updatedAt: new Date() }
    if (favoriteGenres !== undefined) updateData.favoriteGenres = favoriteGenres
    if (preferredLanguages !== undefined) updateData.preferredLanguages = preferredLanguages
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications
    if (theme !== undefined) updateData.theme = theme

    const preferences = await prisma.userPreference.update({
      where: { userId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Preferences updated',
      preferences
    })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

// DELETE: Delete user preferences
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

    await prisma.userPreference.delete({
      where: { userId }
    })

    return NextResponse.json({
      success: true,
      message: 'Preferences deleted'
    })
  } catch (error) {
    console.error('Error deleting preferences:', error)
    return NextResponse.json(
      { error: 'Failed to delete preferences' },
      { status: 500 }
    )
  }
}
