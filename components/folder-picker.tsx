"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderOpen, Upload, Music, AlertCircle, CheckCircle, X, Smartphone, Monitor } from "lucide-react"
import {
  getFileSystemSupport,
  requestDirectoryAccess,
  walkDirectory,
  createFileInput,
  checkAudioSupport,
  getAudioMimeType,
  isAudioFile,
} from "@/lib/file-system"
import { parseAudioMetadata, createTrackFromFile, getAudioDuration } from "@/lib/metadata-parser"
import { useLibraryStore } from "@/lib/stores/library-store"
import { toast } from "@/hooks/use-toast"
import { addSavedFolder } from "@/lib/folder-access"
import { useRouter } from "next/navigation"

interface ScanResult {
  totalFiles: number
  processedFiles: number
  addedTracks: number
  skippedFiles: number
  errors: string[]
}

export function FolderPicker() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState<string>("")
  const [showSupport, setShowSupport] = useState(false)

  const { addTracks, setScanProgress, setIsScanning: setLibraryScanning } = useLibraryStore()
  const support = getFileSystemSupport()
  const router = useRouter()

  const processFiles = useCallback(
    async (files: { file: File; path: string; handle?: FileSystemFileHandle; parentDir?: FileSystemDirectoryHandle }[]) => {
      const result: ScanResult = {
        totalFiles: files.length,
        processedFiles: 0,
        addedTracks: 0,
        skippedFiles: 0,
        errors: [],
      }

      setIsScanning(true)
      setLibraryScanning(true)
      setScanResult(result)
      setProgress(0)

      const tracks = []
      let unsupportedToastCount = 0

      for (let i = 0; i < files.length; i++) {
        const { file, path, handle } = files[i]
        setCurrentFile(file.name)

        try {
          // Check if file format is supported
          const extension = file.name.split(".").pop()?.toLowerCase() || ""
          const mimeType = getAudioMimeType(extension)
          const isSupported = await checkAudioSupport(mimeType)

          if (!isSupported) {
            result.skippedFiles++
            result.errors.push(`Unsupported format: ${file.name}`)
            if (unsupportedToastCount < 3) {
              try {
                toast({
                  title: "Unsupported format",
                  description: `${file.name} is not supported by this browser`,
                  variant: "destructive",
                })
              } catch {}
              unsupportedToastCount++
            }
            continue
          }

          // Parse metadata
          const metadata = await parseAudioMetadata(file)

          // Get duration if not available from metadata
          if (!metadata.duration) {
            metadata.duration = await getAudioDuration(file)
          }

          // Create track object
          const track = createTrackFromFile(file, metadata, path, handle, (files[i] as any).parentDir)
          tracks.push(track)
          result.addedTracks++
        } catch (error) {
          result.errors.push(`Failed to process ${file.name}: ${error}`)
          result.skippedFiles++
        }

        result.processedFiles++
        const progressPercent = (result.processedFiles / result.totalFiles) * 100
        setProgress(progressPercent)
        setScanProgress(progressPercent)

        // Yield control to prevent blocking UI
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      // Add all tracks to library
      if (tracks.length > 0) {
        addTracks(tracks)
      }

      setIsScanning(false)
      setLibraryScanning(false)
      setScanResult(result)
      setCurrentFile("")
      setScanProgress(0)

      try {
        toast({
          title: "Scan complete",
          description: `${result.addedTracks} added, ${result.skippedFiles} skipped` +
            (result.errors.length ? ` • ${result.errors.length} issues` : ""),
        })
      } catch {}

      // If we added tracks, navigate to Library to show results
      if (result.addedTracks > 0) {
        try {
          router.push("/library")
        } catch {}
      }
    },
    [addTracks, setScanProgress, setLibraryScanning, router],
  )

  const handleDirectoryPicker = useCallback(async () => {
    try {
      const dirHandle = await requestDirectoryAccess()
      if (!dirHandle) {
        // Fall back to file picker
        try {
          toast({ title: "Folder picker unavailable", description: "Switching to file picker..." })
        } catch {}
        await handleFilePicker()
        return
      }

      // Persist this folder for auto-rescan in future app opens
      try {
        await addSavedFolder(dirHandle)
        toast({ title: "Folder saved", description: "This folder will be scanned automatically next time." })
      } catch {}

      const files = []
      for await (const fileInfo of walkDirectory(dirHandle)) {
        files.push(fileInfo)
      }

      if (files.length === 0) {
        setScanResult({
          totalFiles: 0,
          processedFiles: 0,
          addedTracks: 0,
          skippedFiles: 0,
          errors: ["No audio files found in the selected folder"],
        })
        return
      }

      await processFiles(files)
    } catch (error) {
      console.error("Directory picker failed:", error)
      try {
        toast({
          title: "Folder selection failed",
          description: "Opening file picker as a fallback...",
          variant: "destructive",
        })
      } catch {}
      await handleFilePicker()
    }
  }, [processFiles])

  const handleFilePicker = useCallback(async () => {
    try {
      const fileList = await createFileInput(true, true)
      if (!fileList || fileList.length === 0) {
        try {
          toast({ title: "No files selected", description: "Please choose audio files or a folder." })
        } catch {}
        return
      }

      const files = Array.from(fileList)
        .filter((file) => isAudioFile(file.name))
        .map((file) => ({
          file,
          path: file.webkitRelativePath || file.name,
        }))

      if (files.length === 0) {
        setScanResult({
          totalFiles: 0,
          processedFiles: 0,
          addedTracks: 0,
          skippedFiles: 0,
          errors: ["No audio files found in the selected files"],
        })
        return
      }

      await processFiles(files)
    } catch (error) {
      console.error("File picker failed:", error)
      setScanResult({
        totalFiles: 0,
        processedFiles: 0,
        addedTracks: 0,
        skippedFiles: 0,
        errors: [`Failed to access files: ${error}`],
      })
    }
  }, [processFiles])

  const clearResults = () => {
    setScanResult(null)
    setProgress(0)
    setCurrentFile("")
  }

  return (
    <div className="space-y-6">
      {/* Browser Support Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Browser Support</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowSupport(!showSupport)}>
            {showSupport ? "Hide" : "Show"} Details
          </Button>
        </div>

        {showSupport && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              {support.hasFileSystemAccess ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span>File System Access API: {support.hasFileSystemAccess ? "Supported" : "Not supported"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Best experience on Chrome/Edge for Android</span>
            </div>

            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span>Fallback file picker available for other browsers</span>
            </div>
          </div>
        )}
      </Card>

      {/* Folder Selection */}
      {!isScanning && !scanResult && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Add Your Music</h2>
            <p className="text-muted-foreground mb-6">
              Select a folder containing your music files to add them to your library.
            </p>
          </div>

          <div className="space-y-3">
            {support.hasDirectoryPicker && (
              <Button onClick={handleDirectoryPicker} className="w-full h-14 justify-start gap-4" size="lg">
                <FolderOpen className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Select Music Folder</div>
                  <div className="text-sm opacity-90">Browse and select a folder (Recommended)</div>
                </div>
              </Button>
            )}

            <Button
              onClick={handleFilePicker}
              variant="outline"
              className="w-full h-14 justify-start gap-4 bg-transparent"
              size="lg"
            >
              <Upload className="w-6 h-6" />
              <div className="text-left">
                <div className="font-semibold">Select Music Files</div>
                <div className="text-sm text-muted-foreground">Choose individual files or folders</div>
              </div>
            </Button>
          </div>

          <Alert>
            <Music className="w-4 h-4" />
            <AlertDescription>
              Supported formats: MP3, AAC, M4A, WAV, OGG, OPUS, FLAC, and more. Files are processed locally and never
              uploaded.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Scanning Progress */}
      {isScanning && (
        <Card className="p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Scanning Your Music</h3>
            <p className="text-sm text-muted-foreground">Processing audio files and extracting metadata...</p>
          </div>

          <div className="space-y-3">
            <Progress value={progress} className="w-full" />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Math.round(progress)}% complete</span>
              <span>
                {scanResult?.processedFiles || 0} / {scanResult?.totalFiles || 0} files
              </span>
            </div>

            {currentFile && (
              <p className="text-xs text-center text-muted-foreground truncate">Processing: {currentFile}</p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setIsScanning(false)
              setLibraryScanning(false)
              clearResults()
            }}
            className="w-full mt-4"
          >
            Cancel
          </Button>
        </Card>
      )}

      {/* Scan Results */}
      {scanResult && !isScanning && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Scan Complete</h3>
            <Button variant="ghost" size="icon" onClick={clearResults}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{scanResult.addedTracks}</p>
              <p className="text-sm text-muted-foreground">Added</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{scanResult.skippedFiles}</p>
              <p className="text-sm text-muted-foreground">Skipped</p>
            </div>
          </div>

          {scanResult.errors.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <details>
                  <summary className="cursor-pointer font-medium">{scanResult.errors.length} issues found</summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {scanResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-muted-foreground">
                        • {error}
                      </li>
                    ))}
                    {scanResult.errors.length > 5 && (
                      <li className="text-muted-foreground">• ... and {scanResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </details>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={clearResults} className="flex-1">
              Add More Music
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Done
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
