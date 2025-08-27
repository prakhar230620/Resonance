import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  src: string
  artwork?: string
  genre?: string
  year?: number
  trackNumber?: number
  // File System references (optional; only when sourced from local files)
  fileHandle?: FileSystemFileHandle
  fileParentDir?: FileSystemDirectoryHandle
  filePath?: string
  fileSize?: number
}

export interface PlayerState {
  // Current playback state
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean

  // Queue management
  queue: Track[]
  currentIndex: number
  originalQueue: Track[]

  // Playback modes
  isShuffled: boolean
  repeatMode: "off" | "one" | "all"

  // Audio effects
  playbackRate: number
  crossfadeEnabled: boolean
  crossfadeDuration: number

  // UI state
  isNowPlayingOpen: boolean
  isQueueOpen: boolean
}

export interface PlayerActions {
  // Playback controls
  play: () => void
  pause: () => void
  togglePlayPause: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void

  // Queue management
  setQueue: (tracks: Track[], startIndex?: number) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void

  // Playback modes
  toggleShuffle: () => void
  toggleRepeat: () => void
  setPlaybackRate: (rate: number) => void
  setCrossfadeEnabled: (enabled: boolean) => void
  setCrossfadeDuration: (seconds: number) => void

  // UI actions
  setNowPlayingOpen: (open: boolean) => void
  setQueueOpen: (open: boolean) => void

  // Internal state updates
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
}

type PlayerStore = PlayerState & PlayerActions

const initialState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  queue: [],
  currentIndex: -1,
  originalQueue: [],
  isShuffled: false,
  repeatMode: "off",
  playbackRate: 1,
  crossfadeEnabled: false,
  crossfadeDuration: 3,
  isNowPlayingOpen: false,
  isQueueOpen: false,
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      play: () => {
        const { currentTrack } = get()
        if (currentTrack) {
          set({ isPlaying: true })
        }
      },

      pause: () => {
        set({ isPlaying: false })
      },

      togglePlayPause: () => {
        const { isPlaying } = get()
        if (isPlaying) {
          get().pause()
        } else {
          get().play()
        }
      },

      next: () => {
        const { queue, currentIndex, repeatMode } = get()
        if (queue.length === 0) return

        let nextIndex = currentIndex + 1

        if (nextIndex >= queue.length) {
          if (repeatMode === "all") {
            nextIndex = 0
          } else {
            return // End of queue
          }
        }

        set({
          currentIndex: nextIndex,
          currentTrack: queue[nextIndex],
          currentTime: 0,
        })
      },

      previous: () => {
        const { queue, currentIndex, currentTime } = get()
        if (queue.length === 0) return

        // If more than 3 seconds into track, restart current track
        if (currentTime > 3) {
          set({ currentTime: 0 })
          return
        }

        let prevIndex = currentIndex - 1

        if (prevIndex < 0) {
          prevIndex = queue.length - 1
        }

        set({
          currentIndex: prevIndex,
          currentTrack: queue[prevIndex],
          currentTime: 0,
        })
      },

      seek: (time: number) => {
        set({ currentTime: time })
      },

      setVolume: (volume: number) => {
        set({ volume: Math.max(0, Math.min(1, volume)), isMuted: false })
      },

      toggleMute: () => {
        const { isMuted } = get()
        set({ isMuted: !isMuted })
      },

      setQueue: (tracks: Track[], startIndex = 0) => {
        set({
          queue: tracks,
          originalQueue: [...tracks],
          currentIndex: startIndex,
          currentTrack: tracks[startIndex] || null,
          currentTime: 0,
        })
      },

      addToQueue: (track: Track) => {
        const { queue } = get()
        set({ queue: [...queue, track] })
      },

      removeFromQueue: (index: number) => {
        const { queue, currentIndex } = get()
        const newQueue = queue.filter((_, i) => i !== index)
        let newCurrentIndex = currentIndex

        if (index < currentIndex) {
          newCurrentIndex = currentIndex - 1
        } else if (index === currentIndex) {
          newCurrentIndex = Math.min(currentIndex, newQueue.length - 1)
        }

        set({
          queue: newQueue,
          currentIndex: newCurrentIndex,
          currentTrack: newQueue[newCurrentIndex] || null,
        })
      },

      clearQueue: () => {
        set({
          queue: [],
          currentIndex: -1,
          currentTrack: null,
          isPlaying: false,
        })
      },

      toggleShuffle: () => {
        const { isShuffled, queue, originalQueue, currentTrack } = get()

        if (!isShuffled) {
          // Enable shuffle
          const shuffled = [...queue].sort(() => Math.random() - 0.5)
          const currentIndex = shuffled.findIndex((track) => track.id === currentTrack?.id)

          set({
            isShuffled: true,
            queue: shuffled,
            currentIndex: currentIndex >= 0 ? currentIndex : 0,
          })
        } else {
          // Disable shuffle
          const currentIndex = originalQueue.findIndex((track) => track.id === currentTrack?.id)

          set({
            isShuffled: false,
            queue: [...originalQueue],
            currentIndex: currentIndex >= 0 ? currentIndex : 0,
          })
        }
      },

      toggleRepeat: () => {
        const { repeatMode } = get()
        const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"]
        const currentModeIndex = modes.indexOf(repeatMode)
        const nextMode = modes[(currentModeIndex + 1) % modes.length]

        set({ repeatMode: nextMode })
      },

      setPlaybackRate: (rate: number) => {
        set({ playbackRate: Math.max(0.5, Math.min(2, rate)) })
      },

      setCrossfadeEnabled: (enabled: boolean) => {
        set({ crossfadeEnabled: enabled })
      },

      setCrossfadeDuration: (seconds: number) => {
        const clamped = Math.max(0, Math.min(12, seconds))
        set({ crossfadeDuration: clamped })
      },

      setNowPlayingOpen: (open: boolean) => {
        set({ isNowPlayingOpen: open })
      },

      setQueueOpen: (open: boolean) => {
        set({ isQueueOpen: open })
      },

      setCurrentTime: (time: number) => {
        set({ currentTime: time })
      },

      setDuration: (duration: number) => {
        set({ duration })
      },

      setIsPlaying: (playing: boolean) => {
        set({ isPlaying: playing })
      },
    }),
    {
      name: "resonance-player",
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
        playbackRate: state.playbackRate,
        crossfadeEnabled: state.crossfadeEnabled,
        crossfadeDuration: state.crossfadeDuration,
        queue: state.queue,
        currentIndex: state.currentIndex,
        currentTrack: state.currentTrack,
      }),
    },
  ),
)
