"use client"

import { Button } from "@/components/ui/button"

interface AuthButtonsProps {
  onLoginClick: () => void
  onSignupClick: () => void
}

export function AuthButtons({ onLoginClick, onSignupClick }: AuthButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onLoginClick}
        variant="ghost"
        className="text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
      >
        Log In
      </Button>
      <Button
        onClick={onSignupClick}
        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-all duration-300"
      >
        Sign Up
      </Button>
    </div>
  )
}
