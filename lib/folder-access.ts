// Utilities to persist FileSystemDirectoryHandle(s) in IndexedDB and manage permissions

// Simple IndexedDB helpers (no external deps)
const DB_NAME = "resonance-fs"
const STORE_NAME = "dir-handles"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDirectoryHandle(key: string, handle: FileSystemDirectoryHandle) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put(handle, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function removeDirectoryHandle(key: string) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listDirectoryHandleKeys(): Promise<string[]> {
  const db = await openDb()
  const keys: string[] = []
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const req = store.openKeyCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        keys.push(String(cursor.key))
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
  db.close()
  return keys
}

export async function getAllDirectoryHandles(): Promise<Record<string, FileSystemDirectoryHandle>> {
  const db = await openDb()
  const out: Record<string, FileSystemDirectoryHandle> = {}
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const req = store.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        out[String(cursor.key)] = cursor.value as FileSystemDirectoryHandle
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
  db.close()
  return out
}

export async function verifyPermission(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "read",
): Promise<boolean> {
  // @ts-expect-error: non-standard types in lib.dom.d.ts across browsers
  const opts: FileSystemHandlePermissionDescriptor = { mode }
  // @ts-expect-error
  if ((await handle.queryPermission(opts)) === "granted") return true
  // @ts-expect-error
  if ((await handle.requestPermission(opts)) === "granted") return true
  return false
}

export type SavedFolder = { key: string; handle: FileSystemDirectoryHandle }

export async function addSavedFolder(handle: FileSystemDirectoryHandle) {
  const key = `folder-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await saveDirectoryHandle(key, handle)
  return key
}

export async function getSavedFolders(): Promise<SavedFolder[]> {
  const handles = await getAllDirectoryHandles()
  return Object.entries(handles).map(([key, handle]) => ({ key, handle }))
}

export async function removeSavedFolder(key: string) {
  await removeDirectoryHandle(key)
}
