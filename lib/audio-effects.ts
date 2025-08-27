// Audio effects engine using Web Audio API

export interface EqualizerBand {
  frequency: number
  gain: number
  q: number
}

export interface EqualizerPreset {
  name: string
  bands: number[]
}

export const EQUALIZER_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { name: "Flat", bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Rock", bands: [5, 3, -1, -2, -1, 2, 4, 6, 6, 6] },
  { name: "Pop", bands: [-1, 2, 4, 4, 1, -1, -2, -2, -1, -1] },
  { name: "Jazz", bands: [4, 3, 1, 2, -1, -1, 0, 1, 2, 3] },
  { name: "Classical", bands: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4] },
  { name: "Electronic", bands: [4, 3, 1, 0, -2, 2, 1, 1, 4, 5] },
  { name: "Hip Hop", bands: [5, 4, 1, 3, -1, -1, 1, -1, 2, 3] },
  { name: "Vocal", bands: [-2, -4, -2, 1, 3, 3, 2, 1, 0, -1] },
  { name: "Bass Boost", bands: [7, 6, 5, 3, 1, -1, -2, -3, -3, -3] },
  { name: "Treble Boost", bands: [-3, -3, -2, -1, 1, 3, 5, 6, 7, 8] },
]

export class AudioEffectsEngine {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private eqBands: BiquadFilterNode[] = []
  private compressor: DynamicsCompressorNode | null = null
  private isInitialized = false

  constructor(private audioElement: HTMLAudioElement) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume()
      }

      // Create audio graph: source -> EQ -> compressor -> gain -> destination
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement)
      this.gainNode = this.audioContext.createGain()
      this.compressor = this.audioContext.createDynamicsCompressor()

      // Create 10-band equalizer
      this.createEqualizer()

      // Connect the audio graph
      let currentNode: AudioNode = this.sourceNode

      // Connect EQ bands in series
      for (const band of this.eqBands) {
        currentNode.connect(band)
        currentNode = band
      }

      // Connect compressor and gain
      currentNode.connect(this.compressor)
      this.compressor.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)

      // Configure compressor for music
      this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime)
      this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime)
      this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime)
      this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime)
      this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime)

      this.isInitialized = true
    } catch (error) {
      console.warn("Failed to initialize audio effects:", error)
    }
  }

  private createEqualizer(): void {
    if (!this.audioContext) return

    this.eqBands = EQUALIZER_FREQUENCIES.map((frequency, index) => {
      const filter = this.audioContext!.createBiquadFilter()

      if (index === 0) {
        filter.type = "lowshelf"
      } else if (index === EQUALIZER_FREQUENCIES.length - 1) {
        filter.type = "highshelf"
      } else {
        filter.type = "peaking"
      }

      filter.frequency.setValueAtTime(frequency, this.audioContext!.currentTime)
      filter.Q.setValueAtTime(1, this.audioContext!.currentTime)
      filter.gain.setValueAtTime(0, this.audioContext!.currentTime)

      return filter
    })
  }

  setEqualizerBand(bandIndex: number, gain: number): void {
    if (!this.isInitialized || bandIndex < 0 || bandIndex >= this.eqBands.length) return

    const clampedGain = Math.max(-12, Math.min(12, gain))
    const filter = this.eqBands[bandIndex]

    if (filter && this.audioContext) {
      filter.gain.setValueAtTime(clampedGain, this.audioContext.currentTime)
    }
  }

  setEqualizerPreset(preset: EqualizerPreset): void {
    preset.bands.forEach((gain, index) => {
      this.setEqualizerBand(index, gain)
    })
  }

  setVolume(volume: number): void {
    if (!this.gainNode || !this.audioContext) return

    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime)
  }

  setBassBoost(boost: number): void {
    // Boost low frequencies (32Hz, 64Hz, 125Hz)
    const boostAmount = Math.max(0, Math.min(12, boost))
    this.setEqualizerBand(0, boostAmount)
    this.setEqualizerBand(1, boostAmount * 0.8)
    this.setEqualizerBand(2, boostAmount * 0.6)
  }

  getAnalyserNode(): AnalyserNode | null {
    if (!this.audioContext || !this.isInitialized) return null

    const analyser = this.audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    // Connect after the gain node
    this.gainNode?.connect(analyser)

    return analyser
  }

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.isInitialized = false
  }
}
