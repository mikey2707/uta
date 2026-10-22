import React, { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export const ColorModeToggle = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme")
      if (stored) return stored === "dark"
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return true
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      aria-label="Toggle theme"
      className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 shadow-lg hover:scale-105 active:scale-95 transition-all"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600" />
      )}
    </button>
  )
}

export default ColorModeToggle
