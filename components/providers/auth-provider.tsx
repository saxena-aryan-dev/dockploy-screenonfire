"use client"

import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

// Re-export auth hooks for convenience
export { useSession, signIn, signOut } from "next-auth/react"
