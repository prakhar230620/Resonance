"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, GripVertical, MoveUp, MoveDown, Trash2, Music } from "lucide-react"
import { useLibraryStore } from "@/lib/stores/library-store"
import { usePlayerStore } from "@/lib/stores/player-store"

export default function PlaylistDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const {
    playlists,
    tracks,
    updatePlaylist,
    reorderPlaylistTracks,
    removeFromPlaylist,
  } = useLibraryStore()

  const playlist = playlists[id]
  const [name, setName] = useState<string>(playlist?.name || "")

  const trackItems = useMemo(() => {
    if (!playlist) return []
    return playlist.trackIds
      .map((tid) => tracks[tid])
      .filter(Boolean)
  }, [playlist, tracks])

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <p className="text-sm text-muted-foreground">Playlist not found.</p>
      </div>
    )
  }

  const handleSaveName = () => {
    const newName = name.trim()
    if (!newName || newName === playlist.name) return
    updatePlaylist(playlist.id, { name: newName })
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    reorderPlaylistTracks(playlist.id, index, index - 1)
  }

  const moveDown = (index: number) => {
    if (index >= playlist.trackIds.length - 1) return
    reorderPlaylistTracks(playlist.id, index, index + 1)
  }

  const removeTrack = (trackId: string) => {
    removeFromPlaylist(playlist.id, [trackId])
  }

  const playAll = () => {
    const { setQueue, play } = usePlayerStore.getState()
    const items = trackItems
    if (!items.length) return
    setQueue(items, 0)
    play()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="safe-area-top px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  className="h-10"
                />
                <Button variant="outline" size="sm" onClick={handleSaveName}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{playlist.trackIds.length} songs</p>
            </div>
            <Button className="rounded-xl" onClick={playAll}>Play</Button>
          </div>
        </div>
      </header>

      {/* Tracks */}
      <main className="p-4 space-y-3 pb-32">
        {trackItems.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No tracks in this playlist yet.</Card>
        ) : (
          trackItems.map((track, index) => (
            <Card key={track.id} className="p-3 flex items-center gap-3 rounded-2xl">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {track.artwork ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist} • {track.album}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => moveUp(index)} disabled={index === 0}>
                  <MoveUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveDown(index)}
                  disabled={index === playlist.trackIds.length - 1}
                >
                  <MoveDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeTrack(track.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  )
}
