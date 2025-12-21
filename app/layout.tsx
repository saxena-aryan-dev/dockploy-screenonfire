import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { FloatingChatButton } from "@/components/floating-chat-button"
import PerformanceMonitor from "@/components/performance-monitor"
import ServiceWorkerInitializer from "@/components/service-worker-initializer"
import { AuthProvider } from "@/components/providers/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ScreenOnFire - Cinematic Discovery",
  description: "Your ultimate movie recommender powered by AI.",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#EAB308',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ServiceWorkerInitializer />
          <PerformanceMonitor />
          {children}
          <FloatingChatButton />
        </AuthProvider>
      </body>
    </html>
  )
}
