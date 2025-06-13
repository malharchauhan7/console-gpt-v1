import type { Message } from "ai"
import type { ThemeName } from "./themes"
import { themes } from "./themes"

export type CommandHandler = (args: string, context: CommandContext) => void | Promise<void>

export interface CommandContext {
  setMessages: (messages: Message[]) => void
  messages: Message[]
  setShowSettings: (show: boolean) => void
  setTheme: (theme: ThemeName) => void
  localStorageAvailable: boolean
  clearChatHistory: () => void
  exportChat: () => void
}

export interface Command {
  name: string
  description: string
  handler: CommandHandler
  usage?: string
  examples?: string[]
}

export const commands: Record<string, Command> = {
  clear: {
    name: "clear",
    description: "Clear the chat history",
    handler: (_, { clearChatHistory }) => {
      clearChatHistory()
    },
  },
  help: {
    name: "help",
    description: "Show available commands",
    handler: (_, { setMessages, messages }) => {
      const helpText = `Available commands:
${Object.values(commands)
  .map((cmd) => `/${cmd.name} - ${cmd.description}`)
  .join("\n")}

Type / to see command suggestions.`

      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          role: "system",
          content: helpText,
        },
      ])
    },
  },
  settings: {
    name: "settings",
    description: "Open settings panel",
    handler: (_, { setShowSettings }) => {
      setShowSettings(true)
    },
  },
  theme: {
    name: "theme",
    description: "Change the theme (matrix, amber, blue, monochrome, hacker)",
    usage: "/theme [theme-name]",
    examples: ["/theme amber", "/theme matrix"],
    handler: (args, { setTheme, setMessages, messages }) => {
      const themeName = args.trim()

      // If no theme name provided, show available themes
      if (!themeName) {
        const availableThemes = Object.keys(themes).join(", ")
        setMessages([
          ...messages,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Please specify a theme name. Available themes: ${availableThemes}`,
          },
        ])
        return
      }

      // Check if the theme exists in our themes object
      if (!(themeName in themes)) {
        const availableThemes = Object.keys(themes).join(", ")
        setMessages([
          ...messages,
          {
            id: Date.now().toString(),
            role: "system",
            content: `Invalid theme name: "${themeName}". Available themes: ${availableThemes}`,
          },
        ])
        return
      }

      // Apply the theme
      setTheme(themeName as ThemeName)
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          role: "system",
          content: `Theme changed to ${themeName}`,
        },
      ])
    },
  },
  export: {
    name: "export",
    description: "Export chat history as text",
    handler: (_, { exportChat }) => {
      exportChat()
    },
  },
}

export const processCommand = (input: string, context: CommandContext): boolean => {
  if (!input.startsWith("/")) return false

  const spaceIndex = input.indexOf(" ")
  const commandName = spaceIndex > 0 ? input.slice(1, spaceIndex) : input.slice(1)
  const args = spaceIndex > 0 ? input.slice(spaceIndex + 1) : ""

  const command = commands[commandName]
  if (!command) {
    context.setMessages([
      ...context.messages,
      {
        id: Date.now().toString(),
        role: "system",
        content: `Unknown command: ${commandName}. Type /help to see available commands.`,
      },
    ])
    return true
  }

  command.handler(args, context)
  return true
}
