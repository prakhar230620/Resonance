"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { LibraryView } from "@/components/library-view"
import { useLibraryStore } from "@/lib/stores/library-store"

export default function LibraryPage() {
  const searchParams = useSearchParams()
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery)

  useEffect(() => {
    const q = searchParams.get("search") || ""
    setSearchQuery(q)
  }, [searchParams, setSearchQuery])

  return (
    <div className="min-h-screen bg-background">
      <LibraryView />
    </div>
  )
}
