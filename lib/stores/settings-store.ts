import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ArtworkSize = "small" | "medium" | "large"
export type ThemeMode = "light" | "dark" | "system"
export type AccentColor = "purple" | "blue" | "green" | "orange" | "red"

export interface SettingsState {
  // Audio
  normalizeVolume: boolean
  bassBoost: number // dB 0-12
  skipSilence: boolean

  // Library
  autoScan: boolean
  includeSubfolders: boolean
  artworkSize: ArtworkSize

  // Playback
  gaplessPlayback: boolean
  fadeOnPause: boolean
  resumeOnConnect: boolean
  autoplay: boolean

  // UI
  theme: ThemeMode
  accentColor: AccentColor
  compactMode: boolean
  showVisualizer: boolean

  // Privacy
  telemetry: boolean
  crashReports: boolean
}

export interface SettingsActions {
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  resetSettings: () => void
}

const initialSettings: SettingsState = {
  normalizeVolume: false,
  bassBoost: 0,
  skipSilence: false,
  autoScan: false,
  includeSubfolders: true,
  artworkSize: "medium",
  gaplessPlayback: true,
  fadeOnPause: true,
  resumeOnConnect: true,
  autoplay: true,
  theme: "dark",
  accentColor: "purple",
  compactMode: false,
  showVisualizer: true,
  telemetry: false,
  crashReports: false,
}

export type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialSettings,
      setSetting: (key, value) => set({ [key]: value } as any),
      resetSettings: () => set({ ...initialSettings }),
    }),
    {
      name: "resonance-settings",
    },
  ),
)
