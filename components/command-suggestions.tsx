"use client"

import { useState, useEffect, useRef } from "react"
import { commands } from "@/lib/commands"

interface CommandSuggestionsProps {
  input: string
  onSelectCommand: (command: string) => void
  visible: boolean
}

export function CommandSuggestions({ input, onSelectCommand, visible }: CommandSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Filter commands based on input
  const filteredCommands = Object.values(commands).filter((cmd) =>
    input.length <= 1 ? true : cmd.name.startsWith(input.slice(1)),
  )

  // Reset selected index when input changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [input])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
          break
        case "Tab":
        case "Enter":
          if (filteredCommands.length > 0) {
            e.preventDefault()
            onSelectCommand(`/${filteredCommands[selectedIndex].name}`)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [visible, filteredCommands, selectedIndex, onSelectCommand])

  // Scroll selected item into view
  useEffect(() => {
    if (visible && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex, visible])

  if (!visible || filteredCommands.length === 0) return null

  return (
    <div
      ref={suggestionsRef}
      className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto rounded"
      style={{
        backgroundColor: "var(--background)",
        border: "1px solid var(--border)",
        zIndex: 10,
      }}
    >
      {filteredCommands.map((command, index) => (
        <div
          key={command.name}
          data-index={index}
          className="px-2 py-1 cursor-pointer"
          style={{
            backgroundColor: index === selectedIndex ? "var(--muted)" : "transparent",
            color: "var(--foreground)",
          }}
          onClick={() => onSelectCommand(`/${command.name}`)}
        >
          <div className="flex justify-between">
            <span style={{ color: "var(--accent)" }}>/{command.name}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.8em" }}>{command.usage || ""}</span>
          </div>
          <div style={{ fontSize: "0.8em", color: "var(--muted)" }}>{command.description}</div>
        </div>
      ))}
    </div>
  )
}
