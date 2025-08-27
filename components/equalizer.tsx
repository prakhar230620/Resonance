"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EQUALIZER_FREQUENCIES, EQUALIZER_PRESETS, type EqualizerPreset } from "@/lib/audio-effects"

interface EqualizerProps {
  onBandChange: (bandIndex: number, gain: number) => void
  onPresetChange: (preset: EqualizerPreset) => void
}

export function Equalizer({ onBandChange, onPresetChange }: EqualizerProps) {
  const [gains, setGains] = useState<number[]>(new Array(10).fill(0))
  const [selectedPreset, setSelectedPreset] = useState<string>("Flat")

  const handleBandChange = (bandIndex: number, value: number[]) => {
    const gain = value[0]
    const newGains = [...gains]
    newGains[bandIndex] = gain
    setGains(newGains)
    onBandChange(bandIndex, gain)
  }

  const handlePresetChange = (presetName: string) => {
    const preset = EQUALIZER_PRESETS.find((p) => p.name === presetName)
    if (!preset) return

    setSelectedPreset(presetName)
    setGains(preset.bands)
    onPresetChange(preset)
  }

  const resetEqualizer = () => {
    handlePresetChange("Flat")
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Equalizer</h3>
        <Button variant="outline" size="sm" onClick={resetEqualizer}>
          Reset
        </Button>
      </div>

      {/* Preset Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Preset</label>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EQUALIZER_PRESETS.map((preset) => (
              <SelectItem key={preset.name} value={preset.name}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* EQ Bands */}
      <div className="space-y-4">
        {EQUALIZER_FREQUENCIES.map((frequency, index) => (
          <div key={frequency} className="flex items-center gap-3">
            <div className="w-12 text-xs text-muted-foreground text-right">
              {frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`}
            </div>

            <div className="flex-1">
              <Slider
                value={[gains[index]]}
                onValueChange={(value) => handleBandChange(index, value)}
                min={-12}
                max={12}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="w-8 text-xs text-muted-foreground text-center">
              {gains[index] > 0 ? "+" : ""}
              {gains[index].toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center">
        Drag sliders to adjust frequency bands (-12dB to +12dB)
      </div>
    </Card>
  )
}
