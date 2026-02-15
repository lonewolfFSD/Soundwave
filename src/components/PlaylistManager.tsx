import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'

interface PlaylistManagerProps {
  onBack: () => void
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ onBack }) => {
  const { user, loading: authLoading } = useAuth()  // ← add loading here
  const [playlistName, setPlaylistName] = useState('')
  const [coverArtBase64, setCoverArtBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // NEW: Show spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying your session...</p>
        </div>
      </div>
    )
  }

  // NEW: If auth finished but no user → show sign-in message
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Please sign in</h2>
          <p className="text-gray-400 mb-6">
            You need to be signed in to create playlists.
          </p>
          {/* Optional: add a login link/button */}
          {/* <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link> */}
        </div>
      </div>
    )
  }

  // Everything below is your original code — untouched
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverArtBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!playlistName.trim()) {
      setError('Playlist name cannot be empty')
      return
    }

    // This check is now safe — we already know user exists
    setLoading(true)
    try {
      await addDoc(collection(db, 'playlists'), {
        userId: user.id,
        name: playlistName,
        songCount: 0,
        createdAt: new Date(),
        coverArtBase64: coverArtBase64 || null,
      })
      setPlaylistName('')
      setCoverArtBase64(null)
      onBack()
    } catch (err: any) {
      setError(err.message || 'Failed to create playlist')
      console.error('Create playlist error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Create Playlist
        </h1>
        <p className="text-muted-foreground mb-8 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Start organizing your music today
        </p>

        <form onSubmit={handleCreatePlaylist} className="space-y-6">
          {/* Your original form fields remain 100% unchanged */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Playlist Name
            </label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full px-4 py-3 border text-base border-white/20 rounded-lg bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              placeholder="My Awesome Playlist"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              required
            />
          </div>

          {/* Cover Art Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Cover Art (optional)
            </label>
            <label className="cursor-pointer">
              <div className="
                w-full px-4 py-3 border border-white/20 rounded-lg 
                bg-black/70 text-gray-300 text-center hover:bg-white/5 transition
              ">
                {coverArtBase64 ? 'Change Cover Art' : 'Choose Image'}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {coverArtBase64 && (
              <div className="mt-4 flex justify-center">
                <img 
                  src={coverArtBase64} 
                  alt="Playlist cover preview" 
                  className="w-32 h-32 object-cover rounded-lg border border-white/20 shadow-sm"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 transition"
          >
            {loading ? 'Creating...' : 'Create Playlist'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PlaylistManager