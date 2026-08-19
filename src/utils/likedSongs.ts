import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Song } from '../context/PlayerContext'

const LOCAL_STORAGE_KEY = 'sw_liked_songs'

export const getLocalLikedSongs = (): Song[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export const saveLocalLikedSongs = (songs: Song[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(songs))
    window.dispatchEvent(new Event('soundwave-liked-updated'))

    // Automatic silent sync to Firestore root user doc
    const uid = auth.currentUser?.uid
    if (uid) {
      const docRef = doc(db, 'users', uid)
      setDoc(docRef, { likedSongs: songs, updatedAt: Date.now() }, { merge: true }).catch(() => {
        // Silently ignore if network blocked by client/adblocker or rules
      })
    }
  } catch (e) {
    console.error('Error saving liked songs locally:', e)
  }
}

export const fetchRemoteLikedSongs = async (userId?: string): Promise<Song[]> => {
  const uid = userId || auth.currentUser?.uid
  if (!uid) return getLocalLikedSongs()
  try {
    const docRef = doc(db, 'users', uid)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      const data = snap.data()
      if (Array.isArray(data.likedSongs)) {
        const local = getLocalLikedSongs()
        const mergedMap = new Map<string, Song>()

        data.likedSongs.forEach((s: Song) => {
          if (s && (s.id || s.title)) mergedMap.set(s.id || `${s.title}_${s.artist}`, s)
        })
        local.forEach((s: Song) => {
          if (s && (s.id || s.title)) mergedMap.set(s.id || `${s.title}_${s.artist}`, s)
        })

        const merged = Array.from(mergedMap.values())
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged))
        window.dispatchEvent(new Event('soundwave-liked-updated'))
        return merged
      }
    }
  } catch {
    // Silently fall back to local storage
  }
  return getLocalLikedSongs()
}

export const syncRemoteLikedSongs = async (userId: string, songs: Song[]) => {
  saveLocalLikedSongs(songs)
  if (!userId) return
  try {
    const docRef = doc(db, 'users', userId)
    await setDoc(docRef, { likedSongs: songs, updatedAt: Date.now() }, { merge: true })
  } catch {
    // Silently fall back
  }
}
