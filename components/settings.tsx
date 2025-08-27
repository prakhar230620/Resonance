"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Volume2, Music, Palette, Shield, Trash2, Download, Upload } from "lucide-react"
import { usePlayerStore } from "@/lib/stores/player-store"
import { useLibraryStore } from "@/lib/stores/library-store"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { getAudioEngine } from "@/lib/audio-engine"

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const {
    volume,
    playbackRate,
    crossfadeEnabled,
    crossfadeDuration,
    setVolume,
    setPlaybackRate,
    setCrossfadeEnabled,
    setCrossfadeDuration,
  } = usePlayerStore()

  const { clearLibrary, stats } = useLibraryStore()

  const settings = useSettingsStore()
  const setSetting = useSettingsStore((s) => s.setSetting)

  const handleClearLibrary = () => {
    if (confirm("Are you sure you want to clear your entire music library? This cannot be undone.")) {
      clearLibrary()
    }
  }

  const handleExportData = () => {
    // TODO: Implement data export
    console.log("Export data")
  }

  const handleImportData = () => {
    // TODO: Implement data import
    console.log("Import data")
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border safe-area-top">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize your music experience</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="audio" className="h-full">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="playback">Playback</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <div className="p-4 h-full overflow-auto">
            <TabsContent value="audio" className="mt-0 space-y-6">
              {/* Volume & Effects */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Volume & Effects
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Master Volume</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Slider
                        value={[volume * 100]}
                        onValueChange={(value) => setVolume(value[0] / 100)}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Normalize Volume</Label>
                    <Switch
                      checked={settings.normalizeVolume}
                      onCheckedChange={(checked) => {
                        setSetting("normalizeVolume", checked)
                        getAudioEngine().setNormalizeVolume(checked)
                      }}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Bass Boost</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Slider
                        value={[settings.bassBoost]}
                        onValueChange={(value) => {
                          const v = value[0]
                          setSetting("bassBoost", v)
                          getAudioEngine().setBassBoost(v)
                        }}
                        max={12}
                        min={0}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">+{settings.bassBoost}dB</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Skip Silence</Label>
                    <Switch
                      checked={settings.skipSilence}
                      onCheckedChange={(checked) => setSetting("skipSilence", checked)}
                    />
                  </div>
                </div>
              </Card>

              {/* Crossfade */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Crossfade</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Enable Crossfade</Label>
                    <Switch checked={crossfadeEnabled} onCheckedChange={(checked) => setCrossfadeEnabled(checked)} />
                  </div>

                  {crossfadeEnabled && (
                    <div>
                      <Label className="text-sm font-medium">Crossfade Duration</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Slider
                          value={[crossfadeDuration]}
                          onValueChange={(value) => setCrossfadeDuration(value[0])}
                          max={12}
                          min={0}
                          step={0.5}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-12">{crossfadeDuration}s</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Playback Speed */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Playback Speed</h3>

                <div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[playbackRate]}
                      onValueChange={(value) => setPlaybackRate(value[0])}
                      max={2}
                      min={0.5}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12">{playbackRate.toFixed(1)}x</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Adjust playback speed (0.5x - 2.0x)</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="library" className="mt-0 space-y-6">
              {/* Library Stats */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  Library Statistics
                </h3>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.totalTracks}</p>
                    <p className="text-sm text-muted-foreground">Songs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.totalArtists}</p>
                    <p className="text-sm text-muted-foreground">Artists</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.totalAlbums}</p>
                    <p className="text-sm text-muted-foreground">Albums</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{Math.round(stats.totalDuration / 3600)}h</p>
                    <p className="text-sm text-muted-foreground">Duration</p>
                  </div>
                </div>
              </Card>

              {/* Library Settings */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Library Settings</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Auto-scan folders</Label>
                    <Switch
                      checked={settings.autoScan}
                      onCheckedChange={(checked) => setSetting("autoScan", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Include subfolders</Label>
                    <Switch
                      checked={settings.includeSubfolders}
                      onCheckedChange={(checked) => setSetting("includeSubfolders", checked)}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Artwork size</Label>
                    <Select value={settings.artworkSize} onValueChange={(value) => setSetting("artworkSize", value as any)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (128px)</SelectItem>
                        <SelectItem value="medium">Medium (256px)</SelectItem>
                        <SelectItem value="large">Large (512px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Data Management */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Data Management</h3>

                <div className="space-y-3">
                  <Button variant="outline" onClick={handleExportData} className="w-full justify-start bg-transparent">
                    <Download className="w-4 h-4 mr-2" />
                    Export Library Data
                  </Button>

                  <Button variant="outline" onClick={handleImportData} className="w-full justify-start bg-transparent">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Library Data
                  </Button>

                  <Separator />

                  <Button variant="destructive" onClick={handleClearLibrary} className="w-full justify-start">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Library
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="playback" className="mt-0 space-y-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Playback Behavior</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Gapless playback</Label>
                    <Switch
                      checked={settings.gaplessPlayback}
                      onCheckedChange={(checked) => setSetting("gaplessPlayback", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fade on pause</Label>
                    <Switch
                      checked={settings.fadeOnPause}
                      onCheckedChange={(checked) => setSetting("fadeOnPause", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Auto-play on device connect</Label>
                    <Switch
                      checked={settings.resumeOnConnect}
                      onCheckedChange={(checked) => setSetting("resumeOnConnect", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Auto-play next song</Label>
                    <Switch
                      checked={settings.autoplay}
                      onCheckedChange={(checked) => setSetting("autoplay", checked)}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="mt-0 space-y-6">
              {/* Appearance */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Theme</Label>
                    <Select value={settings.theme} onValueChange={(value) => setSetting("theme", value as any)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Accent Color</Label>
                    <Select value={settings.accentColor} onValueChange={(value) => setSetting("accentColor", value as any)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Compact mode</Label>
                    <Switch
                      checked={settings.compactMode}
                      onCheckedChange={(checked) => setSetting("compactMode", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Show visualizer</Label>
                    <Switch
                      checked={settings.showVisualizer}
                      onCheckedChange={(checked) => setSetting("showVisualizer", checked)}
                    />
                  </div>
                </div>
              </Card>

              {/* Privacy */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Anonymous telemetry</Label>
                      <p className="text-xs text-muted-foreground">Help improve the app</p>
                    </div>
                    <Switch
                      checked={settings.telemetry}
                      onCheckedChange={(checked) => setSetting("telemetry", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Crash reports</Label>
                      <p className="text-xs text-muted-foreground">Send crash data to developers</p>
                    </div>
                    <Switch
                      checked={settings.crashReports}
                      onCheckedChange={(checked) => setSetting("crashReports", checked)}
                    />
                  </div>
                </div>
              </Card>

              {/* About */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">About</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Build</span>
                    <span>2024.01.01</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform</span>
                    <span>PWA</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
