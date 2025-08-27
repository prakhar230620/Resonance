"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, SortAsc, SortDesc, Grid, List, Plus, Music, Sparkles, FolderOpen } from "lucide-react"
import { useLibraryStore } from "@/lib/stores/library-store"
import { scanSavedFolders } from "@/lib/scanner"
import { TrackList } from "./track-list"
import { PullToRefresh } from "./pull-to-refresh"
import { TrackSkeleton, AlbumSkeleton } from "./ui/loading-skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
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

if (typeof window !== "undefined") {
  const resizeObserverErrorHandler = (e: ErrorEvent) => {
    if (e.message === "ResizeObserver loop completed with undelivered notifications.") {
      e.stopImmediatePropagation()
      return false
    }
  }

  window.addEventListener("error", resizeObserverErrorHandler)
}

export function LibraryView() {
  const {
    currentView,
    searchQuery,
    sortBy,
    sortOrder,
    stats,
    tracks,
    albums,
    artists,
    playlists,
    setCurrentView,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    getFilteredTracks,
    getRecentTracks,
    createPlaylist,
  } = useLibraryStore()

  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [isLoading, setIsLoading] = useState(false)

  const filteredTracks = getFilteredTracks()
  const recentTracks = getRecentTracks(10)

  const handleCreatePlaylist = () => {
    const name = prompt("Enter playlist name:")
    if (name?.trim()) {
      triggerHaptic("medium")
      createPlaylist(name.trim())
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    triggerHaptic("medium")
    try {
      await scanSavedFolders()
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewModeToggle = () => {
    triggerHaptic("light")
    setViewMode(viewMode === "list" ? "grid" : "list")
  }

  const handleTabChange = (value: string) => {
    triggerHaptic("light")
    setCurrentView(value as any)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 border-b border-border/50 premium-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 premium-gradient rounded-2xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold premium-gradient-text">Your Library</h1>
              <p className="text-sm text-muted-foreground">Premium music collection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleViewModeToggle}
              className="rounded-xl transition-all duration-200 hover:bg-muted/50 active:bg-muted"
            >
              {viewMode === "list" ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Rescan
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors duration-200" />
          <Input
            placeholder="Search your music collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl border-2 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { value: stats.totalTracks, label: "Songs", icon: Music },
            { value: stats.totalArtists, label: "Artists", icon: Sparkles },
            { value: stats.totalAlbums, label: "Albums", icon: Grid },
            { value: formatDuration(stats.totalDuration), label: "Duration", icon: List },
          ].map((stat, index) => (
            <Card
              key={stat.label}
              className="p-3 text-center hover:shadow-lg transition-all duration-200 premium-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-lg font-bold premium-gradient-text">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={currentView} onValueChange={handleTabChange} className="h-full">
          <TabsList
            className="grid w-full grid-cols-4 mx-6 mt-6 h-12 rounded-2xl premium-fade-in"
            style={{ animationDelay: "200ms" }}
          >
            <TabsTrigger
              value="songs"
              className="rounded-xl transition-all duration-200 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              Songs
            </TabsTrigger>
            <TabsTrigger
              value="artists"
              className="rounded-xl transition-all duration-200 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              Artists
            </TabsTrigger>
            <TabsTrigger
              value="albums"
              className="rounded-xl transition-all duration-200 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              Albums
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="rounded-xl transition-all duration-200 data-[state=active]:premium-gradient data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              Playlists
            </TabsTrigger>
          </TabsList>

          <PullToRefresh onRefresh={handleRefresh} className="h-full">
            <div className="p-6 h-full overflow-auto">
              <TabsContent value="songs" className="mt-0 h-full premium-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                      <SelectTrigger className="w-36 h-10 rounded-xl transition-all duration-200 hover:bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="artist">Artist</SelectItem>
                        <SelectItem value="album">Album</SelectItem>
                        <SelectItem value="dateAdded">Date Added</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        triggerHaptic("light")
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }}
                      className="rounded-xl transition-all duration-200 hover:bg-muted/50 active:bg-muted"
                    >
                      {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground font-medium">{filteredTracks.length} songs</p>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TrackSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredTracks.length > 0 ? (
                  <TrackList tracks={filteredTracks} />
                ) : (
                  <div className="text-center py-16 premium-fade-in">
                    <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Music className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {searchQuery ? "No songs match your search" : "No songs in your library"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery ? "Try a different search term" : "Add your music folders to get started"}
                    </p>
                    {!searchQuery && (
                      <Link href="/add-music">
                        <Button className="premium-gradient hover:opacity-90 transition-all duration-200 shadow-lg h-12 px-6 rounded-2xl">
                          <FolderOpen className="w-5 h-5 mr-2" />
                          Add Music Folder
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="artists" className="mt-0 h-full premium-fade-in">
                <div className="grid grid-cols-1 gap-4">
                  {Object.values(artists).map((artist, index) => (
                    <Card
                      key={artist.id}
                      className="p-5 cursor-pointer hover:bg-muted/50 hover:shadow-lg transition-all duration-200 premium-scale-in rounded-2xl"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => triggerHaptic("light")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-xl font-bold text-white">{artist.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{artist.name}</h3>
                          <p className="text-sm text-muted-foreground">{artist.trackCount} songs</p>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {Object.keys(artists).length === 0 && (
                    <div className="text-center py-16 premium-fade-in">
                      <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">No artists yet</h3>
                      <p className="text-muted-foreground">Add music to see your artists</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="albums" className="mt-0 h-full premium-fade-in">
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <AlbumSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-4 transition-all duration-300",
                      viewMode === "grid" ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {Object.values(albums).map((album, index) => (
                      <Card
                        key={album.id}
                        className="p-4 cursor-pointer hover:bg-muted/50 hover:shadow-lg transition-all duration-200 premium-scale-in rounded-2xl"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => triggerHaptic("light")}
                      >
                        {viewMode === "grid" ? (
                          <>
                            <div className="aspect-square bg-muted rounded-2xl mb-4 overflow-hidden transition-transform duration-200 hover:scale-105 shadow-lg">
                              {album.artwork ? (
                                <img
                                  src={album.artwork || "/placeholder.svg"}
                                  alt={album.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full premium-gradient flex items-center justify-center">
                                  <Music className="w-12 h-12 text-white" />
                                </div>
                              )}
                            </div>
                            <h3 className="font-bold text-sm truncate">{album.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                            <p className="text-xs text-muted-foreground">
                              {album.trackCount} songs • {album.year}
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-muted rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                              {album.artwork ? (
                                <img
                                  src={album.artwork || "/placeholder.svg"}
                                  alt={album.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full premium-gradient flex items-center justify-center">
                                  <Music className="w-8 h-8 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg truncate">{album.title}</h3>
                              <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                              <p className="text-xs text-muted-foreground">
                                {album.trackCount} songs • {album.year}
                              </p>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}

                    {Object.keys(albums).length === 0 && (
                      <div className="col-span-2 text-center py-16 premium-fade-in">
                        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <Grid className="w-12 h-12 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No albums yet</h3>
                        <p className="text-muted-foreground">Add music to see your albums</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="playlists" className="mt-0 h-full premium-fade-in">
                <div className="mb-6">
                  <Button
                    onClick={handleCreatePlaylist}
                    className="w-full h-14 premium-gradient hover:opacity-90 transition-all duration-200 shadow-lg rounded-2xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Playlist
                  </Button>
                </div>

                <div className="space-y-4">
                  {Object.values(playlists).map((playlist, index) => (
                    <Card
                      key={playlist.id}
                      className="p-5 cursor-pointer hover:bg-muted/50 hover:shadow-lg transition-all duration-200 premium-scale-in rounded-2xl"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => triggerHaptic("light")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">🎵</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{playlist.name}</h3>
                          <p className="text-sm text-muted-foreground">{playlist.trackIds.length} songs</p>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {Object.keys(playlists).length === 0 && (
                    <div className="text-center py-16 premium-fade-in">
                      <div className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Plus className="w-12 h-12 text-accent" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">No playlists yet</h3>
                      <p className="text-muted-foreground">Create your first playlist to organize your music</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </PullToRefresh>
        </Tabs>
      </div>
    </div>
  )
}
