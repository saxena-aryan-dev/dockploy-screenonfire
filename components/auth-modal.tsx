"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { useState } from "react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")

  const handleSuccess = () => {
    onClose()
    onAuthSuccess?.()
    window.location.reload()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Welcome to ScreenOnFire
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sign in to save your watchlist and get personalized recommendations.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="login" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              Log In
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              Sign Up
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginForm onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <SignupForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal
