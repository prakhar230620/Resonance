import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Track } from "./player-store"

export interface Album {
  id: string
  title: string
  artist: string
  albumArtist?: string
  year?: number
  artwork?: string
  trackIds: string[]
  duration: number
  trackCount: number
}

export interface Artist {
  id: string
  name: string
  albumIds: string[]
  trackIds: string[]
  trackCount: number
}

export interface Playlist {
  id: string
  name: string
  description?: string
  type: "manual" | "smart"
  trackIds: string[]
  createdAt: Date
  updatedAt: Date
  rules?: SmartPlaylistRule[]
}

export interface SmartPlaylistRule {
  field: "title" | "artist" | "album" | "genre" | "year" | "playCount" | "lastPlayed" | "addedAt"
  operator: "contains" | "equals" | "greaterThan" | "lessThan" | "inLast"
  value: string | number
}

export interface LibraryStats {
  totalTracks: number
  totalAlbums: number
  totalArtists: number
  totalDuration: number
  lastScanned?: Date
}

export interface LibraryState {
  // Data
  tracks: Record<string, Track>
  albums: Record<string, Album>
  artists: Record<string, Artist>
  playlists: Record<string, Playlist>
  favorites: Record<string, true>

  // UI State
  currentView: "songs" | "artists" | "albums" | "playlists" | "folders" | "recent" | "favorites"
  searchQuery: string
  sortBy: "title" | "artist" | "album" | "dateAdded" | "playCount"
  sortOrder: "asc" | "desc"

  // Stats
  stats: LibraryStats

  // Loading states
  isScanning: boolean
  scanProgress: number
}

export interface LibraryActions {
  // Track management
  addTrack: (track: Track) => void
  addTracks: (tracks: Track[]) => void
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<Track>) => void

  // Album management
  getAlbumsForArtist: (artistId: string) => Album[]
  getTracksForAlbum: (albumId: string) => Track[]

  // Artist management
  getTracksForArtist: (artistId: string) => Track[]

  // Playlist management
  createPlaylist: (name: string, description?: string) => string
  deletePlaylist: (playlistId: string) => void
  addToPlaylist: (playlistId: string, trackIds: string[]) => void
  removeFromPlaylist: (playlistId: string, trackIds: string[]) => void
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void
  setPlaylistOrder: (playlistId: string, trackIds: string[]) => void
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void

  // Favorites
  toggleFavorite: (trackId: string) => void
  isFavorite: (trackId: string) => boolean

  // Search and filtering
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: LibraryState["sortBy"]) => void
  setSortOrder: (order: LibraryState["sortOrder"]) => void
  setCurrentView: (view: LibraryState["currentView"]) => void

  // Computed getters
  getFilteredTracks: () => Track[]
  getRecentTracks: (limit?: number) => Track[]
  getFavoriteTracks: () => Track[]
  getMostPlayedTracks: (limit?: number) => Track[]

  // Scanning
  setScanProgress: (progress: number) => void
  setIsScanning: (scanning: boolean) => void

  // Utilities
  clearLibrary: () => void
  updateStats: () => void
}

type LibraryStore = LibraryState & LibraryActions

