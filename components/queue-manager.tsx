"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, X, GripVertical, Shuffle, RotateCcw, Trash2, Music, ChevronDown } from "lucide-react"
import { usePlayerStore } from "@/lib/stores/player-store"
import { cn } from "@/lib/utils"

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function QueueManager() {
  const {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    isQueueOpen,
    setQueueOpen,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    isShuffled,
  } = usePlayerStore()

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    // TODO: Implement queue reordering in store
    console.log("Move track from", draggedIndex, "to", dropIndex)
    setDraggedIndex(null)
  }

  const handleTrackPlay = (index: number) => {
    // TODO: Implement jump to track in queue
    console.log("Jump to track", index)
  }

  if (!isQueueOpen) return null

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border safe-area-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setQueueOpen(false)}>
            <ChevronDown className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="font-semibold">Queue</h2>
            <p className="text-sm text-muted-foreground">{queue.length} songs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleShuffle} className={cn(isShuffled && "text-primary")}>
            <Shuffle className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={clearQueue}>
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-hidden">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Music className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No songs in queue</h3>
            <p className="text-muted-foreground">Add songs to start playing</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {/* Now Playing */}
              {currentTrack && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Now Playing</h3>
                  <Card className="p-3 bg-primary/10 border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {currentTrack.artwork ? (
                          <img
                            src={currentTrack.artwork || "/placeholder.svg"}
                            alt={currentTrack.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <div className="w-6 h-6 bg-primary/20 rounded" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate text-primary">{currentTrack.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                      </div>

                      <div className="text-xs text-muted-foreground">{formatDuration(currentTrack.duration)}</div>

                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Up Next */}
              {queue.length > currentIndex + 1 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Up Next</h3>
                  <div className="space-y-1">
                    {queue.slice(currentIndex + 1).map((track, index) => {
                      const actualIndex = currentIndex + 1 + index
                      return (
                        <Card
                          key={`${track.id}-${actualIndex}`}
                          className="p-3 cursor-pointer hover:bg-muted/50"
                          draggable
                          onDragStart={(e) => handleDragStart(e, actualIndex)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, actualIndex)}
                          onClick={() => handleTrackPlay(actualIndex)}
                        >
                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="w-6 h-6 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4" />
                            </Button>

                            <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              {track.artwork ? (
                                <img
                                  src={track.artwork || "/placeholder.svg"}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                  <div className="w-4 h-4 bg-primary/20 rounded" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                            </div>

                            <div className="text-xs text-muted-foreground">{formatDuration(track.duration)}</div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFromQueue(actualIndex)
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Previously Played */}
              {currentIndex > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Previously Played</h3>
                  <div className="space-y-1">
                    {queue.slice(0, currentIndex).map((track, index) => (
                      <Card
                        key={`${track.id}-${index}`}
                        className="p-3 cursor-pointer hover:bg-muted/50 opacity-60"
                        onClick={() => handleTrackPlay(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {track.artwork ? (
                              <img
                                src={track.artwork || "/placeholder.svg"}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <div className="w-4 h-4 bg-primary/20 rounded" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                          </div>

                          <div className="text-xs text-muted-foreground">{formatDuration(track.duration)}</div>

                          <Button variant="ghost" size="icon" className="w-8 h-8">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
