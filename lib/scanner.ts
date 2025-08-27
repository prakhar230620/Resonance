import { getSavedFolders, verifyPermission } from "@/lib/folder-access"
import { walkDirectory, checkAudioSupport, getAudioMimeType } from "@/lib/file-system"
import { parseAudioMetadata, createTrackFromFile, getAudioDuration } from "@/lib/metadata-parser"
import { useLibraryStore } from "@/lib/stores/library-store"
import { useSettingsStore } from "@/lib/stores/settings-store"

export async function scanSavedFolders() {
  const { addTracks, setIsScanning, setScanProgress } = useLibraryStore.getState()
  const { includeSubfolders } = useSettingsStore.getState()
  setIsScanning(true)
  setScanProgress(0)

  try {
    const saved = await getSavedFolders()
    if (!saved.length) return

    const allTracks: any[] = []
    let totalFiles = 0
    let processed = 0

    // Count first
    for (const { handle } of saved) {
      if (!(await verifyPermission(handle, "read"))) continue
      for await (const _entry of walkDirectory(handle)) {
        // If includeSubfolders is false, skip entries that are in subdirectories
        // Assume entry has a path like "filename.ext" or "sub/filename.ext"
        const path = (_entry as any).path as string | undefined
        if (!includeSubfolders && path && path.includes("/")) continue
        totalFiles++
      }
    }

    // Process
    for (const { handle } of saved) {
      if (!(await verifyPermission(handle, "read"))) continue
      for await (const { file, path, handle: fileHandle, parentDir } of walkDirectory(handle)) {
        if (!includeSubfolders && path && path.includes("/")) {
          // Skip files within subfolders if disabled
          continue
        }
        try {
          const ext = file.name.split(".").pop()?.toLowerCase() || ""
          const mime = getAudioMimeType(ext)
          const supported = await checkAudioSupport(mime)
          if (!supported) continue

          const metadata = await parseAudioMetadata(file)
          if (!metadata.duration) metadata.duration = await getAudioDuration(file)
          const track = createTrackFromFile(file, metadata, path, fileHandle, parentDir)
          allTracks.push(track)
        } finally {
          processed++
          setScanProgress((processed / Math.max(1, totalFiles)) * 100)
        }
      }
    }

    if (allTracks.length) addTracks(allTracks)
  } finally {
    setIsScanning(false)
    setScanProgress(0)
  }
}