const initialState: LibraryState = {
  tracks: {},
  albums: {},
  artists: {},
  playlists: {},
  favorites: {},
  currentView: "songs",
  searchQuery: "",
  sortBy: "title",
  sortOrder: "asc",
  stats: {
    totalTracks: 0,
    totalAlbums: 0,
    totalArtists: 0,
    totalDuration: 0,
  },
  isScanning: false,
  scanProgress: 0,
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addTrack: (track: Track) => {
        set((state) => {
          const newTracks = { ...state.tracks, [track.id]: track }

          // Update albums
          const albumId = `${track.artist}-${track.album}`.toLowerCase().replace(/\s+/g, "-")
          const existingAlbum = state.albums[albumId]
          const newAlbums = {
            ...state.albums,
            [albumId]: {
              id: albumId,
              title: track.album,
              artist: track.artist,
              albumArtist: track.artist,
              year: track.year,
              artwork: track.artwork,
              trackIds: existingAlbum ? [...existingAlbum.trackIds, track.id] : [track.id],
              duration: (existingAlbum?.duration || 0) + track.duration,
              trackCount: (existingAlbum?.trackCount || 0) + 1,
            },
          }

          // Update artists
          const artistId = track.artist.toLowerCase().replace(/\s+/g, "-")
          const existingArtist = state.artists[artistId]
          const newArtists = {
            ...state.artists,
            [artistId]: {
              id: artistId,
              name: track.artist,
              albumIds: existingArtist?.albumIds.includes(albumId)
                ? existingArtist.albumIds
                : [...(existingArtist?.albumIds || []), albumId],
              trackIds: existingArtist ? [...existingArtist.trackIds, track.id] : [track.id],
              trackCount: (existingArtist?.trackCount || 0) + 1,
            },
          }

          return {
            tracks: newTracks,
            albums: newAlbums,
            artists: newArtists,
          }
        })

        get().updateStats()
      },

      addTracks: (tracks: Track[]) => {
        tracks.forEach((track) => get().addTrack(track))
      },

      removeTrack: (trackId: string) => {
        set((state) => {
          const track = state.tracks[trackId]
          if (!track) return state

          const newTracks = { ...state.tracks }
          delete newTracks[trackId]

          // Update albums
          const albumId = `${track.artist}-${track.album}`.toLowerCase().replace(/\s+/g, "-")
          const album = state.albums[albumId]
          const newAlbums = { ...state.albums }

          if (album) {
            const updatedTrackIds = album.trackIds.filter((id) => id !== trackId)
            if (updatedTrackIds.length === 0) {
              delete newAlbums[albumId]
            } else {
              newAlbums[albumId] = {
                ...album,
                trackIds: updatedTrackIds,
                duration: album.duration - track.duration,
                trackCount: album.trackCount - 1,
              }
            }
          }

          // Update artists
          const artistId = track.artist.toLowerCase().replace(/\s+/g, "-")
          const artist = state.artists[artistId]
          const newArtists = { ...state.artists }

          if (artist) {
            const updatedTrackIds = artist.trackIds.filter((id) => id !== trackId)
            if (updatedTrackIds.length === 0) {
              delete newArtists[artistId]
            } else {
              newArtists[artistId] = {
                ...artist,
                trackIds: updatedTrackIds,
                trackCount: artist.trackCount - 1,
              }
            }
          }

          return {
            tracks: newTracks,
            albums: newAlbums,
            artists: newArtists,
          }
        })

        get().updateStats()
      },

      updateTrack: (trackId: string, updates: Partial<Track>) => {
        set((state) => ({
          tracks: {
            ...state.tracks,
            [trackId]: { ...state.tracks[trackId], ...updates },
          },
        }))
      },

      getAlbumsForArtist: (artistId: string) => {
        const state = get()
        const artist = state.artists[artistId]
        if (!artist) return []

        return artist.albumIds.map((albumId) => state.albums[albumId]).filter(Boolean)
      },

      getTracksForAlbum: (albumId: string) => {
        const state = get()
        const album = state.albums[albumId]
        if (!album) return []

        return album.trackIds.map((trackId) => state.tracks[trackId]).filter(Boolean)
      },

      getTracksForArtist: (artistId: string) => {
        const state = get()
        const artist = state.artists[artistId]
        if (!artist) return []

        return artist.trackIds.map((trackId) => state.tracks[trackId]).filter(Boolean)
      },

      createPlaylist: (name: string, description?: string) => {
        const id = `playlist-${Date.now()}`
        const playlist: Playlist = {
          id,
          name,
          description,
          type: "manual",
          trackIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set((state) => ({
          playlists: { ...state.playlists, [id]: playlist },
        }))

        return id
      },

      deletePlaylist: (playlistId: string) => {
        set((state) => {
          const newPlaylists = { ...state.playlists }
          delete newPlaylists[playlistId]
          return { playlists: newPlaylists }
        })
      },

      addToPlaylist: (playlistId: string, trackIds: string[]) => {
        set((state) => {
          const playlist = state.playlists[playlistId]
          if (!playlist) return state

          const newTrackIds = [...playlist.trackIds, ...trackIds.filter((id) => !playlist.trackIds.includes(id))]

          return {
            playlists: {
              ...state.playlists,
              [playlistId]: {
                ...playlist,
                trackIds: newTrackIds,
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      removeFromPlaylist: (playlistId: string, trackIds: string[]) => {
        set((state) => {
          const playlist = state.playlists[playlistId]
          if (!playlist) return state

          const newTrackIds = playlist.trackIds.filter((id) => !trackIds.includes(id))

          return {
            playlists: {
              ...state.playlists,
              [playlistId]: {
                ...playlist,
                trackIds: newTrackIds,
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => {
        set((state) => {
          const playlist = state.playlists[playlistId]
          if (!playlist) return state

          return {
            playlists: {
              ...state.playlists,
              [playlistId]: {
                ...playlist,
                ...updates,
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      setPlaylistOrder: (playlistId: string, trackIds: string[]) => {
        set((state) => {
          const playlist = state.playlists[playlistId]
          if (!playlist) return state
          return {
            playlists: {
              ...state.playlists,
              [playlistId]: {
                ...playlist,
                trackIds,
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => {
        set((state) => {
          const playlist = state.playlists[playlistId]
          if (!playlist) return state
          const ids = [...playlist.trackIds]
          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= ids.length ||
            toIndex >= ids.length ||
            fromIndex === toIndex
          )
            return state
          const [moved] = ids.splice(fromIndex, 1)
          ids.splice(toIndex, 0, moved)
          return {
            playlists: {
              ...state.playlists,
              [playlistId]: {
                ...playlist,
                trackIds: ids,
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      toggleFavorite: (trackId: string) => {
        set((state) => {
          const isFav = !!state.favorites[trackId]
          const newFavs = { ...state.favorites }
          if (isFav) {
            delete newFavs[trackId]
          } else {
            newFavs[trackId] = true
          }
          return { favorites: newFavs }
        })
      },

      isFavorite: (trackId: string) => {
        return !!get().favorites[trackId]
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query })
      },

      setSortBy: (sortBy: LibraryState["sortBy"]) => {
        set({ sortBy })
      },

      setSortOrder: (order: LibraryState["sortOrder"]) => {
        set({ sortOrder: order })
      },

      setCurrentView: (view: LibraryState["currentView"]) => {
        set({ currentView: view })
      },

      getFilteredTracks: () => {
        const { tracks, searchQuery, sortBy, sortOrder } = get()
        let filteredTracks = Object.values(tracks)

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filteredTracks = filteredTracks.filter(
            (track) =>
              track.title.toLowerCase().includes(query) ||
              track.artist.toLowerCase().includes(query) ||
              track.album.toLowerCase().includes(query) ||
              track.genre?.toLowerCase().includes(query),
          )
        }

        // Apply sorting
        filteredTracks.sort((a, b) => {
          let aValue: string | number
          let bValue: string | number

          switch (sortBy) {
            case "title":
              aValue = a.title.toLowerCase()
              bValue = b.title.toLowerCase()
              break
            case "artist":
              aValue = a.artist.toLowerCase()
              bValue = b.artist.toLowerCase()
              break
            case "album":
              aValue = a.album.toLowerCase()
              bValue = b.album.toLowerCase()
              break
            case "dateAdded":
              aValue = new Date(a.id).getTime() // Using ID as proxy for date added
              bValue = new Date(b.id).getTime()
              break
            case "playCount":
              aValue = 0 // TODO: Implement play count tracking
              bValue = 0
              break
            default:
              aValue = a.title.toLowerCase()
              bValue = b.title.toLowerCase()
          }

          if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
          if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
          return 0
        })

        return filteredTracks
      },

      getRecentTracks: (limit = 20) => {
        const { tracks } = get()
        return Object.values(tracks)
          .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime())
          .slice(0, limit)
      },

      getFavoriteTracks: () => {
        const { tracks, favorites } = get()
        return Object.values(tracks).filter((t) => !!favorites[t.id])
      },

      getMostPlayedTracks: (limit = 20) => {
        const { tracks } = get()
        // TODO: Implement play count tracking
        return Object.values(tracks).slice(0, limit)
      },

      setScanProgress: (progress: number) => {
        set({ scanProgress: progress })
      },

      setIsScanning: (scanning: boolean) => {
        set({ isScanning: scanning })
      },

      clearLibrary: () => {
        set({
          tracks: {},
          albums: {},
          artists: {},
          playlists: {},
        })
        get().updateStats()
      },

      updateStats: () => {
        const { tracks, albums, artists } = get()
        const totalTracks = Object.keys(tracks).length
        const totalAlbums = Object.keys(albums).length
        const totalArtists = Object.keys(artists).length
        const totalDuration = Object.values(tracks).reduce((sum, track) => sum + track.duration, 0)

        set({
          stats: {
            totalTracks,
            totalAlbums,
            totalArtists,
            totalDuration,
            lastScanned: new Date(),
          },
        })
      },
    }),
    {
      name: "resonance-library",
      partialize: (state) => ({
        tracks: state.tracks,
        albums: state.albums,
        artists: state.artists,
        playlists: state.playlists,
        favorites: state.favorites,
        stats: state.stats,
      }),
    },
  ),
)
