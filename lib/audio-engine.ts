import { usePlayerStore } from "./stores/player-store"
import { useLibraryStore } from "./stores/library-store"
import { checkAudioSupport, getAudioMimeType, createFileInput } from "./file-system"
import { useSettingsStore } from "./stores/settings-store"
import { EQUALIZER_FREQUENCIES, type EqualizerPreset } from "./audio-effects"
import { toast } from "@/hooks/use-toast"

class AudioEngine {
  private audio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private bassFilter: BiquadFilterNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private analyser: AnalyserNode | null = null
  private eqBands: BiquadFilterNode[] = []
  private source: MediaElementAudioSourceNode | null = null
  private isInitialized = false
  private endFadeScheduled = false
  private silenceCheckInterval: number | null = null

  constructor() {
    // Guard for SSR: defer creating Audio element until in browser
    if (typeof globalThis === "undefined" || typeof (globalThis as any).Audio === "undefined") {
      return
    }
    this.audio = new (globalThis as any).Audio()
    this.setupAudioElement()
    this.setupMediaSession()
  }

  // Centralized, user-friendly error notifications (no URLs or low-level details)
  private notifyUserError(kind: "unsupported" | "network" | "permission" | "load" | "play" | "unknown") {
    const titles: Record<string, string> = {
      unsupported: "Can't play this file",
      network: "Network issue",
      permission: "Playback blocked",
      load: "Playback error",
      play: "Playback error",
      unknown: "Playback error",
    }
    const descriptions: Record<string, string> = {
      unsupported: "This audio format isn't supported on your device.",
      network: "Please check your connection and try again.",
      permission: "Tap the play button to resume.",
      load: "We couldn't load the track. Please try again.",
      play: "We couldn't start playback. Please try again.",
      unknown: "Something went wrong while playing this track.",
    }
    try {
      toast({ title: titles[kind], description: descriptions[kind], variant: "destructive" })
    } catch {}
  }

  private setupAudioElement() {
    if (!this.audio) return
    const audio = this.audio
    audio.preload = "metadata"
    audio.crossOrigin = "anonymous"

    // Event listeners
    audio.addEventListener("loadedmetadata", () => {
      console.log("[v0] Audio metadata loaded, duration:", audio.duration)
      usePlayerStore.getState().setDuration(audio.duration)
    })

    audio.addEventListener("timeupdate", () => {
      usePlayerStore.getState().setCurrentTime(audio.currentTime)
      // End-of-track pseudo crossfade (fade-out -> next -> fade-in)
      try {
        const { crossfadeEnabled, crossfadeDuration } = usePlayerStore.getState()
        if (crossfadeEnabled && this.gainNode && isFinite(audio.duration) && audio.duration > 0) {
          const remaining = audio.duration - audio.currentTime
          if (!this.endFadeScheduled && remaining <= Math.max(0.2, crossfadeDuration)) {
            this.endFadeScheduled = true
            // Start fade-out, then advance when ended naturally
            this.rampGain(Math.max(0.0001, 0), Math.max(0.15, crossfadeDuration)).catch(() => {})
          }
        }
      } catch {}
    })

    audio.addEventListener("play", () => {
      console.log("[v0] Audio started playing")
      usePlayerStore.getState().setIsPlaying(true)
      this.updateMediaSession()
    })

    audio.addEventListener("pause", () => {
      console.log("[v0] Audio paused")
      usePlayerStore.getState().setIsPlaying(false)
      this.updateMediaSession()
    })

    audio.addEventListener("ended", () => {
      console.log("[v0] Audio ended")
      const { repeatMode, next } = usePlayerStore.getState()
      const { autoplay } = useSettingsStore.getState()

      if (repeatMode === "one") {
        audio.currentTime = 0
        audio.play().catch((error) => {
          console.error("[v0] Repeat play failed:", error)
        })
      } else {
        if (autoplay) {
          this.endFadeScheduled = false
          next()
          // On next track start, fade in if crossfade was enabled
          try {
            const { crossfadeEnabled, crossfadeDuration } = usePlayerStore.getState()
            if (crossfadeEnabled) {
              // Ensure gain starts low then fades in
              if (this.gainNode && this.audioContext) {
                const now = this.audioContext.currentTime
                this.gainNode.gain.cancelScheduledValues(now)
                this.gainNode.gain.setValueAtTime(0.0001, now)
              }
              this.rampGain(1, Math.max(0.15, crossfadeDuration)).catch(() => {})
            }
          } catch {}
        }
      }
    })

    audio.addEventListener("error", (e) => {
      const error = audio.error || null
      if (error) {
        // Log technicals to console only
        console.error("[v0] Audio error:", error.code, error.message)
        if (error.code === MediaError.MEDIA_ERR_NETWORK) this.notifyUserError("network")
        else if (error.code === MediaError.MEDIA_ERR_DECODE) this.notifyUserError("unsupported")
        else if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) this.notifyUserError("unsupported")
        else this.notifyUserError("unknown")
      } else {
        console.error("[v0] Audio error event:", e.type)
        this.notifyUserError("unknown")
      }

      usePlayerStore.getState().setIsPlaying(false)

      const { currentTrack } = usePlayerStore.getState()
      if (
        currentTrack &&
        error?.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED &&
        !currentTrack.src.includes("placeholder")
      ) {
        console.log("[v0] Attempting to recover from audio error...")
        setTimeout(() => {
          this.loadTrack(currentTrack.src).catch(console.error)
        }, 1000)
      }
    })

