"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GoogleSignInButton } from "./google-sign-in-button"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [googleError, setGoogleError] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Welcome to ScreenOnFire
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sign in to access your watchlist and personalized recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <GoogleSignInButton onError={setGoogleError} />

          {googleError && (
            <div className="mt-3 text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
              {googleError}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
