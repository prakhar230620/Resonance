// File System Access API utilities with fallbacks

export interface FileSystemSupport {
  hasFileSystemAccess: boolean
  hasDirectoryPicker: boolean
  supportedFormats: string[]
}

export function getFileSystemSupport(): FileSystemSupport {
  // SSR-safe: during prerender there is no window
  if (typeof window === "undefined") {
    return {
      hasFileSystemAccess: false,
      hasDirectoryPicker: false,
      supportedFormats: ["mp3", "aac", "m4a", "wav", "ogg", "opus", "flac", "webm"],
    }
  }

  const hasFileSystemAccess = "showDirectoryPicker" in window
  const hasDirectoryPicker = "showDirectoryPicker" in window

  // Common audio formats supported by browsers
  const supportedFormats = ["mp3", "aac", "m4a", "wav", "ogg", "opus", "flac", "webm"]

  return {
    hasFileSystemAccess,
    hasDirectoryPicker,
    supportedFormats,
  }
}

export async function checkAudioSupport(mimeType: string): Promise<boolean> {
  if (typeof window === "undefined") return false

  if ("MediaCapabilities" in window) {
    try {
      const result = await (navigator.mediaCapabilities as any).decodingInfo({
        type: "file",
        audio: {
          contentType: mimeType as string,
          channels: 2,
          bitrate: 128000,
          samplerate: 44100,
        },
      })
      return result.supported
    } catch {
      // Fallback to basic audio element test
    }
  }

  // Fallback: test with audio element
  if (typeof document === "undefined") return false
  const audio = document.createElement("audio")
  return audio.canPlayType(mimeType) !== ""
}

export function getAudioMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    aac: "audio/aac",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    opus: "audio/opus",
    flac: "audio/flac",
    webm: "audio/webm",
    "3gp": "audio/3gpp",
    amr: "audio/amr",
    wma: "audio/x-ms-wma",
  }

  return mimeTypes[extension.toLowerCase()] || "audio/*"
}

export function isAudioFile(filename: string): boolean {
  const audioExtensions = ["mp3", "aac", "m4a", "wav", "ogg", "opus", "flac", "webm", "3gp", "amr", "wma", "mka"]

  const extension = filename.split(".").pop()?.toLowerCase()
  return extension ? audioExtensions.includes(extension) : false
}

export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === "undefined") return null
  try {
    if ("showDirectoryPicker" in window) {
      // Some browsers throw when passing startIn; keep call minimal for compatibility
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "read" })
      return dirHandle
    }
  } catch (error) {
    console.warn("Directory picker failed:", error)
  }

  return null
}

export async function* walkDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path = "",
): AsyncGenerator<{ file: File; path: string; handle: FileSystemFileHandle; parentDir?: FileSystemDirectoryHandle }> {
  try {
    for await (const [name, handle] of (dirHandle as any).entries()) {
      const currentPath = path ? `${path}/${name}` : name

      if (handle.kind === "file" && isAudioFile(name)) {
        try {
          const file = await handle.getFile()
          yield { file, path: currentPath, handle, parentDir: dirHandle }
        } catch (error) {
          console.warn(`Failed to access file ${currentPath}:`, error)
        }
      } else if (handle.kind === "directory") {
        // Recursively walk subdirectories
        yield* walkDirectory(handle, currentPath)
      }
    }
  } catch (error) {
    console.warn(`Failed to walk directory ${path}:`, error)
  }
}

// Fallback for browsers without File System Access API
export function createFileInput(multiple = true, directory = false): Promise<FileList | null> {
  if (typeof document === "undefined") return Promise.resolve(null)
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = multiple
    input.accept = "audio/*"

    if (directory) {
      ;(input as any).webkitdirectory = true
    }

    input.onchange = () => {
      resolve(input.files)
    }

    input.oncancel = () => {
      resolve(null)
    }

    input.click()
  })
}
