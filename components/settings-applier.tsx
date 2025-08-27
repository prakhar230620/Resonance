"use client"

import { useEffect } from "react"
import { useSettingsStore } from "@/lib/stores/settings-store"

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = theme === "dark" || (theme === "system" && prefersDark)
  // Toggle class on <html> to align with Tailwind dark mode
  root.classList.toggle("dark", isDark)
}

function applyAccent(accent: string) {
  // Expose as data attribute for CSS to hook if desired
  document.documentElement.setAttribute("data-accent", accent)
}

function applyCompact(compact: boolean) {
  document.body.classList.toggle("compact", compact)
}

export function SettingsApplier() {
  const theme = useSettingsStore((s) => s.theme)
  const accent = useSettingsStore((s) => s.accentColor)
  const compact = useSettingsStore((s) => s.compactMode)
  const artworkSize = useSettingsStore((s) => s.artworkSize)
  const showVisualizer = useSettingsStore((s) => s.showVisualizer)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  useEffect(() => {
    applyCompact(compact)
  }, [compact])

  useEffect(() => {
    // Map artwork sizes to a CSS variable consumers can use (e.g., width/height)
    const root = document.documentElement
    const sizePx = artworkSize === "small" ? 48 : artworkSize === "large" ? 96 : 72
    root.style.setProperty("--artwork-size", `${sizePx}px`)
    root.setAttribute("data-artwork-size", artworkSize)
  }, [artworkSize])

  useEffect(() => {
    document.documentElement.setAttribute("data-show-visualizer", String(showVisualizer))
  }, [showVisualizer])

  // No UI
  return null
}
