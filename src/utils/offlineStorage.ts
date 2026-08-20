// Offline Storage Service using IndexedDB for offline audio playback anywhere
import type { Song } from '../context/PlayerContext'
import { getAudioStreamUrl } from './ytMusic'

const DB_NAME = 'soundwave_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'offline_songs'

export interface OfflineSongRecord {
  id: string
  title: string
  artist: string
  duration: number
  coverArtBase64?: string
  lyrics?: string
  youtubeUrl?: string
  playlistId?: string
  audioBlob: Blob
  downloadedAt: number
  sizeBytes: number
}

// Active Object URLs to revoke when not needed
const activeBlobUrls = new Map<string, string>()

/**
 * Open IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Check if a song is available offline
 */
export const isSongOffline = async (songId: string): Promise<boolean> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(songId)
      req.onsuccess = () => resolve(!!req.result)
      req.onerror = () => resolve(false)
    })
  } catch (e) {
    return false
  }
}

/**
 * Download a song and store it in IndexedDB for offline playback
 */
export const downloadSongForOffline = async (
  song: Song,
  onProgress?: (progress: number) => void
): Promise<Song> => {
  let downloadUrl = song.url

  // If this is a YouTube song or lacks direct playable URL, resolve stream URL
  if (!downloadUrl || downloadUrl.startsWith('yt_stream://') || song.id.startsWith('yt_') || !downloadUrl.startsWith('http')) {
    const videoId = song.id.replace('yt_', '')
    downloadUrl = await getAudioStreamUrl(videoId, song.title, song.artist)
  }

  if (!downloadUrl) {
    throw new Error('Unable to resolve audio stream for download')
  }

  if (onProgress) onProgress(15)

  // Download audio as Blob via XMLHttpRequest to track progress
  const audioBlob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', downloadUrl)
    xhr.responseType = 'blob'

    xhr.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = 15 + Math.round((event.loaded / event.total) * 75)
        onProgress(Math.min(90, percent))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response)
      } else {
        reject(new Error(`Download failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error while downloading song'))
    xhr.send()
  })

  if (onProgress) onProgress(95)

  const record: OfflineSongRecord = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    coverArtBase64: song.coverArtBase64,
    lyrics: song.lyrics || '',
    youtubeUrl: (song as any).youtubeUrl,
    playlistId: 'offline',
    audioBlob: audioBlob,
    downloadedAt: Date.now(),
    sizeBytes: audioBlob.size
  }

  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })

  if (onProgress) onProgress(100)

  // Dispatch event so UI notices new offline song
  window.dispatchEvent(new CustomEvent('soundwave-offline-updated', { detail: { songId: song.id, action: 'added' } }))

  // Return song with playable Blob URL
  const blobUrl = URL.createObjectURL(audioBlob)
  activeBlobUrls.set(song.id, blobUrl)

  return {
    ...song,
    url: blobUrl,
    playlistId: 'offline'
  }
}

/**
 * Get all downloaded offline songs with usable blob URLs
 */
export const getOfflineSongs = async (): Promise<Song[]> => {
  try {
    const db = await openDB()
    const records: OfflineSongRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })

    return records.map((rec) => {
      // Reuse or create Blob URL
      let url = activeBlobUrls.get(rec.id)
      if (!url) {
        url = URL.createObjectURL(rec.audioBlob)
        activeBlobUrls.set(rec.id, url)
      }

      return {
        id: rec.id,
        title: rec.title,
        artist: rec.artist,
        duration: rec.duration,
        coverArtBase64: rec.coverArtBase64,
        lyrics: rec.lyrics,
        url,
        playlistId: 'offline',
        isOffline: true,
        sizeBytes: rec.sizeBytes,
        downloadedAt: rec.downloadedAt
      } as Song & { isOffline: boolean; sizeBytes: number; downloadedAt: number }
    })
  } catch (e) {
    console.error('Error fetching offline songs:', e)
    return []
  }
}

/**
 * Delete a downloaded song from offline storage
 */
export const deleteOfflineSong = async (songId: string): Promise<void> => {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(songId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })

  // Revoke Blob URL if allocated
  if (activeBlobUrls.has(songId)) {
    URL.revokeObjectURL(activeBlobUrls.get(songId)!)
    activeBlobUrls.delete(songId)
  }

  window.dispatchEvent(new CustomEvent('soundwave-offline-updated', { detail: { songId, action: 'deleted' } }))
}

/**
 * Clear all downloaded offline songs from storage
 */
export const clearAllOfflineSongs = async (): Promise<void> => {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })

    // Revoke all active blob URLs
    activeBlobUrls.forEach((url) => URL.revokeObjectURL(url))
    activeBlobUrls.clear()

    window.dispatchEvent(new CustomEvent('soundwave-offline-updated', { detail: { action: 'cleared' } }))
  } catch (e) {
    console.error('Error clearing offline songs:', e)
  }
}

/**
 * Get a specific offline song by its ID (returns cached Blob URL)
 */
export const getOfflineSongById = async (songId: string): Promise<Song | null> => {
  try {
    const db = await openDB()
    const rec: OfflineSongRecord | undefined = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(songId)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    if (!rec || !rec.audioBlob) return null

    let url = activeBlobUrls.get(rec.id)
    if (!url) {
      url = URL.createObjectURL(rec.audioBlob)
      activeBlobUrls.set(rec.id, url)
    }

    return {
      id: rec.id,
      title: rec.title,
      artist: rec.artist,
      duration: rec.duration,
      coverArtBase64: rec.coverArtBase64,
      lyrics: rec.lyrics,
      url,
      playlistId: 'offline',
      isOffline: true,
      sizeBytes: rec.sizeBytes,
      downloadedAt: rec.downloadedAt
    } as Song
  } catch (e) {
    return null
  }
}


