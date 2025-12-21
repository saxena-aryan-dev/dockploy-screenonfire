import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Require authentication in API routes
 * Returns the session if authenticated, throws 401 error if not
 */
export async function requireAuth() {
  const session = await auth()

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    )
  }

  return { session, user: session.user }
}
