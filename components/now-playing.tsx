"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ChevronDown,
  X,
  Headphones,
  ListPlus,
  Heart,
  ListMusic,
  Settings,
  Sliders,
} from "lucide-react"
import { usePlayerStore } from "@/lib/stores/player-store"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { cn } from "@/lib/utils"
import { QueueManager } from "./queue-manager"
import { Settings as SettingsPanel } from "./settings"
import { useLibraryStore } from "@/lib/stores/library-store"
import { toast } from "@/hooks/use-toast"
import { Equalizer } from "./equalizer"

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function triggerHaptic(type: "light" | "medium" | "heavy" = "light") {
  if ("vibrate" in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    }
    navigator.vibrate(patterns[type])
  }
}

export function NowPlaying() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    isNowPlayingOpen,
    setNowPlayingOpen,
    setQueueOpen,
    isMiniPlayerHidden,
    setMiniPlayerHidden,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore()

  const { togglePlayPause, next, previous, seek, setVolume, toggleMute } = useAudioPlayer()
  const { toggleFavorite, isFavorite } = useLibraryStore()

  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showEqualizer, setShowEqualizer] = useState(false)
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null)
  const [isSwipeActive, setIsSwipeActive] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  // Auto-unhide mini player when playback starts or track changes
  useEffect(() => {
    if (isMiniPlayerHidden && currentTrack && !isNowPlayingOpen) {
      setMiniPlayerHidden(false)
    }
  }, [currentTrack?.id, isPlaying])

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setSwipeStart({ x: touch.clientX, y: touch.clientY })
    setIsSwipeActive(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - swipeStart.x
    const deltaY = touch.clientY - swipeStart.y

    // Only activate swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      setIsSwipeActive(true)
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStart || !isSwipeActive) {
      setSwipeStart(null)
      setIsSwipeActive(false)
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - swipeStart.x

    if (Math.abs(deltaX) > 100) {
      triggerHaptic("medium")
      if (deltaX > 0) {
        previous()
      } else {
        next()
      }
    }

    setSwipeStart(null)
    setIsSwipeActive(false)
  }

  const handleSeekChange = (value: number[]) => {
    const time = value[0]
    setDragTime(time)
    if (!isDragging) {
      setIsDragging(true)
      triggerHaptic("light")
    }
  }

  const handleSeekCommit = (value: number[]) => {
    const time = value[0]
    seek(time)
    setIsDragging(false)
    triggerHaptic("medium")
  }

  const handlePlayPause = () => {
    triggerHaptic("medium")
    togglePlayPause()
  }

  const handleNext = () => {
    triggerHaptic("light")
    next()
  }

  const handlePrevious = () => {
    triggerHaptic("light")
    previous()
  }

  const handleToggleShuffle = () => {
    triggerHaptic("light")
    toggleShuffle()
  }

  const handleToggleRepeat = () => {
    triggerHaptic("light")
    toggleRepeat()
  }

  const displayTime = isDragging ? dragTime : currentTime
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0

  if (!currentTrack) {
    return null
  }

  return (
    <>
      {/* Mini Player */}
      {!isNowPlayingOpen && !isMiniPlayerHidden && (
        <Card
          className="fixed left-4 right-4 p-3 bg-card/95 backdrop-blur-sm border-border/50 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            // Place the mini player above the bottom nav (approx 64px) + safe area + small gap
            bottom: `calc(88px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 60,
          }}
          onClick={() => {
            triggerHaptic("light")
            setNowPlayingOpen(true)
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden transition-transform duration-200">
              {currentTrack.artwork ? (
                <img
                  src={currentTrack.artwork || "/placeholder.svg"}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 bg-primary/20 rounded animate-pulse" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate transition-colors duration-200">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>

            {/* Hide mini player */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setMiniPlayerHidden(true)
              }}
              className="w-9 h-9 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <X className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handlePlayPause()
              }}
              className="w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </Card>
      )}

      {/* Restore button when mini player is hidden */}
      {!isNowPlayingOpen && isMiniPlayerHidden && (
        <Button
          variant="secondary"
          className="fixed right-4 px-3 py-2 rounded-full shadow-md bg-card/95 backdrop-blur-sm border border-border/50 text-xs"
          style={{
            bottom: `calc(88px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 50,
          }}
          onClick={() => setMiniPlayerHidden(false)}
        >
          <Headphones className="w-4 h-4 mr-2" /> Show mini player
        </Button>
      )}

      {/* Full Screen Player */}
      {isNowPlayingOpen && (
        <div
          ref={playerRef}
          className="fixed inset-0 bg-background z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 safe-area-top">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                triggerHaptic("light")
                setNowPlayingOpen(false)
              }}
              className="transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <ChevronDown className="w-6 h-6" />
            </Button>

            <div className="text-center">
              <p className="text-sm font-medium">Now Playing</p>
              <p className="text-xs text-muted-foreground">From Library</p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                triggerHaptic("light")
                setShowSettings(true)
              }}
              className="transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>

          {/* Album Art */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-sm aspect-square bg-muted rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-3xl">
              {currentTrack.artwork ? (
                <img
                  src={currentTrack.artwork || "/placeholder.svg"}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="w-24 h-24 bg-primary/20 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div className="px-6 pb-4">
            <h1 className="text-2xl font-bold text-center mb-1 text-balance animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              {currentTrack.title}
            </h1>
            <p className="text-lg text-muted-foreground text-center mb-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-100">
              {currentTrack.artist}
            </p>

            {/* Progress */}
            <div className="space-y-2 mb-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-200">
              <Slider
                value={[displayTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeekChange}
                onValueCommit={handleSeekCommit}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="transition-all duration-200">{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-300">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="w-12 h-12 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <SkipBack className="w-6 h-6" />
              </Button>

              <Button
                size="icon"
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="w-12 h-12 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-center gap-4 mb-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-400">
              {/* Shuffle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleShuffle}
                className={cn(
                  "w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95",
                  isShuffled && "text-primary bg-primary/10",
                )}
              >
                <Shuffle className="w-5 h-5" />
              </Button>

              {/* Favorite */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95",
                  isFavorite(currentTrack.id) && "text-red-500",
                )}
                onClick={() => {
                  triggerHaptic("light")
                  toggleFavorite(currentTrack.id)
                  const fav = isFavorite(currentTrack.id)
                  toast({ title: fav ? "Added to Favorites" : "Removed from Favorites", description: currentTrack.title })
                }}
              >
                <Heart className="w-5 h-5" />
              </Button>

              {/* Add to Playlist */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic("light")
                  const state = useLibraryStore.getState()
                  const playlistEntries = Object.values(state.playlists || {})
                  let chosenId: string | null = null
                  if (playlistEntries.length === 0) {
                    const name = typeof window !== "undefined" ? window.prompt("Create new playlist name:") : null
                    if (!name) return
                    chosenId = state.createPlaylist(name)
                  } else {
                    const list = playlistEntries.map((p, i) => `${i + 1}. ${p.name}`).join("\n")
                    const choice = typeof window !== "undefined" ? window.prompt(`Select playlist by number or type new name:\n${list}`) : null
                    if (!choice) return
                    const index = Number(choice)
                    if (!Number.isNaN(index) && index >= 1 && index <= playlistEntries.length) {
                      chosenId = playlistEntries[index - 1].id
                    } else {
                      chosenId = state.createPlaylist(choice)
                    }
                  }
                  if (chosenId) {
                    state.addToPlaylist(chosenId, [currentTrack.id])
                    toast({ title: "Added to playlist", description: `${currentTrack.title} added successfully` })
                  }
                }}
                className="w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <ListPlus className="w-5 h-5" />
              </Button>

              {/* Equalizer */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic("light")
                  setShowEqualizer(true)
                }}
                className="w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Sliders className="w-5 h-5" />
              </Button>

              {/* Queue */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic("light")
                  setQueueOpen(true)
                }}
                className="w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <ListMusic className="w-5 h-5" />
              </Button>

              {/* Repeat */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleRepeat}
                className={cn(
                  "w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95",
                  repeatMode !== "off" && "text-primary bg-primary/10",
                )}
              >
                {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 safe-area-bottom animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-500">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic("light")
                  toggleMute()
                }}
                className="w-8 h-8 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => {
                  triggerHaptic("light")
                  setVolume(value[0] / 100)
                }}
                className="flex-1"
              />
            </div>
          </div>

          {isSwipeActive && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium animate-in fade-in-50 zoom-in-95 duration-200">
              Swipe to change track
            </div>
          )}
        </div>
      )}

      {/* Queue Manager */}
      <QueueManager />

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Equalizer Panel */}
      {showEqualizer && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border safe-area-top">
            <Button variant="ghost" size="icon" onClick={() => setShowEqualizer(false)}>
              <ChevronDown className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Audio Effects</h1>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <Equalizer
              onBandChange={async (band, gain) => {
                try {
                  const mod = await import("@/lib/audio-engine")
                  const engine = mod.getAudioEngine()
                  engine.setEqualizerBand(band, gain)
                } catch (e) {
                  console.warn("Failed to set EQ band:", e)
                }
              }}
              onPresetChange={async (preset) => {
                try {
                  const mod = await import("@/lib/audio-engine")
                  const engine = mod.getAudioEngine()
                  engine.setEqualizerPreset(preset)
                } catch (e) {
                  console.warn("Failed to set EQ preset:", e)
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
