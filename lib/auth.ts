import NextAuth, { NextAuthConfig } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/", // Redirect to home with modal instead of separate page
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      // On Google sign-in, capture the profile picture from Google
      if (account?.provider === "google" && profile) {
        token.picture = (profile as { picture?: string }).picture || token.picture
        token.name = profile.name || token.name
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = (token.id as string) ?? ""
        session.user.email = (token.email as string) ?? ""
        session.user.name = (token.name as string) ?? ""
        session.user.image = (token.picture as string) ?? ""
      }
      return session
    }
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
