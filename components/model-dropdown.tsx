"use client"

interface ModelDropdownProps {
  value: string
  onChange: (value: string) => void
  options: Record<string, string>
  onSave: () => void
  isSaved: boolean
}

export function ModelDropdown({ value, onChange, options, onSave, isSaved }: ModelDropdownProps) {
  return (
    <div className="flex space-x-2 items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-xs p-1"
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
      <button
        onClick={(e) => {
          e.preventDefault()
          onSave()
        }}
        disabled={isSaved}
        className="px-2 py-1 text-xs border disabled:opacity-50"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          borderColor: "var(--border)",
        }}
      >
        Save
      </button>
    </div>
  )
}
