// Define theme types and color schemes
export type ThemeName = "matrix" | "amber" | "blue" | "monochrome" | "hacker"

export interface Theme {
  name: string
  background: string
  foreground: string
  accent: string
  muted: string
  border: string
  success: string
  warning: string
  error: string
  scrollbarTrack: string
  scrollbarThumb: string
}

export const themes: Record<ThemeName, Theme> = {
  matrix: {
    name: "Matrix Green",
    background: "#000000",
    foreground: "#00ff00",
    accent: "#00cc00",
    muted: "#005500",
    border: "#003300",
    success: "#00ff00",
    warning: "#ffcc00",
    error: "#ff0000",
    scrollbarTrack: "#111111",
    scrollbarThumb: "#1b4332",
  },
  amber: {
    name: "Amber Terminal",
    background: "#0D0D0D",
    foreground: "#FFB000",
    accent: "#CC8800",
    muted: "#664400",
    border: "#332200",
    success: "#00cc00",
    warning: "#ffcc00",
    error: "#ff0000",
    scrollbarTrack: "#111111",
    scrollbarThumb: "#664400",
  },
  blue: {
    name: "Blue Screen",
    background: "#000033",
    foreground: "#33ccff",
    accent: "#0099cc",
    muted: "#004466",
    border: "#002233",
    success: "#00cc00",
    warning: "#ffcc00",
    error: "#ff0000",
    scrollbarTrack: "#000044",
    scrollbarThumb: "#0066cc",
  },
  monochrome: {
    name: "Monochrome",
    background: "#000000",
    foreground: "#ffffff",
    accent: "#aaaaaa",
    muted: "#555555",
    border: "#333333",
    success: "#ffffff",
    warning: "#aaaaaa",
    error: "#ffffff",
    scrollbarTrack: "#111111",
    scrollbarThumb: "#444444",
  },
  hacker: {
    name: "Hacker",
    background: "#0D0208",
    foreground: "#3BF527",
    accent: "#08FF08",
    muted: "#0D5901",
    border: "#052401",
    success: "#3BF527",
    warning: "#F5A70A",
    error: "#F51414",
    scrollbarTrack: "#111111",
    scrollbarThumb: "#0D5901",
  },
}

export const getTheme = (themeName: ThemeName): Theme => {
  return themes[themeName] || themes.matrix
}
