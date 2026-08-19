import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

interface PlaylistManagerProps {
  onBack: () => void
}

const getThemeStyles = (theme: string) => {
  const themes: Record<string, any> = {
    default: {
      mainBg: 'bg-black',
      textMain: 'text-white',
      textMuted: 'text-zinc-400',
      inputBg: 'bg-zinc-900 border-white/10 placeholder-zinc-600',
      focusRing: 'focus:border-indigo-500 focus:ring-indigo-500',
      uploadBg: 'bg-zinc-900/50 hover:bg-zinc-900 border-white/10 hover:border-indigo-500/50',
      iconColor: 'text-zinc-500 group-hover:text-indigo-400',
      primaryBtn: 'bg-white text-black hover:bg-zinc-200 shadow-white/5',
      spinner: 'border-black/30 border-t-black',
      headerBorder: 'border-white/10'
    },
    sunset: {
      mainBg: 'bg-[#0f0604]',
      textMain: 'text-orange-50',
      textMuted: 'text-orange-200/60',
      inputBg: 'bg-[#1a0502]/80 border-orange-500/20 placeholder-orange-500/40',
      focusRing: 'focus:border-orange-500 focus:ring-orange-500',
      uploadBg: 'bg-[#1a0502]/50 hover:bg-[#2a0808] border-orange-500/20 hover:border-orange-500/50',
      iconColor: 'text-orange-500/50 group-hover:text-orange-400',
      primaryBtn: 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-orange-500/20'
    },
    valentine: {
      mainBg: 'bg-[#14050a]',
      textMain: 'text-pink-50',
      textMuted: 'text-pink-200/60',
      inputBg: 'bg-[#1f0610]/80 border-pink-500/20 placeholder-pink-500/40',
      focusRing: 'focus:border-pink-500 focus:ring-pink-500',
      uploadBg: 'bg-[#1f0610]/50 hover:bg-[#330a1a] border-pink-500/20 hover:border-pink-500/50',
      iconColor: 'text-pink-500/50 group-hover:text-pink-400',
      primaryBtn: 'bg-pink-600 text-white hover:bg-pink-500 shadow-pink-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-pink-500/20'
    },
    jungle: {
      mainBg: 'bg-[#021008]',
      textMain: 'text-emerald-50',
      textMuted: 'text-emerald-200/60',
      inputBg: 'bg-[#03170b]/80 border-emerald-500/20 placeholder-emerald-500/40',
      focusRing: 'focus:border-emerald-500 focus:ring-emerald-500',
      uploadBg: 'bg-[#03170b]/50 hover:bg-[#062414] border-emerald-500/20 hover:border-emerald-500/50',
      iconColor: 'text-emerald-500/50 group-hover:text-emerald-400',
      primaryBtn: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-emerald-500/20'
    },
    ocean: {
      mainBg: 'bg-[#02090e]',
      textMain: 'text-cyan-50',
      textMuted: 'text-cyan-200/60',
      inputBg: 'bg-[#04121c]/80 border-cyan-500/20 placeholder-cyan-500/40',
      focusRing: 'focus:border-cyan-500 focus:ring-cyan-500',
      uploadBg: 'bg-[#04121c]/50 hover:bg-[#061a29] border-cyan-500/20 hover:border-cyan-500/50',
      iconColor: 'text-cyan-500/50 group-hover:text-cyan-400',
      primaryBtn: 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-cyan-500/20'
    },
    cyberpunk: {
      mainBg: 'bg-[#090111]',
      textMain: 'text-fuchsia-50',
      textMuted: 'text-fuchsia-200/60',
      inputBg: 'bg-[#120322]/80 border-fuchsia-500/20 placeholder-fuchsia-500/40',
      focusRing: 'focus:border-fuchsia-500 focus:ring-fuchsia-500',
      uploadBg: 'bg-[#120322]/50 hover:bg-[#22063b] border-fuchsia-500/20 hover:border-fuchsia-500/50',
      iconColor: 'text-fuchsia-500/50 group-hover:text-fuchsia-400',
      primaryBtn: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-fuchsia-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-fuchsia-500/20'
    },
    midnight: {
      mainBg: 'bg-[#07030e]',
      textMain: 'text-violet-50',
      textMuted: 'text-violet-200/60',
      inputBg: 'bg-[#0f071c]/80 border-violet-500/20 placeholder-violet-500/40',
      focusRing: 'focus:border-violet-500 focus:ring-violet-500',
      uploadBg: 'bg-[#0f071c]/50 hover:bg-[#1a0c30] border-violet-500/20 hover:border-violet-500/50',
      iconColor: 'text-violet-500/50 group-hover:text-violet-400',
      primaryBtn: 'bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-violet-500/20'
    },
    coffee: {
      mainBg: 'bg-[#0a0603]',
      textMain: 'text-amber-50',
      textMuted: 'text-amber-200/60',
      inputBg: 'bg-[#140c06]/80 border-amber-600/20 placeholder-amber-600/40',
      focusRing: 'focus:border-amber-600 focus:ring-amber-600',
      uploadBg: 'bg-[#140c06]/50 hover:bg-[#26150a] border-amber-600/20 hover:border-amber-600/50',
      iconColor: 'text-amber-600/50 group-hover:text-amber-400',
      primaryBtn: 'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-600/20',
      spinner: 'border-white/30 border-t-white',
      headerBorder: 'border-amber-600/20'
    }
  }
  return themes[theme] || themes['default']
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ onBack }) => {
  const { user, loading: authLoading } = useAuth()
  const [playlistName, setPlaylistName] = useState('')
  const [coverArtBase64, setCoverArtBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Theme locked to native only
  const [theme, setTheme] = useState(() => {
    localStorage.getItem('soundwave_theme') || 'default';
  })

  // Reduce motion active for all platforms
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true');

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform()
    
  const handleThemeUpdate = () => {
  // Removed the isNative check
  setTheme(localStorage.getItem('soundwave_theme') || 'default');
};

    const handleSettingsUpdate = () => {
      setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true')
    }

    window.addEventListener('theme-change', handleThemeUpdate)
    window.addEventListener('sw-settings-updated', handleSettingsUpdate)
    
    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate)
      window.removeEventListener('sw-settings-updated', handleSettingsUpdate)
    }
  }, [])

  const styles = getThemeStyles(theme)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setCoverArtBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!playlistName.trim()) { setError('Playlist name cannot be empty'); return }
    if (!user) { setError('You must be signed in.'); return }

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
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${styles.mainBg}`}>
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${styles.focusRing.split(' ')[0].replace('focus:', '')}`}></div>
      </div>
    )
  }

  return (
    <>
      {/* We renamed it to animate-slide-up and ONLY inject the CSS 
        if reduceMotion is false to prevent global conflicts. 
      */}
      {!reduceMotion && (
        <style>{`
          @keyframes slideUpFadeManager {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slideUpFadeManager 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            opacity: 0; /* starts hidden before animation runs */
          }
        `}</style>
      )}

      <div className={`flex flex-col min-h-screen md:min-h-full w-full md:items-center md:justify-center p-0 md:p-6 ${styles.mainBg} transition-colors duration-500`}>
        
        {/* We dynamically apply the class instead of trying to override it with CSS */}
        <div className={`w-full max-w-md flex flex-col h-full md:h-auto ${!reduceMotion ? 'animate-slide-up' : 'opacity-100'}`}>
          
          <div className={`flex items-center justify-between p-5 md:p-0 border-b md:border-b-0 ${styles.headerBorder} shrink-0 md:mb-6`}>
            <button onClick={onBack} className={`${styles.textMain} hover:opacity-70 transition-opacity`}>
              <ArrowLeft size={24} className="md:w-5 md:h-5" />
            </button>
            <h1 className={`text-xl md:text-3xl font-bold tracking-tight ${styles.textMain} md:ml-4 flex-1 text-center md:text-left`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Create Playlist
            </h1>
            <div className="w-6 md:hidden" />
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-0 scrollbar-hide">
            <p className={`hidden md:block ${styles.textMuted} mb-8`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Start organizing your music today
            </p>

            <PlaylistForm 
              playlistName={playlistName}
              setPlaylistName={setPlaylistName}
              coverArtBase64={coverArtBase64}
              handleImageChange={handleImageChange}
              handleCreatePlaylist={handleCreatePlaylist}
              loading={loading}
              error={error}
              styles={styles}
            />
            <div className="h-20 md:hidden" /> 
          </div>

        </div>
      </div>
    </>
  )
}

const PlaylistForm = ({ playlistName, setPlaylistName, coverArtBase64, handleImageChange, handleCreatePlaylist, loading, error, styles }: any) => {
  return (
    <form onSubmit={handleCreatePlaylist} className="space-y-6 md:space-y-8">
      <div>
        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 md:mb-3 ${styles.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Playlist Name
        </label>
        <input
          type="text"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          className={`w-full px-4 py-3 md:py-4 border rounded-xl focus:outline-none focus:ring-1 transition-all text-base ${styles.inputBg} ${styles.textMain} ${styles.focusRing}`}
          placeholder="My Awesome Playlist"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          required
        />
      </div>

      <div>
        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 md:mb-3 ${styles.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Cover Image
        </label>
        <label className="cursor-pointer group block">
          <div className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all relative overflow-hidden ${styles.uploadBg}`}>
            {coverArtBase64 ? (
              <>
                <img src={coverArtBase64} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="flex items-center gap-2 text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    <ImageIcon size={16} /> Change
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                 <div className={`w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 transition-colors ${styles.iconColor}`}>
                    <ImageIcon size={28} className="md:w-8 md:h-8" />
                 </div>
                 <span className={`${styles.textMuted} font-medium group-hover:text-white transition-colors text-xs md:text-sm`}>Tap to upload cover</span>
              </div>
            )}
          </div>
          <input type="file" hidden accept="image/*" onChange={handleImageChange} />
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3.5 md:py-4 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-base md:text-lg mt-4 ${styles.primaryBtn}`}
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {loading ? (
           <>
              <div className={`w-5 h-5 border-2 rounded-full animate-spin ${styles.spinner}`} />
              <span>Creating...</span>
           </>
        ) : (
           <span>Create Playlist</span>
        )}
      </button>
    </form>
  )
}

export default PlaylistManager