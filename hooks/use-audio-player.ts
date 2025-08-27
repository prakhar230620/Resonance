"use client"

import { useEffect, useCallback } from "react"
import { usePlayerStore } from "@/lib/stores/player-store"

// Lazy client-only loader for the audio engine to prevent SSR from importing it
let __engine: any = null
async function ensureEngine() {
  if (__engine) return __engine
  const mod = await import("@/lib/audio-engine")
  __engine = mod.getAudioEngine()
  return __engine
}

export function useAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playbackRate,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
  } = usePlayerStore()

  // Sync audio engine with store state
  useEffect(() => {
    if (!currentTrack?.src) return
    ;(async () => {
      const engine = await ensureEngine()
      await engine.loadTrack(currentTrack.src)
    })()
  }, [currentTrack?.src])

  useEffect(() => {
    ;(async () => {
      const engine = await ensureEngine()
      if (isPlaying) {
        engine.play().catch(console.error)
      } else {
        engine.pause()
      }
    })()
  }, [isPlaying])

  useEffect(() => {
    ;(async () => {
      const engine = await ensureEngine()
      engine.setVolume(isMuted ? 0 : volume)
    })()
  }, [volume, isMuted])

  useEffect(() => {
    ;(async () => {
      const engine = await ensureEngine()
      engine.setPlaybackRate(playbackRate)
    })()
  }, [playbackRate])

  const handleSeek = useCallback(
    (time: number) => {
      // Fire-and-forget; engine will exist on client
      ensureEngine().then((engine) => engine.seek(time))
      seek(time)
    },
    [seek],
  )

  return {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playbackRate,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek: handleSeek,
    setVolume,
    toggleMute,
    setPlaybackRate,
  }
}
