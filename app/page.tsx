"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Loader2, Save, Trash2, Settings, X, Palette, Download, RefreshCw } from "lucide-react"
import type { Message } from "ai"
import { type ThemeName, getTheme, themes } from "@/lib/themes"
import { processCommand, type CommandContext } from "@/lib/commands"
import { CommandSuggestions } from "@/components/command-suggestions"

// Define available models
export const geminiModels = {
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.0-flash-lite": "Gemini 2.0 Flash-Lite",
  "gemini-1.5-flash-8b": "Gemini 1.5 Flash-8B",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
}

export type GeminiModelType = keyof typeof geminiModels

export const openaiModels = {
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-4": "GPT-4",
  "gpt-4-turbo": "GPT-4 Turbo",
  "gpt-4o": "GPT-4o",
};

export type OpenAIModelType = keyof typeof openaiModels

// Default system prompt
const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant in a console-based chat application. Provide concise, helpful responses. You can use simple markdown formatting like **bold** and *italic* when appropriate."

export default function ConsoleChatbot() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [cursorVisible, setCursorVisible] = useState(true)
  const [localStorageAvailable, setLocalStorageAvailable] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [provider, setProvider] = useState<"openai" | "gemini">("openai")
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState("")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [savedOpenaiApiKey, setSavedOpenaiApiKey] = useState("")
  const [theme, setTheme] = useState<ThemeName>("matrix")
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  // Add system prompt state
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [savedSystemPrompt, setSavedSystemPrompt] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isApiKeyValid, setIsApiKeyValid] = useState(true)

  // Add model selection state
  const [openaiModel, setOpenaiModel] = useState<OpenAIModelType>("gpt-3.5-turbo")
  const [geminiModel, setGeminiModel] = useState<GeminiModelType>("gemini-1.0-pro")
  const [savedOpenaiModel, setSavedOpenaiModel] = useState<OpenAIModelType>("gpt-3.5-turbo")
  const [savedGeminiModel, setSavedGeminiModel] = useState<GeminiModelType>("gemini-1.0-pro")

  // Custom state for messages when using Gemini
  const [geminiMessages, setGeminiMessages] = useState<Message[]>([])
  const [isGeminiLoading, setIsGeminiLoading] = useState(false)
  const [geminiInput, setGeminiInput] = useState("")

  // Flag to prevent infinite loops
  const initialLoadRef = useRef(false)

  // Initialize chat with custom ID for persistence
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, error, reload } = useChat(
    {
      id: "console-chat-history",
      initialMessages: [],
      api: "/api/chat",
      body: {
        provider: "openai", // Always use OpenAI with the AI SDK
        apiKey: savedOpenaiApiKey || process.env.OPENAI_API_KEY,
        systemPrompt: savedSystemPrompt || DEFAULT_SYSTEM_PROMPT,
        model: savedOpenaiModel,
      },
      onError: (error) => {
        console.error("Chat error:", error)
        const errorMsg = error.message || "Failed to get response from AI. Please check your API key and try again."
        setErrorMessage(errorMsg)

        // Only add error message if using OpenAI
        if (provider === "openai") {
          setMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: `Error: ${errorMsg}`,
              },
            ]
          })
        }

        // Check if the error is related to an invalid API key
        if (errorMsg.includes("API key") || errorMsg.includes("authentication")) {
          setIsApiKeyValid(false)
        }
      },
      onResponse: (response) => {
        // Clear any previous error when we get a successful response
        setErrorMessage(null)
        setIsApiKeyValid(true)
      },
    },
  )

  // Get the current display messages based on provider
  const displayMessages = provider === "openai" ? messages : geminiMessages

  // Apply theme
  useEffect(() => {
    const currentTheme = getTheme(theme)
    document.documentElement.style.setProperty("--background", currentTheme.background)
    document.documentElement.style.setProperty("--foreground", currentTheme.foreground)
    document.documentElement.style.setProperty("--accent", currentTheme.accent)
    document.documentElement.style.setProperty("--muted", currentTheme.muted)
    document.documentElement.style.setProperty("--border", currentTheme.border)
    document.documentElement.style.setProperty("--success", currentTheme.success)
    document.documentElement.style.setProperty("--warning", currentTheme.warning)
    document.documentElement.style.setProperty("--error", currentTheme.error)
    document.documentElement.style.setProperty("--scrollbar-track", currentTheme.scrollbarTrack)
    document.documentElement.style.setProperty("--scrollbar-thumb", currentTheme.scrollbarThumb)
  }, [theme])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("") // clear the error after 5 seconds
      }, 4000)
  
      return () => clearTimeout(timer) // cleanup on unmount or new error
    }
  }, [errorMessage])

  // Check if localStorage is available
  useEffect(() => {
    try {
      const testKey = "__test__"
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      setLocalStorageAvailable(true)
    } catch (e) {
      setLocalStorageAvailable(false)
      console.warn("localStorage is not available. Chat history will not persist.")
    }
  }, [])

  // Load messages and settings from localStorage on component mount
  useEffect(() => {
    if (localStorageAvailable && !initialLoadRef.current) {
      initialLoadRef.current = true
      try {
        // Load saved provider first
        const savedProvider = localStorage.getItem("console-chat-provider")
        if (savedProvider) {
          setProvider(savedProvider as "openai" | "gemini")
        }

        // Load messages based on provider
        const savedMessages = localStorage.getItem("console-chat-history")
        if (savedMessages) {
          try {
            const parsedMessages = JSON.parse(savedMessages)
            if (Array.isArray(parsedMessages)) {
              if (savedProvider === "gemini") {
                setGeminiMessages(parsedMessages)
              } else {
                setMessages(parsedMessages)
              }
            } else {
              console.warn("Saved messages is not an array, resetting to empty array")
              setGeminiMessages([])
              setMessages([])
            }
          } catch (parseError) {
            console.error("Failed to parse saved messages:", parseError)
            setGeminiMessages([])
            setMessages([])
          }
        }

        // Load saved Gemini API key
        const savedKey = localStorage.getItem("console-chat-gemini-key")
        if (savedKey) {
          setSavedGeminiApiKey(savedKey)
          setGeminiApiKey(savedKey)
        }

        // Load saved OpenAI API key
        const savedOpenAIKey = localStorage.getItem("console-chat-openai-key")
        if (savedOpenAIKey) {
          setSavedOpenaiApiKey(savedOpenAIKey)
          setOpenaiApiKey(savedOpenAIKey)
        }

        // Load saved theme
        const savedTheme = localStorage.getItem("console-chat-theme")
        if (savedTheme && Object.keys(themes).includes(savedTheme)) {
          setTheme(savedTheme as ThemeName)
        }

        // Load command history
        const savedCommandHistory = localStorage.getItem("console-chat-command-history")
        if (savedCommandHistory) {
          try {
            const parsedHistory = JSON.parse(savedCommandHistory)
            if (Array.isArray(parsedHistory)) {
              setCommandHistory(parsedHistory)
            }
          } catch (error) {
            console.error("Failed to parse command history:", error)
          }
        }

        // Load saved system prompt
        const savedPrompt = localStorage.getItem("console-chat-system-prompt")
        if (savedPrompt) {
          setSavedSystemPrompt(savedPrompt)
          setSystemPrompt(savedPrompt)
        }

        // Load saved models
        const savedOpenAIModel = localStorage.getItem("console-chat-openai-model")
        if (savedOpenAIModel && Object.keys(openaiModels).includes(savedOpenAIModel)) {
          setSavedOpenaiModel(savedOpenAIModel as OpenAIModelType)
          setOpenaiModel(savedOpenAIModel as OpenAIModelType)
        }

        const savedGeminiModelValue = localStorage.getItem("console-chat-gemini-model")
        if (savedGeminiModelValue && Object.keys(geminiModels).includes(savedGeminiModelValue)) {
          setSavedGeminiModel(savedGeminiModelValue as GeminiModelType)
          setGeminiModel(savedGeminiModelValue as GeminiModelType)
        }
      } catch (error) {
        console.error("Failed to load chat history or settings:", error)
      }
    }
  }, [localStorageAvailable, setMessages])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (localStorageAvailable && provider === "openai" && messages.length > 0) {
      try {
        localStorage.setItem("console-chat-history", JSON.stringify(messages))
      } catch (error) {
        console.error("Failed to save chat history:", error)
      }
    }
  }, [messages, localStorageAvailable, provider])

  // Save Gemini messages to localStorage whenever they change
  useEffect(() => {
    if (localStorageAvailable && provider === "gemini" && geminiMessages.length > 0) {
      try {
        localStorage.setItem("console-chat-history", JSON.stringify(geminiMessages))
      } catch (error) {
        console.error("Failed to save chat history:", error)
      }
    }
  }, [geminiMessages, localStorageAvailable, provider])

  // Save provider settings when changed
  useEffect(() => {
    if (localStorageAvailable) {
      try {
        localStorage.setItem("console-chat-provider", provider)
      } catch (error) {
        console.error("Failed to save provider setting:", error)
      }
    }
  }, [provider, localStorageAvailable])

  // Save theme when changed
  useEffect(() => {
    if (localStorageAvailable) {
      try {
        localStorage.setItem("console-chat-theme", theme)
      } catch (error) {
        console.error("Failed to save theme setting:", error)
      }
    }
  }, [theme, localStorageAvailable])

  // Save command history
  useEffect(() => {
    if (localStorageAvailable && commandHistory.length > 0) {
      try {
        localStorage.setItem("console-chat-command-history", JSON.stringify(commandHistory))
      } catch (error) {
        console.error("Failed to save command history:", error)
      }
    }
  }, [commandHistory, localStorageAvailable])

  // Save models when changed
  useEffect(() => {
    if (localStorageAvailable) {
      try {
        localStorage.setItem("console-chat-openai-model", savedOpenaiModel)
        localStorage.setItem("console-chat-gemini-model", savedGeminiModel)
      } catch (error) {
        console.error("Failed to save model settings:", error)
      }
    }
  }, [savedOpenaiModel, savedGeminiModel, localStorageAvailable])

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages])

  // Show command suggestions when user types "/"
  useEffect(() => {
    const currentInput = provider === "openai" ? input : geminiInput
    if (currentInput.startsWith("/")) {
      setShowCommandSuggestions(true)
    } else {
      setShowCommandSuggestions(false)
    }
  }, [input, geminiInput, provider])

  // Handle keyboard navigation for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommandSuggestions) return // Let the suggestions component handle keys

    if (e.key === "ArrowUp" && commandHistory.length > 0) {
      e.preventDefault()
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
      setHistoryIndex(newIndex)
      if (provider === "openai") {
        setInput(commandHistory[newIndex] || "")
      } else {
        setGeminiInput(commandHistory[newIndex] || "")
      }
    } else if (e.key === "ArrowDown" && historyIndex >= 0) {
      e.preventDefault()
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      if (provider === "openai") {
        setInput(newIndex >= 0 ? commandHistory[newIndex] : "")
      } else {
        setGeminiInput(newIndex >= 0 ? commandHistory[newIndex] : "")
      }
    }
  }

  // Clear chat history
  const clearChatHistory = () => {
    if (localStorageAvailable) {
      try {
        localStorage.removeItem("console-chat-history")
        setMessages([])
        setGeminiMessages([])
      } catch (error) {
        console.error("Failed to clear chat history:", error)
      }
    } else {
      setMessages([])
      setGeminiMessages([])
    }
  }

  // Export chat as text
  const exportChat = () => {
    try {
      const chatText = displayMessages
        .map((msg) => `${msg.role === "user" ? "User" : msg.role === "system" ? "System" : "AI"}: ${msg.content}`)
        .join("\n\n")
      const blob = new Blob([chatText], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chat-export-${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export chat:", error)
    }
  }

  // Save Gemini API key
  const saveGeminiApiKey = () => {
    if (localStorageAvailable && geminiApiKey) {
      try {
        // Simple validation - just check if it's not empty
        if (geminiApiKey.trim().length < 10) {
          setGeminiMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: "API key seems too short. Please check your key and try again.",
              },
            ]
          })
          return
        }

        // Save the key without testing it first
        localStorage.setItem("console-chat-gemini-key", geminiApiKey)
        setSavedGeminiApiKey(geminiApiKey)
        setIsApiKeyValid(true) // Reset validation state
        setGeminiMessages((prevMessages) => {
          const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
          return [
            ...validPrevMessages,
            {
              id: Date.now().toString(),
              role: "system",
              content: `Gemini API key saved. The key will be used for future conversations.`,
            },
          ]
        })
      } catch (error) {
        console.error("Failed to save Gemini API key:", error)
        setGeminiMessages((prevMessages) => {
          const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
          return [
            ...validPrevMessages,
            {
              id: Date.now().toString(),
              role: "system",
              content: `Error saving API key: ${error.message}`,
            },
          ]
        })
      }
    }
  }

  // Save OpenAI API key
  const saveOpenaiApiKey = () => {
    if (localStorageAvailable && openaiApiKey) {
      try {
        // Simple validation - check if it starts with "sk-" and has sufficient length
        if (!openaiApiKey.startsWith("sk-") || openaiApiKey.length < 20) {
          setMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: "OpenAI API key should start with 'sk-' and be at least 20 characters long.",
              },
            ]
          })
          return
        }

        // Save the key without testing it first
        localStorage.setItem("console-chat-openai-key", openaiApiKey)
        setSavedOpenaiApiKey(openaiApiKey)
        setIsApiKeyValid(true) // Reset validation state
        setMessages((prevMessages) => {
          const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
          return [
            ...validPrevMessages,
            {
              id: Date.now().toString(),
              role: "system",
              content: `OpenAI API key saved. The key will be used for future conversations.`,
            },
          ]
        })
      } catch (error) {
        console.error("Failed to save OpenAI API key:", error)
        setMessages((prevMessages) => {
          const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
          return [
            ...validPrevMessages,
            {
              id: Date.now().toString(),
              role: "system",
              content: `Error saving API key: ${error.message}`,
            },
          ]
        })
      }
    }
  }

  // Save OpenAI model
  const saveOpenaiModel = () => {
    if (localStorageAvailable) {
      try {
        localStorage.setItem("console-chat-openai-model", openaiModel)
        setSavedOpenaiModel(openaiModel)
        setMessages((prevMessages) => {
          const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
          return [
            ...validPrevMessages,
            {
              id: Date.now().toString(),
              role: "system",
              content: `OpenAI model changed to ${openaiModels[openaiModel]}.`,
            },
          ]
        })
      } catch (error) {
        console.error("Failed to save OpenAI model:", error)
      }
    }
  }

  // Save Gemini model
  const saveGeminiModel = () => {
    if (localStorageAvailable) {
      try {
        localStorage.setItem("console-chat-gemini-model", geminiModel)
        setSavedGeminiModel(geminiModel)
        setGeminiMessages((prevMessages) => {
          const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
          return [
            ...validPrevMessages,
            {
              id: Date.now().toString(),
              role: "system",
              content: `Gemini model changed to ${geminiModels[geminiModel]}.`,
            },
          ]
        })
      } catch (error) {
        console.error("Failed to save Gemini model:", error)
      }
    }
  }

  // Clear API key
  const clearApiKey = () => {
    if (provider === "openai") {
      localStorage.removeItem("console-chat-openai-key")
      setOpenaiApiKey("")
      setSavedOpenaiApiKey("")
      setMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: Date.now().toString(),
            role: "system",
            content: `OpenAI API key cleared.`,
          },
        ]
      })
    } else {
      localStorage.removeItem("console-chat-gemini-key")
      setGeminiApiKey("")
      setSavedGeminiApiKey("")
      setGeminiMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Gemini API key cleared.`,
          },
        ]
      })
    }
  }

  // Save system prompt
  const saveSystemPrompt = () => {
    if (localStorageAvailable) {
      try {
        localStorage.setItem("console-chat-system-prompt", systemPrompt)
        setSavedSystemPrompt(systemPrompt)

        // Add message to the appropriate message list
        if (provider === "openai") {
          setMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: "System prompt updated. New conversations will use this prompt.",
              },
            ]
          })
        } else {
          setGeminiMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: "System prompt updated. New conversations will use this prompt.",
              },
            ]
          })
        }
      } catch (error) {
        console.error("Failed to save system prompt:", error)
      }
    }
  }

  // Reset system prompt to default
  const resetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
    if (localStorageAvailable) {
      try {
        localStorage.removeItem("console-chat-system-prompt")
        setSavedSystemPrompt("")

        // Add message to the appropriate message list
        if (provider === "openai") {
          setMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: "System prompt reset to default. New conversations will use the default prompt.",
              },
            ]
          })
        } else {
          setGeminiMessages((prevMessages) => {
            const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
            return [
              ...validPrevMessages,
              {
                id: Date.now().toString(),
                role: "system",
                content: "System prompt reset to default. New conversations will use the default prompt.",
              },
            ]
          })
        }
      } catch (error) {
        console.error("Failed to reset system prompt:", error)
      }
    }
  }

  // Handle command selection from suggestions
  const handleSelectCommand = (command: string) => {
    if (provider === "openai") {
      setInput(command)
    } else {
      setGeminiInput(command)
    }
    setShowCommandSuggestions(false)
  }

  // Custom Gemini submit handler
  const handleGeminiSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!geminiInput.trim()) return

    // Reset history index
    setHistoryIndex(-1)

    // Add to command history if not empty
    if (geminiInput.trim() && !commandHistory.includes(geminiInput)) {
      setCommandHistory([geminiInput, ...commandHistory.slice(0, 49)]) // Keep last 50 commands
    }

    // Process commands
    if (geminiInput.startsWith("/")) {
      const commandContext: CommandContext = {
        setMessages: setGeminiMessages,
        messages: geminiMessages,
        setShowSettings,
        setTheme,
        localStorageAvailable,
        clearChatHistory,
        exportChat,
      }

      const wasCommand = processCommand(geminiInput, commandContext)
      if (wasCommand) {
        setGeminiInput("")
        return
      }
    }

    // Check if API key is set before submitting
    if (!savedGeminiApiKey) {
      setGeminiMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: Date.now().toString(),
            role: "system",
            content: "Please set your Gemini API key in settings before sending messages.",
          },
        ]
      })
      setGeminiInput("")
      return
    }

    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: geminiInput,
    }

    setGeminiMessages((prevMessages) => {
      const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
      return [...validPrevMessages, userMessage]
    })
    setGeminiInput("")
    setIsGeminiLoading(true)

    try {
      // Ensure we have a valid messages array to send
      const currentMessages = Array.isArray(geminiMessages) ? [...geminiMessages, userMessage] : [userMessage]

      // Call our custom Gemini API endpoint
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: currentMessages,
          apiKey: savedGeminiApiKey,
          model: savedGeminiModel,
          systemPrompt: savedSystemPrompt || DEFAULT_SYSTEM_PROMPT,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response from Gemini")
      }

      // Add AI response to the chat
      setGeminiMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: data.id || Date.now().toString(),
            role: "assistant",
            content: data.text,
          },
        ]
      })
    } catch (error) {
      console.error("Error with Gemini API:", error)
      setGeminiMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Error: ${error.message || "Failed to get response from Gemini"}`,
          },
        ]
      })
    } finally {
      setIsGeminiLoading(false)
    }
  }

  // Custom submit handler to process commands
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Use the appropriate handler based on the provider
    if (provider === "gemini") {
      handleGeminiSubmit(e)
      return
    }

    if (!input.trim()) return

    // Reset history index
    setHistoryIndex(-1)

    // Add to command history if not empty
    if (input.trim() && !commandHistory.includes(input)) {
      setCommandHistory([input, ...commandHistory.slice(0, 49)]) // Keep last 50 commands
    }

    // Process commands
    if (input.startsWith("/")) {
      const commandContext: CommandContext = {
        setMessages,
        messages,
        setShowSettings,
        setTheme,
        localStorageAvailable,
        clearChatHistory,
        exportChat,
      }

      const wasCommand = processCommand(input, commandContext)
      if (wasCommand) {
        setInput("")
        return
      }
    }

    // Check if API key is set before submitting
    const hasApiKey = savedOpenaiApiKey || process.env.OPENAI_API_KEY
    if (!hasApiKey) {
      setMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: Date.now().toString(),
            role: "system",
            content: "Please set your OpenAI API key in settings before sending messages.",
          },
        ]
      })
      setInput("")
      return
    }

    // If not a command or command not found, proceed with normal submission
    try {
      handleSubmit(e)
    } catch (error) {
      console.error("Error submitting message:", error)
      setMessages((prevMessages) => {
        const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
        return [
          ...validPrevMessages,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Error: ${error.message || "Failed to submit message"}`,
          },
        ]
      })
    }
  }

  // Get current theme colors
  const currentTheme = getTheme(theme)

  // Simple dropdown component for model selection
  const renderModelSelector = (
    label: string,
    options: Record<string, string>,
    currentValue: string,
    onChange: (value: string) => void,
  ) => {
    return (
      <div className="mb-2">
        <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
          {label}
        </label>
        <select
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs p-1"
          style={{
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            border: `1px solid var(--border)`,
          }}
        >
          {Object.entries(options).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-screen p-4"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Terminal header */}
      <div className="pb-2 mb-4" style={{ borderBottom: `1px solid var(--border)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs ml-2">terminal — chatbot — 80×24</span>
          </div>
          <div className="flex items-center space-x-3">
            {localStorageAvailable && (
              <>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  style={{ color: "var(--foreground)" }}
                  className="hover:opacity-80 transition-opacity"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={clearChatHistory}
                  style={{ color: "var(--foreground)" }}
                  className="hover:opacity-80 transition-opacity"
                  title="Clear chat history"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={exportChat}
                  style={{ color: "var(--foreground)" }}
                  className="hover:opacity-80 transition-opacity"
                  title="Export chat"
                >
                  <Download size={16} />
                </button>
                <div style={{ color: "var(--muted)" }} className="text-xs">
                  <Save size={14} className="inline mr-1" />
                  {displayMessages.length > 0 ? "Saved" : "No history"}
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    color: "var(--foreground)",
                    border: `1px solid var(--border)`,
                  }}
                >
                  {provider === "openai" ? "OpenAI" : "Gemini"}
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded flex items-center"
                  style={{
                    color: "var(--foreground)",
                    border: `1px solid var(--border)`,
                  }}
                >
                  <Palette size={12} className="mr-1" />
                  {currentTheme.name}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="mb-4 p-4 rounded"
          style={{
            backgroundColor: "var(--background)",
            border: `1px solid var(--border)`,
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 style={{ color: "var(--accent)" }} className="text-sm">
              Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              style={{ color: "var(--foreground)" }}
              className="hover:opacity-80"
            >
              <X size={16} />
            </button>
          </div>

          {/* Theme selection */}
          <div className="mb-4">
            <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {(Object.keys(themes) as ThemeName[]).map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={`px-2 py-1 text-xs border rounded flex items-center justify-center ${
                    theme === themeName ? "opacity-100" : "opacity-60"
                  }`}
                  style={{
                    backgroundColor: themes[themeName].background,
                    color: themes[themeName].foreground,
                    borderColor: theme === themeName ? themes[themeName].accent : themes[themeName].border,
                  }}
                >
                  {themes[themeName].name}
                </button>
              ))}
            </div>
          </div>

          {/* System prompt */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label style={{ color: "var(--accent)" }} className="block text-xs">
                System Prompt
              </label>
              <button
                onClick={resetSystemPrompt}
                className="text-xs flex items-center"
                style={{ color: "var(--muted)" }}
                title="Reset to default"
              >
                <RefreshCw size={12} className="mr-1" />
                Reset
              </button>
            </div>
            <div className="flex flex-col space-y-2">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                className="w-full text-xs p-2 resize-none"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  border: `1px solid var(--border)`,
                }}
                placeholder="Enter custom system prompt..."
              />
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--muted)" }} className="text-xs">
                  {systemPrompt === savedSystemPrompt
                    ? savedSystemPrompt
                      ? "Custom prompt is active"
                      : "Using default prompt"
                    : "Unsaved changes"}
                </span>
                <button
                  onClick={saveSystemPrompt}
                  disabled={systemPrompt === savedSystemPrompt}
                  className="px-2 py-1 text-xs border disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--background)",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                  }}
                >
                  Save Prompt
                </button>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
              Model Provider
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setProvider("openai")}
                className={`px-2 py-1 text-xs border ${provider === "openai" ? "opacity-100" : "opacity-60"}`}
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  borderColor: provider === "openai" ? "var(--accent)" : "var(--border)",
                }}
              >
                OpenAI
              </button>
              <button
                onClick={() => setProvider("gemini")}
                className={`px-2 py-1 text-xs border ${provider === "gemini" ? "opacity-100" : "opacity-60"}`}
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  borderColor: provider === "gemini" ? "var(--accent)" : "var(--border)",
                }}
              >
                Gemini
              </button>
            </div>
          </div>

          {provider === "gemini" && (
            <>
              {/* Gemini Model Selection */}
              <div className="mb-3">
                <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
                  Gemini Model
                </label>
                {renderModelSelector("Select Model", geminiModels, geminiModel, (value) => {
                  setGeminiModel(value as GeminiModelType)
                  // Auto-save the model selection
                  if (localStorageAvailable) {
                    localStorage.setItem("console-chat-gemini-model", value)
                    setSavedGeminiModel(value as GeminiModelType)
                    setGeminiMessages((prevMessages) => {
                      const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
                      return [
                        ...validPrevMessages,
                        {
                          id: Date.now().toString(),
                          role: "system",
                          content: `Gemini model changed to ${geminiModels[value as GeminiModelType]}.`,
                        },
                      ]
                    })
                  }
                })}
              </div>

              <div className="mb-3">
                <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
                  Gemini API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter Gemini API key"
                    className="flex-1 text-xs p-1"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      border: `1px solid ${!isApiKeyValid && savedGeminiApiKey ? "var(--error)" : "var(--border)"}`,
                    }}
                  />
                  <button
                    onClick={saveGeminiApiKey}
                    disabled={!geminiApiKey}
                    className="px-2 py-1 text-xs border disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      borderColor: "var(--border)",
                    }}
                  >
                    Save
                  </button>
                  {savedGeminiApiKey && (
                    <button
                      onClick={clearApiKey}
                      className="px-2 py-1 text-xs border"
                      style={{
                        backgroundColor: "var(--background)",
                        color: "var(--error)",
                        borderColor: "var(--border)",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p
                  style={{ color: !isApiKeyValid && savedGeminiApiKey ? "var(--error)" : "var(--muted)" }}
                  className="text-xs mt-1"
                >
                  {!isApiKeyValid && savedGeminiApiKey
                    ? "API key may be invalid. Please check and update."
                    : savedGeminiApiKey
                      ? "API key is set"
                      : "No API key saved"}
                </p>
              </div>
            </>
          )}

          {provider === "openai" && (
            <>
              {/* OpenAI Model Selection */}
              <div className="mb-3">
                <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
                  OpenAI Model
                </label>
                {renderModelSelector("Select Model", openaiModels, openaiModel, (value) => {
                  setOpenaiModel(value as OpenAIModelType)
                  // Auto-save the model selection
                  if (localStorageAvailable) {
                    localStorage.setItem("console-chat-openai-model", value)
                    setSavedOpenaiModel(value as OpenAIModelType)
                    setMessages((prevMessages) => {
                      const validPrevMessages = Array.isArray(prevMessages) ? prevMessages : []
                      return [
                        ...validPrevMessages,
                        {
                          id: Date.now().toString(),
                          role: "system",
                          content: `OpenAI model changed to ${openaiModels[value as OpenAIModelType]}.`,
                        },
                      ]
                    })
                  }
                })}
              </div>

              <div className="mb-3">
                <label style={{ color: "var(--accent)" }} className="block text-xs mb-1">
                  OpenAI API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="Enter OpenAI API key"
                    className="flex-1 text-xs p-1"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      border: `1px solid ${!isApiKeyValid && savedOpenaiApiKey ? "var(--error)" : "var(--border)"}`,
                    }}
                  />
                  <button
                    onClick={saveOpenaiApiKey}
                    disabled={!openaiApiKey}
                    className="px-2 py-1 text-xs border disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      borderColor: "var(--border)",
                    }}
                  >
                    Save
                  </button>
                  {savedOpenaiApiKey && (
                    <button
                      onClick={clearApiKey}
                      className="px-2 py-1 text-xs border"
                      style={{
                        backgroundColor: "var(--background)",
                        color: "var(--error)",
                        borderColor: "var(--border)",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p
                  style={{ color: !isApiKeyValid && savedOpenaiApiKey ? "var(--error)" : "var(--muted)" }}
                  className="text-xs mt-1"
                >
                  {!isApiKeyValid && savedOpenaiApiKey
                    ? "API key may be invalid. Please check and update."
                    : savedOpenaiApiKey
                      ? "API key is set"
                      : process.env.OPENAI_API_KEY
                        ? "Using environment variable API key"
                        : "No API key saved"}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div
        className="flex-1 overflow-y-auto mb-4 scrollbar-thin"
        style={
          {
            "--scrollbar-track": "var(--scrollbar-track)",
            "--scrollbar-thumb": "var(--scrollbar-thumb)",
          } as React.CSSProperties
        }
      >
        {displayMessages.length === 0 ? (
          <div style={{ color: "var(--foreground)", opacity: 0.7 }} className="mb-4">
            <p>// ConsoleGPT v1.0.0</p>
            <p>// Type your message and press Enter</p>
            <p>// Type / to see available commands</p>
            <p>// Try /help to see all commands</p>
            <p>// Try /theme amber to change the theme</p>
            {localStorageAvailable ? (
              <p>// Chat history will be saved automatically</p>
            ) : (
              <p style={{ color: "var(--warning)" }}>// Warning: Local storage unavailable, history won't persist</p>
            )}
            <p className="mt-2">Ready...</p>
            {((provider === "gemini" && !savedGeminiApiKey) ||
              (provider === "openai" && !savedOpenaiApiKey && !process.env.OPENAI_API_KEY)) && (
              <p style={{ color: "var(--warning)" }} className="mt-2">
                // Warning: {provider === "gemini" ? "Gemini" : "OpenAI"} API key not set. Click settings to add your
                key.
              </p>
            )}
          </div>
        ) : (
          displayMessages.map((message) => (
            <div key={message.id} className="mb-4">
              <div style={{ color: "var(--accent)" }}>
                {message.role === "user" ? "> user:" : message.role === "system" ? "> system:" : "> ai:"}
              </div>
              <div className="pl-4 whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                {message.content}
              </div>
            </div>
          ))
        )}
        {(isLoading || isGeminiLoading) && (
          <div className="mb-4">
            <div style={{ color: "var(--accent)" }}>{"> ai:"}</div>
            <div className="pl-4 flex items-center" style={{ color: "var(--foreground)" }}>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4">
            <div style={{ color: "var(--error)" }}>{"> error:"}</div>
            <div className="pl-4" style={{ color: "var(--error)" }}>
              {errorMessage}
            </div>
            {provider === "openai" && (
              <div className="pl-4 mt-2">
                <button
                  onClick={() => reload()}
                  className="px-2 py-1 text-xs border"
                  style={{
                    backgroundColor: "var(--background)",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleFormSubmit} className="pt-4 relative" style={{ borderTop: `1px solid var(--border)` }}>
        <div className="flex items-center">
          <span style={{ color: "var(--foreground)" }} className="mr-2">
            {">"}
          </span>
          <div className="flex-1 relative">
            {provider === "openai" ? (
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message or / for commands..."
                className="w-full outline-none"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--foreground)",
                  caretColor: "var(--foreground)",
                }}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={geminiInput}
                onChange={(e) => setGeminiInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message or / for commands..."
                className="w-full outline-none"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--foreground)",
                  caretColor: "var(--foreground)",
                }}
                autoFocus
              />
            )}
            <CommandSuggestions
              input={provider === "openai" ? input : geminiInput}
              onSelectCommand={handleSelectCommand}
              visible={showCommandSuggestions}
            />
          </div>
          <span
            className={`h-5 w-2 ${cursorVisible ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundColor: "var(--foreground)" }}
          ></span>
        </div>
      </form>
    </div>
  )
}
