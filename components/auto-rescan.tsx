"use client"

import { useEffect } from "react"
import { scanSavedFolders } from "@/lib/scanner"
import { useLibraryStore } from "@/lib/stores/library-store"
import { useSettingsStore } from "@/lib/stores/settings-store"

export function AutoRescan() {
  const { isScanning } = useLibraryStore()
  const autoScan = useSettingsStore((s) => s.autoScan)

  useEffect(() => {
    if (!autoScan) return
    let cancelled = false

    async function run() {
      await scanSavedFolders()
    }

    run()
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled && !isScanning) {
        scanSavedFolders()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [isScanning, autoScan])

  return null
}
