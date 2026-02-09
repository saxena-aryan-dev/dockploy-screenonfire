"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Film, RotateCcw, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

const SUGGESTED_PROMPTS = [
  "Recommend me a thriller like Gone Girl",
  "What's a good comedy for tonight?",
  "Best sci-fi movies of 2024",
  "Hidden gem movies I should watch",
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
          className="floating-chat-trigger group !fixed !bottom-5 !right-5 sm:!bottom-6 sm:!right-6 !h-14 !w-14 !rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-black transition-all duration-200 active:scale-95 !border-0 shadow-lg pointer-events-auto"
          style={{
            zIndex: 9999,
            isolation: 'isolate',
            position: 'fixed',
            bottom: '20px',
            right: '20px'
          }}
          aria-label="Open AI Chat"
        >
          <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-black" strokeWidth={2} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[420px] sm:max-w-[420px] flex flex-col gap-0 bg-gray-950 text-white border-l border-gray-800 p-0 [&>button]:hidden"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold text-white flex items-center gap-3">
              <div className="w-9 h-9 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-white">CineSensei</span>
                <span className="text-xs font-normal text-gray-400">Movie Recommendations</span>
              </div>
            </SheetTitle>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={resetChat}
                className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                title="New Conversation"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                title="Close"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 py-6">
            {/* Welcome Screen */}
            {messages.length === 0 && (
              <div className="py-8 px-2">
                <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Film className="w-6 h-6 text-gray-400" strokeWidth={2} />
                </div>

                <h3 className="text-lg font-bold text-white text-center mb-1">How can I help?</h3>
                <p className="text-sm text-gray-400 text-center mb-6">Ask me anything about movies</p>

                {showSuggestions && (
                  <div className="space-y-2">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="w-full bg-gray-900/50 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-700 text-left justify-start h-auto py-3 px-4 rounded-lg transition-colors"
                      >
                        <span className="text-sm">{prompt}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-400" strokeWidth={2} />
                    </div>
                  </div>
                )}

                <div className="flex flex-col max-w-[82%] sm:max-w-[75%] min-w-0">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 transition-colors",
                      message.role === "user"
                        ? "bg-yellow-500 text-black ml-auto"
                        : "bg-gray-800 text-gray-100 border border-gray-700",
                    )}
                  >
                    {message.content ? (
                      <div
                        className={cn(
                          "leading-relaxed [&>strong]:font-bold [&>em]:italic text-sm",
                        )}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-gray-300" strokeWidth={2} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading State */}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-400" strokeWidth={2} />
                  </div>
                </div>
                <div className="bg-gray-800 text-gray-100 border border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-sm text-gray-400">Analyzing your request...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 animate-in fade-in-0 duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-300 font-medium">Something went wrong</p>
                    <p className="text-xs text-red-400/80 mt-1">
                      {error.message || "I couldn't process that request. Please try again."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reload()}
                    className="text-red-300 hover:text-white hover:bg-red-900/30 h-8 px-3 rounded-lg flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-gray-900 p-4 pb-safe">
          <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me anything about movies..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 resize-none min-h-[44px] max-h-36 rounded-lg px-3 py-2.5 text-sm focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors touch-manipulation"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleFormSubmit(e)
                }
              }}
            />

            <Button
              type="submit"
              size="icon"
              className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg h-[44px] w-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex-shrink-0"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" strokeWidth={2} />
              )}
            </Button>
          </form>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">Enter to send, Shift+Enter for new line</span>
            {messages.length > 0 && (
              <button
                onClick={reload}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear chat
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