    audio.addEventListener("canplaythrough", () => {
      console.log("[v0] Audio can play through")
      const { isPlaying } = usePlayerStore.getState()
      if (isPlaying) {
        audio.play().catch((error) => {
          console.error("[v0] Auto-play failed:", error)
        })
      }
    })

    audio.addEventListener("loadstart", () => {
      console.log("[v0] Audio load started")
    })

    audio.addEventListener("canplay", () => {
      console.log("[v0] Audio can start playing")
    })

    audio.addEventListener("waiting", () => {
      console.log("[v0] Audio waiting for data")
    })

    audio.addEventListener("stalled", () => {
      console.log("[v0] Audio download stalled")
    })
  }

  private async initializeAudioContext() {
    if (this.isInitialized) return

    try {
      if (typeof window === "undefined") return
      if (!this.audio) return
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.source = this.audioContext.createMediaElementSource(this.audio)

      // Optional processing nodes
      this.bassFilter = this.audioContext.createBiquadFilter()
      this.bassFilter.type = "lowshelf"
      this.bassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime)
      this.bassFilter.gain.setValueAtTime(0, this.audioContext.currentTime)

      this.compressor = this.audioContext.createDynamicsCompressor()
      // Music-friendly defaults (mild)
      this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime)
      this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime)
      this.compressor.ratio.setValueAtTime(6, this.audioContext.currentTime)
      this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime)
      this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime)

      // Create 10-band EQ
      this.eqBands = EQUALIZER_FREQUENCIES.map((frequency, index) => {
        const filter = this.audioContext!.createBiquadFilter()
        if (index === 0) filter.type = "lowshelf"
        else if (index === EQUALIZER_FREQUENCIES.length - 1) filter.type = "highshelf"
        else filter.type = "peaking"
        filter.frequency.setValueAtTime(frequency, this.audioContext!.currentTime)
        filter.Q.setValueAtTime(1, this.audioContext!.currentTime)
        filter.gain.setValueAtTime(0, this.audioContext!.currentTime)
        return filter
      })

      // Graph: source -> bassFilter -> [eqBands...] -> compressor -> gain -> destination
      this.source.connect(this.bassFilter)
      let currentNode: AudioNode = this.bassFilter
      for (const band of this.eqBands) {
        currentNode.connect(band)
        currentNode = band
      }
      currentNode.connect(this.compressor)
      this.compressor.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)
      // Analyser for features like skip-silence
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      // Tap analyser from gain (post-effects)
      this.gainNode.connect(this.analyser)

      // Apply persisted settings
      try {
        const s = useSettingsStore.getState()
        this.setBassBoost(s.bassBoost)
        this.setNormalizeVolume(s.normalizeVolume)
      } catch {}

      this.isInitialized = true
    } catch (error) {
      console.warn("Web Audio API not available:", error)
    }
  }

  private setupMediaSession() {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => {
        usePlayerStore.getState().play()
      })

      navigator.mediaSession.setActionHandler("pause", () => {
        usePlayerStore.getState().pause()
      })

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        usePlayerStore.getState().previous()
      })

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        usePlayerStore.getState().next()
      })

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          usePlayerStore.getState().seek(details.seekTime)
        }
      })
    }
  }

  private updateMediaSession() {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      const { currentTrack, isPlaying } = usePlayerStore.getState()

      if (currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artwork: currentTrack.artwork
            ? [{ src: currentTrack.artwork, sizes: "512x512", type: "image/png" }]
            : undefined,
        })

        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused"
      }
    }
  }

  private async ensureFormatSupported(src: string) {
    // Skip explicit checks for blob/data URLs, since extension/MIME is often not derivable and
    // browsers will handle support based on the underlying object URL
    if (src.startsWith("blob:") || src.startsWith("data:")) return

    // Try robust URL parsing first
    try {
      const url = new URL(src, typeof window !== "undefined" ? window.location.origin : undefined)
      const path = url.pathname || ""
      const ext = path.split(".").pop()?.toLowerCase() || ""
      if (!ext) return

      const mime = getAudioMimeType(ext)
      const supported = await checkAudioSupport(mime)
      if (!supported) {
        throw new Error(`Audio format not supported: ${ext} (${mime})`)
      }
      return
    } catch {
      // Fallback to simple parsing without URL constructor
    }

    const rawPath = src.split("?")[0]
    const ext = rawPath.split(".").pop()?.toLowerCase() || ""
    if (!ext) return
    const mime = getAudioMimeType(ext)
    const supported = await checkAudioSupport(mime)
    if (!supported) {
      throw new Error(`Audio format not supported: ${ext} (${mime})`)
    }
  }

  async loadTrack(src: string) {
    console.log("[v0] Loading track:", src)

    try {
      if (!this.audio && typeof globalThis !== "undefined" && typeof (globalThis as any).Audio !== "undefined") {
        // Late init if constructed on server but used on client later
        this.audio = new (globalThis as any).Audio()
        this.setupAudioElement()
        this.setupMediaSession()
      }
      if (!this.audio) throw new Error("Audio element not available in this environment")
      if (!src || src.trim() === "") {
        throw new Error("Invalid audio source: empty or null")
      }

      if (src.includes("placeholder") || src === "/placeholder.mp3") {
        console.warn("[v0] Attempting to load placeholder audio, skipping")
        usePlayerStore.getState().setIsPlaying(false)
        return
      }

      // If the source is a persisted blob URL (from previous session), it may be stale.
      // If we have a FileSystem handle, recreate a fresh object URL for reliable playback.
      const state = usePlayerStore.getState()
      const currentTrack = state.currentTrack
      let effectiveSrc = src
      if (
        currentTrack &&
        currentTrack.src === src &&
        src.startsWith("blob:") &&
        typeof currentTrack.fileHandle !== "undefined" &&
        currentTrack.fileHandle
      ) {
        try {
          const file = await currentTrack.fileHandle.getFile()
          const newUrl = URL.createObjectURL(file)
          effectiveSrc = newUrl
          // Update library store so the track entry references a fresh URL
          try {
            useLibraryStore.getState().updateTrack(currentTrack.id, { src: newUrl })
          } catch {}
        } catch (e) {
          console.warn("[v0] Failed to recreate object URL from file handle:", e)
        }
      }

      // If no handle is available (file-picker only flow) and src is a stale blob, DO NOT open picker automatically.
      // Instead, notify the user gently. They can re-add files via Add Music.
      if (
        currentTrack &&
        currentTrack.src === src &&
        src.startsWith("blob:") &&
        (!("fileHandle" in currentTrack) || !currentTrack.fileHandle)
      ) {
        try {
          toast({
            title: "File needs reconnect",
            description: "This track's source is no longer available. Re-add files from Add Music to fix.",
          })
        } catch {}
      }

      // Proactively verify format support to avoid decoder init errors
      try {
        await this.ensureFormatSupported(effectiveSrc)
      } catch (supportErr) {
        console.error("[v0] Unsupported audio format:", supportErr)
        usePlayerStore.getState().setIsPlaying(false)
        try {
          toast({
            title: "Unsupported format",
            description: "This audio file type isn't supported by your browser.",
            variant: "destructive",
          })
        } catch {}
        throw supportErr
      }

      await this.initializeAudioContext()

      if (this.audioContext?.state === "suspended") {
        console.log("[v0] Resuming suspended audio context")
        await this.audioContext.resume()
      }

      this.audio.pause()
      this.audio.currentTime = 0

      const loadPromise = new Promise<void>((resolve, reject) => {
        const onLoad = () => {
          this.audio!.removeEventListener("loadedmetadata", onLoad)
          this.audio!.removeEventListener("error", onError)
          resolve()
        }

        const onError = (e: Event) => {
          this.audio!.removeEventListener("loadedmetadata", onLoad)
          this.audio!.removeEventListener("error", onError)
          reject(new Error(`Failed to load audio: ${src}`))
        }

        this.audio!.addEventListener("loadedmetadata", onLoad, { once: true })
        this.audio!.addEventListener("error", onError, { once: true })

        this.audio!.src = effectiveSrc
        this.audio!.load()
      })

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Audio loading timeout")), 10000)
      })

      await Promise.race([loadPromise, timeoutPromise])
      console.log("[v0] Track loading completed successfully")
    } catch (error) {
      console.error("[v0] Failed to load track:", error)
      usePlayerStore.getState().setIsPlaying(false)
      // Show a generic message to the user, keep details in console
      if (error instanceof Error && /not supported/i.test(error.message)) {
        this.notifyUserError("unsupported")
      } else if (error instanceof Error && /network/i.test(error.message)) {
        this.notifyUserError("network")
      } else {
        this.notifyUserError("load")
      }
      throw error
    }
  }

  async play() {
    console.log("[v0] Attempting to play audio")

    try {
      if (!this.audio) return
      if (this.audio.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        console.log("[v0] Audio not ready, waiting for canplaythrough")
        return new Promise((resolve, reject) => {
          const onCanPlay = () => {
            this.audio!.removeEventListener("canplaythrough", onCanPlay)
            this.audio!.removeEventListener("error", onError)
            this.audio!.play().then(resolve).catch(reject)
          }

          const onError = (e: Event) => {
            this.audio!.removeEventListener("canplaythrough", onCanPlay)
            this.audio!.removeEventListener("error", onError)
            reject(new Error("Audio failed to load"))
          }

          this.audio!.addEventListener("canplaythrough", onCanPlay, { once: true })
          this.audio!.addEventListener("error", onError, { once: true })
        })
      }

      // Fade-in on play if enabled
      const { fadeOnPause } = useSettingsStore.getState()
      if (this.gainNode && this.audioContext && fadeOnPause) {
        const now = this.audioContext.currentTime
        this.gainNode.gain.cancelScheduledValues(now)
        // Start slightly above 0 to avoid complete silence clicks
        this.gainNode.gain.setValueAtTime(Math.max(0.0001, this.gainNode.gain.value || 0.0001), now)
      }
      await this.audio.play()
      if (this.gainNode && fadeOnPause) {
        // Smoothly ramp to 1 over 300ms
        await this.rampGain(1, 0.3)
      }
      // Start silence detection loop if enabled
      this.startSilenceDetection()
      console.log("[v0] Audio play successful")
    } catch (error) {
      console.error("[v0] Play failed:", error)

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          console.warn("[v0] Autoplay blocked - user interaction required")
          // Don't throw, just log the warning
          this.notifyUserError("permission")
          return
        }
      }

      this.notifyUserError("play")
      throw error
    }
  }

  pause() {
    if (!this.audio) return
    const { fadeOnPause } = useSettingsStore.getState()
    if (fadeOnPause && this.gainNode) {
      // Ramp down then pause
      this.rampGain(0.0001, 0.25)
        .catch(() => {})
        .finally(() => {
          this.audio!.pause()
        })
    } else {
      this.audio.pause()
    }
    this.stopSilenceDetection()
  }

  seek(time: number) {
    if (!this.audio) return
    this.audio.currentTime = time
  }

  setVolume(volume: number) {
    if (this.audio) this.audio.volume = volume
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    }
  }

  // Simple bass boost via a lowshelf filter
  setBassBoost(db: number) {
    if (!this.audioContext || !this.bassFilter) return
    const clamped = Math.max(0, Math.min(12, db))
    this.bassFilter.gain.setValueAtTime(clamped, this.audioContext.currentTime)
  }

  // Enable/disable compression for perceived volume normalization
  setNormalizeVolume(enabled: boolean) {
    if (!this.audioContext || !this.compressor || !this.source || !this.gainNode || !this.bassFilter) return
    // The node is already in chain; tweak ratio/threshold to effectively bypass
    const now = this.audioContext.currentTime
    if (enabled) {
      this.compressor.threshold.setValueAtTime(-24, now)
      this.compressor.knee.setValueAtTime(30, now)
      this.compressor.ratio.setValueAtTime(6, now)
      this.compressor.attack.setValueAtTime(0.003, now)
      this.compressor.release.setValueAtTime(0.25, now)
    } else {
      // Near-no-op settings
      this.compressor.threshold.setValueAtTime(0, now)
      this.compressor.knee.setValueAtTime(0.0001, now)
      this.compressor.ratio.setValueAtTime(1, now)
      this.compressor.attack.setValueAtTime(0.003, now)
      this.compressor.release.setValueAtTime(0.25, now)
    }
  }

  setMuted(muted: boolean) {
    if (!this.audio) return
    this.audio.muted = muted
  }

  setPlaybackRate(rate: number) {
    if (!this.audio) return
    this.audio.playbackRate = rate
  }

  // Equalizer controls
  setEqualizerBand(bandIndex: number, gain: number) {
    if (!this.audioContext || !this.eqBands.length) return
    if (bandIndex < 0 || bandIndex >= this.eqBands.length) return
    const clamped = Math.max(-12, Math.min(12, gain))
    const band = this.eqBands[bandIndex]
    band.gain.setValueAtTime(clamped, this.audioContext.currentTime)
  }

  setEqualizerPreset(preset: EqualizerPreset) {
    preset.bands.forEach((gain, idx) => this.setEqualizerBand(idx, gain))
  }

  getCurrentTime(): number {
    return this.audio?.currentTime ?? 0
  }

  getDuration(): number {
    return this.audio?.duration || 0
  }

  destroy() {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ""
    }

    if (this.source) {
      this.source.disconnect()
    }

    if (this.audioContext) {
      this.audioContext.close()
    }
    this.stopSilenceDetection()
  }

  // Helpers
  private async rampGain(target: number, seconds: number) {
    if (!this.gainNode || !this.audioContext) return
    const now = this.audioContext.currentTime
    const startVal = this.gainNode.gain.value
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(startVal, now)
    this.gainNode.gain.linearRampToValueAtTime(target, now + Math.max(0.01, seconds))
    // Wait roughly the duration
    await new Promise((r) => setTimeout(r, Math.max(10, seconds * 1000)))
  }

  private startSilenceDetection() {
    try {
      const { skipSilence } = useSettingsStore.getState()
      if (!skipSilence) return
      if (!this.analyser || !this.audio) return
      if (this.silenceCheckInterval) return
      const analyser = this.analyser
      const audio = this.audio
      const buffer = new Uint8Array(analyser.fftSize)
      let belowCount = 0
      const threshold = 0.02 // ~ -34 dBFS (rough heuristic on 0..1 scale)
      const windowMs = 800
      const stepMs = 200
      this.silenceCheckInterval = (setInterval(() => {
        analyser.getByteTimeDomainData(buffer)
        // Compute RMS on 0..1 scale
        let sumSq = 0
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.sqrt(sumSq / buffer.length)
        if (rms < threshold) {
          belowCount += stepMs
        } else {
          belowCount = 0
        }
        if (belowCount >= windowMs) {
          // Skip ahead slightly to exit silence region
          try {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 0.5)
          } catch {}
          belowCount = 0
        }
      }, stepMs) as unknown) as number
    } catch {}
  }

  private stopSilenceDetection() {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval)
      this.silenceCheckInterval = null
    }
  }
}

// Client-only lazy singleton accessor
let __audioEngineInstance: AudioEngine | null = null
let __noopEngine: AudioEngine | null = null
export function getAudioEngine(): AudioEngine {
  // On the server, return a stable no-op engine to avoid touching browser APIs
  if (typeof window === "undefined") {
    if (!__noopEngine) {
      __noopEngine = {
        audio: null,
        // public methods we actually use
        loadTrack: async (_src: string) => {},
        play: async () => {},
        pause: () => {},
        seek: (_t: number) => {},
        setVolume: (_v: number) => {},
        setMuted: (_m: boolean) => {},
        setPlaybackRate: (_r: number) => {},
        setEqualizerBand: (_i: number, _g: number) => {},
        setEqualizerPreset: (_p: any) => {},
        getCurrentTime: () => 0,
        getDuration: () => 0,
        destroy: () => {},
      } as unknown as AudioEngine
    }
    return __noopEngine
  }

  if (!__audioEngineInstance) {
    __audioEngineInstance = new AudioEngine()
  }
  return __audioEngineInstance
}
