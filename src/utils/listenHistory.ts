import type { Song } from '../context/PlayerContext'

export interface HistoryTrack extends Song {
  playedAt?: number
  playCount?: number
}

const STORAGE_KEY = 'sw_listen_history'
const MAX_HISTORY_ITEMS = 100

/**
 * Get all persisted listening history items
 */
export const getLocalListenHistory = (): HistoryTrack[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Record a song playback event to local persistent storage.
 * Updates play counts, timestamps, and keeps recency order.
 */
export const recordSongPlay = (song: Song): HistoryTrack[] => {
  if (!song || (!song.id && !song.title)) return getLocalListenHistory()

  try {
    const history = getLocalListenHistory()
    const songId = song.id || `${song.title}_${song.artist}`
    
    // Find existing entry
    const existingIndex = history.findIndex(
      item => (item.id && item.id === song.id) ||
              (item.title?.toLowerCase() === song.title?.toLowerCase() &&
               item.artist?.toLowerCase() === (song.artist || '').toLowerCase())
    )

    let currentPlayCount = 1
    if (existingIndex !== -1) {
      currentPlayCount = (history[existingIndex].playCount || 1) + 1
      history.splice(existingIndex, 1)
    }

    const updatedItem: HistoryTrack = {
      ...song,
      playedAt: Date.now(),
      playCount: currentPlayCount
    }

    const newHistory = [updatedItem, ...history].slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
    window.dispatchEvent(new CustomEvent('soundwave-history-updated', { detail: newHistory }))
    return newHistory
  } catch (err) {
    console.warn('Failed to record listen history:', err)
    return getLocalListenHistory()
  }
}

/**
 * Clear listening history
 */
export const clearLocalListenHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('soundwave-history-updated', { detail: [] }))
  } catch {}
}

export const clearListenHistory = clearLocalListenHistory

