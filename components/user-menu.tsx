"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Bookmark, User } from "lucide-react"

interface UserMenuProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : user.email?.[0].toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="h-9 w-9 border-2 border-yellow-500 hover:border-yellow-400 transition-colors">
          <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
          <AvatarFallback className="bg-yellow-500 text-black font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800">
        <DropdownMenuLabel className="text-white">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || "User"}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer">
          <Link href="/watchlist" className="flex items-center">
            <Bookmark className="mr-2 h-4 w-4" />
            My Watchlist
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
