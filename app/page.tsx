"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Play, Music, FolderOpen, Settings, Search, Home, Library, Headphones, Download, Sparkles } from "lucide-react"
import { NowPlaying } from "@/components/now-playing"
import { Settings as SettingsPanel } from "@/components/settings"
import { getSavedFolders } from "@/lib/folder-access"
import { usePlayerStore } from "@/lib/stores/player-store"
import { useLibraryStore } from "@/lib/stores/library-store"
import Link from "next/link"

export default function HomePage() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const { currentTrack } = usePlayerStore()
  const { stats } = useLibraryStore()
  const [hasSavedFolders, setHasSavedFolders] = useState<boolean | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    // Detect if user has saved folders for onboarding
    ;(async () => {
      try {
        const folders = await getSavedFolders()
        setHasSavedFolders(folders.length > 0)
      } catch {
        setHasSavedFolders(false)
      }
    })()
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setIsInstallable(false)
      setDeferredPrompt(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="safe-area-top px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-lg">
              <Headphones className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold premium-gradient-text">Resonance</h1>
              <p className="text-sm text-muted-foreground">Premium Music Experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-32">
        {isInstallable && (
          <Card className="p-6 mb-8 premium-gradient text-white border-0 shadow-xl premium-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Install Resonance</h3>
                  <p className="text-white/80">Get the premium app experience</p>
                </div>
              </div>
              <Button onClick={handleInstall} variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Install
              </Button>
            </div>
          </Card>
        )}

        {hasSavedFolders === false && (
          <Card className="p-6 mb-8 border-2 premium-scale-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Add your Music Folder</h3>
                  <p className="text-muted-foreground">
                    Grant access to your Music folder so we can scan and build your library automatically.
                  </p>
                </div>
              </div>
              <Link href="/add-music">
                <Button className="rounded-xl">Add Folder</Button>
              </Link>
            </div>
          </Card>
        )}

        {stats.totalTracks > 0 && (
          <Card className="p-6 mb-8 premium-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="font-bold text-lg">Your Music Library</h3>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold premium-gradient-text">{stats.totalTracks}</p>
                <p className="text-sm text-muted-foreground">Songs</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold premium-gradient-text">{stats.totalArtists}</p>
                <p className="text-sm text-muted-foreground">Artists</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold premium-gradient-text">{stats.totalAlbums}</p>
                <p className="text-sm text-muted-foreground">Albums</p>
              </div>
            </div>
          </Card>
        )}

        <div className="text-center mb-10">
          <div className="w-32 h-32 premium-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Music className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Welcome to Resonance</h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
            Your premium music player that works entirely offline. Experience music like never before.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          <Link href="/add-music">
            <Button
              className="w-full h-16 text-left justify-start gap-4 premium-gradient hover:opacity-90 transition-all duration-200 shadow-lg"
              size="lg"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg text-white">Add Music Folder</div>
                <div className="text-sm text-white/80">Browse and select your music collection</div>
              </div>
            </Button>
          </Link>

          {stats.totalTracks > 0 && (
            <Link href="/library">
              <Button
                variant="outline"
                className="w-full h-16 text-left justify-start gap-4 bg-card hover:bg-muted transition-all duration-200 border-2"
                size="lg"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Library className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-lg">Browse Your Library</div>
                  <div className="text-sm text-muted-foreground">Explore your music collection</div>
                </div>
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 text-center hover:shadow-lg transition-all duration-200 premium-scale-in">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-sm mb-1">Offline First</h3>
            <p className="text-xs text-muted-foreground">Works without internet</p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-all duration-200 premium-scale-in">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Headphones className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-bold text-sm mb-1">High Quality</h3>
            <p className="text-xs text-muted-foreground">Supports all formats</p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-all duration-200 premium-scale-in">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Library className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-sm mb-1">Smart Library</h3>
            <p className="text-xs text-muted-foreground">Auto-organized</p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-all duration-200 premium-scale-in">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-bold text-sm mb-1">Premium Feel</h3>
            <p className="text-xs text-muted-foreground">Luxurious experience</p>
          </Card>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around py-3">
          <Button variant="ghost" size="sm" className="flex-col gap-1 h-auto py-3 text-primary rounded-xl">
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Button>

          <Link href="/library">
            <Button variant="ghost" size="sm" className="flex-col gap-1 h-auto py-3 rounded-xl">
              <Search className="w-5 h-5" />
              <span className="text-xs">Search</span>
            </Button>
          </Link>

          <Link href="/library">
            <Button variant="ghost" size="sm" className="flex-col gap-1 h-auto py-3 rounded-xl">
              <Library className="w-5 h-5" />
              <span className="text-xs">Library</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="flex-col gap-1 h-auto py-3 rounded-xl"
            onClick={() => usePlayerStore.getState().setNowPlayingOpen(true)}
            disabled={!currentTrack}
          >
            <Play className="w-5 h-5" />
            <span className="text-xs">Now Playing</span>
          </Button>
        </div>
      </nav>

      {/* Now Playing Component */}
      <NowPlaying />

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
