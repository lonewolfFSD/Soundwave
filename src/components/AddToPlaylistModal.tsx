import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, where, getDocs, doc, setDoc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore'
import { X, Plus, Check, Loader2, ListMusic, Music } from 'lucide-react'
import type { Song } from '../context/PlayerContext'

interface AddToPlaylistModalProps {
  song: Song | null
  isOpen: boolean
  onClose: () => void
}

interface Playlist {
  id: string
  name: string
  songCount: number
  coverArtBase64?: string
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, isOpen, onClose }) => {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isOpen || !user?.id || !song) return

    const loadPlaylists = async () => {
      setLoading(true)
      try {
        const q = query(collection(db, 'playlists'), where('userId', '==', user.id))
        const snapshot = await getDocs(q)
        const list: Playlist[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Untitled',
          songCount: doc.data().songCount || 0,
          coverArtBase64: doc.data().coverArtBase64
        }))
        setPlaylists(list)

        // Check which playlists already have this song
        const alreadyIn = new Set<string>()
        for (const pl of list) {
          const songDoc = await getDocs(query(collection(db, 'playlists', pl.id, 'songs'), where('id', '==', song.id)))
          if (!songDoc.empty) {
            alreadyIn.add(pl.id)
          }
        }
        setAddedIds(alreadyIn)
      } catch (err) {
        console.error('Error loading playlists:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlaylists()
  }, [isOpen, user?.id, song])

  if (!isOpen || !song) return null

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!user?.id || addedIds.has(playlist.id)) return

    setAddingTo(playlist.id)
    try {
      // 1. Add song document inside playlist subcollection
      const songRef = doc(db, 'playlists', playlist.id, 'songs', song.id)
      await setDoc(songRef, {
        id: song.id,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        duration: song.duration || 0,
        url: song.url,
        coverArtBase64: song.coverArtBase64 || '',
        lyrics: song.lyrics || '',
        youtubeUrl: (song as any).youtubeUrl || '',
        addedAt: new Date().toISOString()
      })

      // 2. Update song count in the playlist document
      const playlistRef = doc(db, 'playlists', playlist.id)
      await updateDoc(playlistRef, {
        songCount: increment(1),
        coverArtBase64: playlist.coverArtBase64 || song.coverArtBase64 || null
      })

      setAddedIds(prev => new Set([...prev, playlist.id]))
    } catch (err) {
      console.error('Failed to add song to playlist:', err)
      alert('Could not add to playlist. Please try again.')
    } finally {
      setAddingTo(null)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim() || !user?.id) return
    setCreating(true)

    try {
      // Create new playlist
      const plRef = await addDoc(collection(db, 'playlists'), {
        userId: user.id,
        name: newPlaylistName.trim(),
        songCount: 1,
        coverArtBase64: song.coverArtBase64 || null,
        createdAt: serverTimestamp()
      })

      // Add song to it
      const songRef = doc(db, 'playlists', plRef.id, 'songs', song.id)
      await setDoc(songRef, {
        id: song.id,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        duration: song.duration || 0,
        url: song.url,
        coverArtBase64: song.coverArtBase64 || '',
        lyrics: song.lyrics || '',
        youtubeUrl: (song as any).youtubeUrl || '',
        addedAt: new Date().toISOString()
      })

      setPlaylists(prev => [
        { id: plRef.id, name: newPlaylistName.trim(), songCount: 1, coverArtBase64: song.coverArtBase64 },
        ...prev
      ])
      setAddedIds(prev => new Set([...prev, plRef.id]))
      setNewPlaylistName('')
      setShowCreateInput(false)
    } catch (err) {
      console.error('Failed to create playlist:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f11] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/40">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <ListMusic className="text-indigo-400" size={20} />
              Add to Playlist
            </h3>
            <p className="text-xs text-white/50 truncate max-w-[280px] mt-0.5 font-medium">
              {song.title} — {song.artist}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {/* Create New Playlist option */}
          {!showCreateInput ? (
            <button
              onClick={() => setShowCreateInput(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-white/80 hover:text-white transition-all text-sm font-semibold"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Plus size={20} />
              </div>
              <span>New Playlist</span>
            </button>
          ) : (
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateInput(false)}
                  className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={creating || !newPlaylistName.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating && <Loader2 size={12} className="animate-spin" />}
                  Create & Add
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-white/40 gap-2">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs">Loading playlists...</span>
            </div>
          ) : playlists.length === 0 ? (
            <div className="py-6 text-center text-white/40 text-xs">
              No playlists found. Create your first playlist above!
            </div>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedIds.has(pl.id)
              const isAdding = addingTo === pl.id

              return (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-black/50 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {pl.coverArtBase64 ? (
                        <img src={pl.coverArtBase64} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="text-white/30" size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{pl.name}</p>
                      <p className="text-[11px] text-white/40">{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddToPlaylist(pl)}
                    disabled={isAdded || isAdding}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 active:scale-95'
                    }`}
                  >
                    {isAdding ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isAdded ? (
                      <>
                        <Check size={14} /> Added
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Add
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddToPlaylistModal
