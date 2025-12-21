"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "./login-form"
import { SignupForm } from "./signup-form"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "login" | "signup"
}

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const handleSuccess = () => {
    onOpenChange(false)
    // Refresh the page to update auth state
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Welcome to ScreenOnFire
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {activeTab === "login"
              ? "Log in to access your watchlist and personalized recommendations"
              : "Create an account to start building your movie collection"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            >
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
