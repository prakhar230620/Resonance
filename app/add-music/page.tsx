"use client"

export const dynamic = "force-dynamic"

import nextDynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const FolderPicker = nextDynamic(() => import("@/components/folder-picker").then(m => m.FolderPicker), {
  ssr: false,
  loading: () => null,
})

export default function AddMusicPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="safe-area-top px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Add Music</h1>
            <p className="text-sm text-muted-foreground">Import your local audio files</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        <FolderPicker />
      </main>
    </div>
  )
}
