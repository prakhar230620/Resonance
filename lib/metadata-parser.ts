// Metadata parsing utilities using music-metadata-browser

import type { Track } from "./stores/player-store"

export interface ParsedMetadata {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  genre?: string
  year?: number
  trackNumber?: number
  discNumber?: number
  duration?: number
  artwork?: string
}

// Lazy load music-metadata-browser to reduce initial bundle size
let musicMetadata: any = null

async function loadMusicMetadata() {
  if (!musicMetadata) {
    try {
      musicMetadata = await import("music-metadata-browser")
    } catch (error) {
      console.warn("Failed to load music-metadata-browser:", error)
      return null
    }
  }
  return musicMetadata
}

export async function parseAudioMetadata(file: File): Promise<ParsedMetadata> {
  const metadata: ParsedMetadata = {}

  try {
    const mm = await loadMusicMetadata()
    if (!mm) {
      // Fallback to basic file info
      return getBasicMetadata(file)
    }

    const result = await mm.parseBlob(file)
    const { common, format } = result

    metadata.title = common.title || getFilenameWithoutExtension(file.name)
    metadata.artist = common.artist || common.albumartist || "Unknown Artist"
    metadata.album = common.album || "Unknown Album"
    metadata.albumArtist = common.albumartist || common.artist
    metadata.genre = common.genre?.[0]
    metadata.year = common.year
    metadata.trackNumber = common.track?.no
    metadata.discNumber = common.disk?.no
    metadata.duration = format.duration

    // Extract artwork
    if (common.picture && common.picture.length > 0) {
      const picture = common.picture[0]
      const blob = new Blob([picture.data], { type: picture.format })
      metadata.artwork = URL.createObjectURL(blob)
    }
  } catch (error) {
    console.warn("Failed to parse metadata for", file.name, error)
    return getBasicMetadata(file)
  }

  return metadata
}

function getBasicMetadata(file: File): ParsedMetadata {
  const filename = getFilenameWithoutExtension(file.name)

  // Try to extract basic info from filename patterns
  // Common patterns: "Artist - Title", "Track - Artist - Title", etc.
  let title = filename
  let artist = "Unknown Artist"

  if (filename.includes(" - ")) {
    const parts = filename.split(" - ")
    if (parts.length >= 2) {
      artist = parts[0].trim()
      title = parts.slice(1).join(" - ").trim()
    }
  }

  return {
    title,
    artist,
    album: "Unknown Album",
    duration: 0, // Will be set when audio loads
  }
}

function getFilenameWithoutExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "")
}

export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio")
    const url = URL.createObjectURL(file)

    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration || 0)
    })

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url)
      resolve(0)
    })

    audio.src = url
  })
}

export function createTrackFromFile(
  file: File,
  metadata: ParsedMetadata,
  path: string,
  handle?: FileSystemFileHandle,
  parentDir?: FileSystemDirectoryHandle,
): Track {
  const url = URL.createObjectURL(file)

  return {
    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: metadata.title || getFilenameWithoutExtension(file.name),
    artist: metadata.artist || "Unknown Artist",
    album: metadata.album || "Unknown Album",
    genre: metadata.genre,
    year: metadata.year,
    trackNumber: metadata.trackNumber,
    duration: metadata.duration || 0,
    src: url,
    artwork: metadata.artwork,
    // Store file reference for potential future operations
    fileHandle: handle,
    fileParentDir: parentDir,
    filePath: path,
    fileSize: file.size,
  } as Track & {
    fileHandle?: FileSystemFileHandle
    fileParentDir?: FileSystemDirectoryHandle
    filePath?: string
    fileSize?: number
  }
}
