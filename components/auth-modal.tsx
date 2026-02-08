"use client"

import { AuthModal as AuthModalBase } from "@/components/auth/auth-modal"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess?: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <AuthModalBase
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
    />
  )
}

export default AuthModal
