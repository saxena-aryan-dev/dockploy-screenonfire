"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface SignupFormProps {
  onSuccess?: () => void
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      // Register user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create account")
        setIsLoading(false)
        return
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        onSuccess?.()
      } else {
        setError("Account created but login failed. Please try logging in.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-gray-300">
          Name
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-gray-300">
          Email
        </Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-gray-300">
          Password
        </Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-gray-300">
          Confirm Password
        </Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-500"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Sign Up"
        )}
      </Button>
    </form>
  )
}
