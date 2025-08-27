"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Play, Pause, MoreHorizontal, Heart, ListPlus, Share, Trash2 } from "lucide-react"
import type { Track } from "@/lib/stores/player-store"
import { usePlayerStore } from "@/lib/stores/player-store"
import { useLibraryStore } from "@/lib/stores/library-store"
import { cn } from "@/lib/utils"
import { verifyPermission } from "@/lib/folder-access"
import { toast } from "@/hooks/use-toast"

interface TrackListProps {
  tracks: Track[]
  showArtwork?: boolean
  showAlbum?: boolean
  showArtist?: boolean
  showDuration?: boolean
  onTrackSelect?: (track: Track, index: number) => void
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function TrackList({
  tracks,
  showArtwork = true,
  showAlbum = true,
  showArtist = true,
  showDuration = true,
  onTrackSelect,
}: TrackListProps) {
  const { currentTrack, isPlaying, setQueue } = usePlayerStore()
  const { removeTrack } = useLibraryStore()
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)

  const handleTrackPlay = (track: Track, index: number) => {
    if (onTrackSelect) {
      onTrackSelect(track, index)
    } else {
      setQueue(tracks, index)
    }
  }

  const removeFromLibraryOnly = (track: Track) => {
    useLibraryStore.getState().removeTrack(track.id)
    toast({ title: "Removed", description: `${track.title} removed from library` })
  }

  const deleteFromDisk = async (track: Track) => {
    try {
      if (!track.fileParentDir || !track.filePath) {
        toast({ title: "Cannot delete", description: "No file handle available for this track", variant: "destructive" })
        return
      }
      const name = track.filePath.split("/").pop() || track.title
      const ok = typeof window !== "undefined" && window.confirm(`Delete ${name} from disk? This cannot be undone.`)
      if (!ok) return

      const hasPerm = await verifyPermission(track.fileParentDir, "readwrite")
      if (!hasPerm) {
        toast({ title: "Permission denied", description: "Cannot delete without permission", variant: "destructive" })
        return
      }
      // @ts-ignore removeEntry exists on FS directory handle
      await (track.fileParentDir as any).removeEntry(name)
      useLibraryStore.getState().removeTrack(track.id)
      toast({ title: "Deleted", description: `${name} removed from library and disk` })
    } catch (e: any) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" })
    }
  }

  const shareTrack = async (track: Track) => {
    try {
      if (!navigator.share || !track.fileHandle) {
        toast({ title: "Share not available", description: "Your browser does not support sharing this file" })
        return
      }
      const file = await track.fileHandle.getFile()
      const data: any = { title: track.title, files: [file] }
      if ((navigator as any).canShare && !(navigator as any).canShare(data)) {
        toast({ title: "Cannot share", description: "This file cannot be shared on your device" })
        return
      }
      await navigator.share(data)
    } catch (e: any) {
      toast({ title: "Share failed", description: String(e), variant: "destructive" })
    }
  }

  const isCurrentTrack = (track: Track) => currentTrack?.id === track.id

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => (
        <Card
          key={track.id}
          className={cn(
            "p-3 cursor-pointer transition-colors hover:bg-muted/50",
            isCurrentTrack(track) && "bg-primary/10 border-primary/20",
          )}
          onClick={() => handleTrackPlay(track, index)}
        >
          <div className="flex items-center gap-3">
            {/* Artwork */}
            {showArtwork && (
              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {track.artwork ? (
                  <img
                    src={track.artwork || "/placeholder.svg"}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <div className="w-6 h-6 bg-primary/20 rounded" />
                  </div>
                )}
              </div>
            )}

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className={cn("font-semibold text-sm truncate", isCurrentTrack(track) && "text-primary")}>
                {track.title}
              </h3>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {showArtist && (
                  <>
                    <span className="truncate">{track.artist}</span>
                    {showAlbum && <span>•</span>}
                  </>
                )}
                {showAlbum && <span className="truncate">{track.album}</span>}
              </div>
            </div>

            {/* Duration */}
            {showDuration && (
              <div className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(track.duration)}</div>
            )}

            {/* Play/Pause Button */}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                if (isCurrentTrack(track)) {
                  usePlayerStore.getState().togglePlayPause()
                } else {
                  handleTrackPlay(track, index)
                }
              }}
            >
              {isCurrentTrack(track) && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Heart className="w-4 h-4 mr-2" />
                  Add to Favorites
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ListPlus className="w-4 h-4 mr-2" />
                  Add to Playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); shareTrack(track) }}>
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {track.fileParentDir ? (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteFromDisk(track) }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete from Device
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); removeFromLibraryOnly(track) }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Library
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  )
}
