"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, Bot, User, Sparkles, Film, RotateCcw, AlertCircle, X, Wand2, Star, TrendingUp, Heart, Zap, Popcorn } from "lucide-react"
import { cn } from "@/lib/utils"

const SUGGESTED_PROMPTS = [
  { text: "Recommend me a thriller like Gone Girl", icon: TrendingUp },
  { text: "What's a good comedy for tonight?", icon: Popcorn },
  { text: "Best sci-fi movies of 2024", icon: Star },
  { text: "Movies similar to Inception", icon: Film },
  { text: "Hidden gem movies I should watch", icon: Sparkles },
  { text: "Best movies for a date night", icon: Heart },
]

// Simple function to convert basic markdown to HTML
function parseMarkdown(text: string): string {
  return text
    // Bold text: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    // Italic text: *text* -> <em>text</em>  
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Line breaks
    .replace(/\n/g, '<br />')
}

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Simple chat state replacement for useChat
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string}>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    setShowSuggestions(false)

    // Create placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage = { 
      id: assistantMessageId, 
      role: 'assistant' as const, 
      content: "" 
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], stream: true })
      })
      
      if (!response.ok) throw new Error('Failed to get response')
      
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      setIsLoading(false) // Stop loading, start streaming
      let accumulatedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.error)
              }
              
              if (data.text) {
                accumulatedContent += data.text
                // Update the assistant message content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              }
              
              if (data.done) {
                return // Streaming complete
              }
            } catch (parseError) {
              // Ignore malformed JSON chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err as Error)
      console.error("Chat error:", err)
      // Update the assistant message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: "Sorry, I couldn't process that request." }
            : msg
        )
      )
      setIsLoading(false)
    }
  }

  const reload = () => {
    setMessages([])
    setError(null)
    setShowSuggestions(true)
  }

  // Set mounted state for client-side only rendering
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSuggestedPrompt = (promptText: string) => {
    handleInputChange({ target: { value: promptText } } as any)
    setShowSuggestions(false)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      handleSubmit(e)
      setShowSuggestions(false)
    }
  }

  const resetChat = () => {
    window.location.reload() // Simple way to reset chat
  }

  // Add smooth opening effect
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll immediately for smooth experience
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="floating-chat-trigger group !fixed !bottom-5 !right-5 sm:!bottom-6 sm:!right-6 !h-14 !w-14 sm:!h-[60px] sm:!w-[60px] !rounded-2xl !shadow-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-amber-700 text-white transition-all duration-300 active:scale-95 !border-0 hover:shadow-yellow-500/50 hover:shadow-[0_20px_60px_-15px] !overflow-hidden pointer-events-auto"
          style={{
            zIndex: 9999,
            isolation: 'isolate',
            position: 'fixed',
            bottom: '20px',
            right: '20px'
          }}
          aria-label="Open AI Chat"
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
          </div>

          {/* Active indicator */}
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white shadow-lg" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[92vh] sm:h-[88vh] flex flex-col gap-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white border-t border-slate-700/50 p-0 animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
        {/* Professional Header with glassmorphism */}
        <SheetHeader className="relative p-4 sm:p-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <SheetTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-3 sm:gap-4">
              {/* Enhanced Avatar with glow */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-105 transition-transform duration-300">
                  <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" strokeWidth={2} />
                </div>
                {/* Animated status indicator */}
                <div className="absolute -bottom-1 -right-1">
                  <div className="relative">
                    <div className="w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 shadow-lg" />
                    {isMounted && (
                      <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    CineSensei
                  </span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0 font-medium">
                    AI
                  </Badge>
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  Your Personal Movie Expert
                </div>
              </div>
            </SheetTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={resetChat}
                className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all duration-200 active:scale-95 hover:shadow-lg"
                title="New Conversation"
              >
                <RotateCcw className="w-4.5 h-4.5" strokeWidth={2} />
              </Button>
            </div>
          </div>

        </SheetHeader>

        {/* Messages Area with gradient background */}
        <ScrollArea className="flex-1 px-4 sm:px-6 bg-gradient-to-b from-slate-950 to-slate-900" ref={scrollAreaRef}>
          <div className="space-y-4 sm:space-y-5 py-6 sm:py-8">
            {/* Enhanced Welcome Message */}
            {messages.length === 0 && (
              <div className="text-center py-8 sm:py-12 px-4 sm:px-6 max-w-3xl mx-auto">
                {/* Hero Avatar with animated gradient */}
                <div className="relative mx-auto mb-6 sm:mb-8 w-20 h-20 sm:w-24 sm:h-24">
                  {isMounted && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl blur-2xl opacity-40 animate-pulse" />
                  )}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-2xl" strokeWidth={2} />
                  </div>
                </div>

                {/* Welcome Text with gradient */}
                <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                  <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">
                    Welcome to CineSensei
                  </h3>
                  <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto px-2">
                    Your AI-powered movie companion. Get personalized recommendations, insightful reviews, and discover hidden cinematic gems tailored just for you.
                  </p>
                </div>

                {/* Suggested Prompts with enhanced design */}
                {showSuggestions && (
                  <div className="space-y-5 sm:space-y-6">
                    <div className="flex items-center justify-center gap-2.5 text-slate-400 text-sm font-semibold">
                      <Wand2 className="w-4 h-4 text-yellow-500" strokeWidth={2.5} />
                      <span>Get Started</span>
                      <div className="h-px w-12 bg-gradient-to-r from-slate-700 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {SUGGESTED_PROMPTS.map((prompt, index) => {
                        const Icon = prompt.icon
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            onClick={() => handleSuggestedPrompt(prompt.text)}
                            className="group relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 text-slate-300 hover:text-white hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 active:scale-98 text-left justify-start h-auto py-4 px-4 rounded-xl transition-all duration-300 touch-manipulation overflow-hidden"
                          >
                            {/* Animated gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-amber-500/0 group-hover:from-yellow-500/10 group-hover:to-amber-500/5 transition-all duration-300" />

                            <div className="relative flex items-center gap-3 w-full">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 group-hover:from-yellow-500/20 group-hover:to-amber-500/20 flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-lg group-hover:shadow-yellow-500/20">
                                <Icon className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                              </div>
                              <span className="text-sm font-medium leading-relaxed">{prompt.text}</span>
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Chat Messages */}
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 sm:gap-3.5 group animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl blur-sm opacity-50" />
                      <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                        <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col max-w-[82%] sm:max-w-[75%] min-w-0">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 sm:px-4.5 sm:py-3.5 shadow-xl backdrop-blur-sm transition-all duration-200",
                      message.role === "user"
                        ? "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 text-white ml-auto shadow-yellow-500/20"
                        : "bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-slate-100 border border-slate-700/50 shadow-slate-900/50",
                    )}
                  >
                    {message.content ? (
                      <div
                        className={cn(
                          "leading-relaxed [&>strong]:font-bold [&>em]:italic text-sm sm:text-base",
                          message.role === "user"
                            ? "[&>strong]:text-white"
                            : "[&>strong]:text-white [&>strong]:bg-yellow-500/10 [&>strong]:px-1 [&>strong]:rounded"
                        )}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                      />
                    ) : (
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:150ms]" />
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                  </div>

                  {message.role === "assistant" && message.content && (
                    <div className="flex items-center gap-2 mt-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-slate-400 font-medium">AI Generated</span>
                      </div>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg border border-slate-600/50 transform group-hover:scale-105 transition-transform">
                    <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-300" strokeWidth={2} />
                  </div>
                )}
              </div>
            ))}

            {/* Enhanced Loading State */}
            {isLoading && (
              <div className="flex gap-3 sm:gap-3.5 justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 mt-1">
                  <div className="relative">
                    {isMounted && (
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl blur-sm opacity-50 animate-pulse" />
                    )}
                    <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" strokeWidth={2} />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-slate-100 border border-slate-700/50 rounded-2xl px-4 py-3 sm:px-4.5 sm:py-3.5 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:150ms]"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:300ms]"></div>
                    </div>
                    <span className="text-sm text-slate-300">Analyzing your request...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Error State */}
            {error && (
              <div className="relative bg-gradient-to-br from-red-950/50 to-red-900/30 border border-red-800/50 rounded-2xl p-5 sm:p-6 text-center backdrop-blur-sm shadow-xl animate-in fade-in-0 zoom-in-95 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl pointer-events-none" />

                <div className="relative space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center shadow-lg">
                      <AlertCircle className="w-6 h-6 text-red-400" strokeWidth={2} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-red-300 text-sm sm:text-base font-semibold">Oops! Something went wrong</p>
                    <p className="text-red-400/80 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                      {error.message || "I couldn't process that request. Please try again."}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reload()}
                    className="bg-red-950/50 border-red-700/50 text-red-300 hover:bg-red-900/50 hover:border-red-600/50 hover:text-white rounded-xl active:scale-95 touch-manipulation transition-all duration-200 shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2" strokeWidth={2} />
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Professional Input Form */}
        <div className="relative border-t border-slate-700/50 bg-gradient-to-b from-slate-900/98 to-slate-900 backdrop-blur-xl p-4 sm:p-5 pb-safe shadow-2xl">
          {/* Subtle top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

          <div className="relative">
            <form onSubmit={handleFormSubmit} className="flex items-end gap-3">
              <div className="flex-1 relative group">
                {/* Glow effect on focus */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity duration-300" />

                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask me anything about movies..."
                  className="relative bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 resize-none min-h-[52px] sm:min-h-[56px] max-h-36 rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 text-sm sm:text-base focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all shadow-lg backdrop-blur-sm touch-manipulation"
                  rows={1}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleFormSubmit(e)
                    }
                  }}
                />
              </div>

              {/* Enhanced Send button */}
              <Button
                type="submit"
                size="icon"
                className="group relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-amber-700 active:scale-95 text-white rounded-2xl h-[52px] w-[52px] sm:h-[56px] sm:w-[56px] shadow-xl hover:shadow-yellow-500/30 hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex-shrink-0 overflow-hidden"
                disabled={isLoading || !input.trim()}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                {isLoading ? (
                  <div className="relative w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
                )}
              </Button>
            </form>

            {/* Enhanced Footer */}
            <div className="flex items-center justify-between mt-3 sm:mt-4">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    {isMounted && (
                      <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-400">Online</span>
                </div>
                <span className="text-slate-700 hidden sm:inline">•</span>
                <span className="hidden sm:inline text-xs text-slate-500">⏎ Send • ⇧⏎ New line</span>
              </div>

              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reload}
                  className="h-8 px-3 text-xs text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl touch-manipulation transition-all duration-200 border border-transparent hover:border-slate-700/50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                  Clear Chat
                </Button>
              )}
            </div>
          </div>

          {/* Powered by badge */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-800/50">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500/70" />
            <span className="text-xs text-slate-600 font-medium">Powered by Gemini AI</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
