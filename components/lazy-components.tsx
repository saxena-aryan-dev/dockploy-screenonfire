"use client"

import dynamic from "next/dynamic"

export const AuthModal = dynamic(
  () => import("@/components/auth-modal").then((mod) => mod.AuthModal),
  { ssr: false }
)
