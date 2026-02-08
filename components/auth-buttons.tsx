"use client"

import { Button } from "@/components/ui/button"

interface AuthButtonsProps {
  onLoginClick: () => void
}

export function AuthButtons({ onLoginClick }: AuthButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onLoginClick}
        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-all duration-300"
      >
        Sign In
      </Button>
    </div>
  )
}
