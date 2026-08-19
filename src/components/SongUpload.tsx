import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, doc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { X, Search, Plus, Music, Loader2, Check, CheckCircle2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import type { Song } from '../context/PlayerContext'

interface SongUploadProps {
  playlistId: string
  onClose: () => void
}

const SongUpload: React.FC<SongUploadProps> = ({ playlistId, onClose }) => {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [librarySongs, setLibrarySongs] = useState<Song[]>([])
  const [existingPlaylistIds, setExistingPlaylistIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  // --- THEME & SETTINGS SYNC ---
  const [theme, setTheme] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    localStorage.getItem('soundwave_theme') || 'default';
  });
  
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true')

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const handleThemeUpdate = () => {
      setTheme(localStorage.getItem('soundwave_theme') || 'default');
    };
    const handleSettingsUpdate = () => {
      setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true');
    };

    handleThemeUpdate();
    handleSettingsUpdate();

    window.addEventListener('theme-change', handleThemeUpdate);
    window.addEventListener('sw-settings-updated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate);
      window.removeEventListener('sw-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const themeConfig: Record<string, any> = {
    default: { textMain: 'text-slate-100', textMuted: 'text-zinc-400', menuBg: 'bg-[#09090b] border-white/10', cardBg: 'bg-black/40 border-white/5', hoverRow: 'hover:bg-white/5 hover:border-white/20', inputBg: 'bg-black/60 border-white/10 focus:border-slate-400', emptyIconColor: 'text-zinc-600', successBg: 'bg-white/10 text-white border-white/20' },
    sunset: { textMain: 'text-orange-50', textMuted: 'text-orange-200/60', menuBg: 'bg-[#2a0808] border-orange-500/20', cardBg: 'bg-black/40 border-orange-500/10', hoverRow: 'hover:bg-orange-500/10 hover:border-orange-500/30', inputBg: 'bg-black/60 border-orange-500/20 focus:border-orange-400', emptyIconColor: 'text-orange-500/50', successBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    valentine: { textMain: 'text-pink-50', textMuted: 'text-pink-200/60', menuBg: 'bg-[#330a1a] border-pink-500/20', cardBg: 'bg-black/40 border-pink-500/10', hoverRow: 'hover:bg-pink-500/10 hover:border-pink-500/30', inputBg: 'bg-black/60 border-pink-500/20 focus:border-pink-400', emptyIconColor: 'text-pink-500/50', successBg: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    jungle: { textMain: 'text-emerald-50', textMuted: 'text-emerald-200/60', menuBg: 'bg-[#062414] border-emerald-500/20', cardBg: 'bg-black/40 border-emerald-500/10', hoverRow: 'hover:bg-emerald-500/10 hover:border-emerald-500/30', inputBg: 'bg-black/60 border-emerald-500/20 focus:border-emerald-400', emptyIconColor: 'text-emerald-500/50', successBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    ocean: { textMain: 'text-cyan-50', textMuted: 'text-cyan-200/60', menuBg: 'bg-[#061a29] border-cyan-500/20', cardBg: 'bg-black/40 border-cyan-500/10', hoverRow: 'hover:bg-cyan-500/10 hover:border-cyan-500/30', inputBg: 'bg-black/60 border-cyan-500/20 focus:border-cyan-400', emptyIconColor: 'text-cyan-500/50', successBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    cyberpunk: { textMain: 'text-fuchsia-50', textMuted: 'text-fuchsia-200/60', menuBg: 'bg-[#22063b] border-fuchsia-500/20', cardBg: 'bg-black/40 border-fuchsia-500/10', hoverRow: 'hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30', inputBg: 'bg-black/60 border-fuchsia-500/20 focus:border-fuchsia-400', emptyIconColor: 'text-fuchsia-500/50', successBg: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' },
    midnight: { textMain: 'text-violet-50', textMuted: 'text-violet-200/60', menuBg: 'bg-[#1a0c30] border-violet-500/20', cardBg: 'bg-black/40 border-violet-500/10', hoverRow: 'hover:bg-violet-500/10 hover:border-violet-500/30', inputBg: 'bg-black/60 border-violet-500/20 focus:border-violet-400', emptyIconColor: 'text-violet-500/50', successBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    coffee: { textMain: 'text-amber-50', textMuted: 'text-amber-200/60', menuBg: 'bg-[#26150a] border-amber-600/20', cardBg: 'bg-black/40 border-amber-600/10', hoverRow: 'hover:bg-amber-600/10 hover:border-amber-600/30', inputBg: 'bg-black/60 border-amber-600/20 focus:border-amber-600', emptyIconColor: 'text-amber-600/50', successBg: 'bg-amber-500/20 text-amber-500 border-amber-600/30' }
  }

  const activeTheme = themeConfig[theme] || themeConfig['default']

  // --- 1. REAL-TIME FETCH: GLOBAL LIBRARY & CURRENT PLAYLIST ---
  useEffect(() => {
    if (!user?.id || !playlistId) return

    // Listener 1: User's Uploaded Library
    const libraryQuery = query(collection(db, 'users', user.id, 'uploads'), orderBy('addedAt', 'desc'))
    const unsubLibrary = onSnapshot(libraryQuery, (snapshot) => {
      const songsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Song[]
      setLibrarySongs(songsData)
      setLoading(false)
    })

    // Listener 2: Songs already in this specific playlist
    const playlistQuery = collection(db, 'playlists', playlistId, 'songs')
    const unsubPlaylist = onSnapshot(playlistQuery, (snapshot) => {
      const existingIds = new Set(snapshot.docs.map(doc => doc.id))
      setExistingPlaylistIds(existingIds)
    })

    return () => {
      unsubLibrary()
      unsubPlaylist()
    }
  }, [user?.id, playlistId])

  // --- 2. ADD TO PLAYLIST ---
  const handleAddToPlaylist = async (song: Song) => {
    if (!playlistId || existingPlaylistIds.has(song.id)) return
    
    setAddingId(song.id)
    try {
      const playlistSongRef = doc(db, 'playlists', playlistId, 'songs', song.id)
      await setDoc(playlistSongRef, {
        ...song,
        addedAt: new Date().toISOString()
      })
      // No need to manually update state here; the onSnapshot listener will catch it instantly
    } catch (error) {
      console.error("Error adding song:", error)
      alert("Failed to add song to playlist.")
    } finally {
      setAddingId(null)
    }
  }

  const filteredSongs = librarySongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const animClass = reduceMotion ? '' : 'animate-in fade-in zoom-in-95 duration-200'

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4">
      
      {/* Expanded Max-Width for Grid Layout */}
      <div className={`${activeTheme.menuBg} w-full sm:max-w-4xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[91vh] sm:h-[80vh] overflow-hidden ${animClass} border-t sm:border border-white/10`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/40 z-20 shadow-sm">
          <div>
            <h2 className={`text-xl sm:text-3xl font-black tracking-tight ${activeTheme.textMain}`}>Add to Playlist</h2>
            <p className={`text-[13px] md:text-sm mt-1 font-medium ${activeTheme.textMuted}`}>Select tracks from your library to add.</p>
          </div>
          <button 
            onClick={onClose}
            className={`p-2.5 rounded-lg bg-white/5 border border-white/10 ${activeTheme.textMuted} hover:${activeTheme.textMain} hover:bg-white/10 transition-all hover:rotate-90`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sticky Search Bar */}
        <div className="px-6 py-2 md:py-4 bg-black/20 border-b border-white/5 shrink-0 z-10">
          <div className="relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${activeTheme.textMuted} transition-colors group-focus-within:${activeTheme.textMain}`} size={18} />
            <input 
              type="text"
              placeholder="Search your library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl py-4 pl-12 pr-4 text-sm font-medium ${activeTheme.textMain} focus:outline-none transition-all border shadow-inner ${activeTheme.inputBg}`}
            />
          </div>
        </div>

        {/* Scrollable Grid Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-gradient-to-b from-white/[0.02] to-transparent">
          {loading ? (
            <div className={`flex flex-col items-center justify-center h-full ${activeTheme.textMuted}`}>
              <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-80" />
              
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full text-center ${activeTheme.textMuted}`}>
              <Music className={`w-16 h-16 mx-auto mb-4 opacity-40 ${activeTheme.emptyIconColor}`} />
              <h3 className={`text-xl font-bold mb-1 ${activeTheme.textMain}`}>No matches found</h3>
              <p className="text-sm">Try searching for a different title or artist.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-20 sm:pb-0">
              {filteredSongs.map((song) => {
                const isAdded = existingPlaylistIds.has(song.id);
                const isAdding = addingId === song.id;

                return (
                  <div 
                    key={song.id} 
                    className={`flex items-center gap-3 p-3 rounded-2xl border backdrop-blur-sm transition-all group 
                      ${activeTheme.cardBg} ${activeTheme.hoverRow}
                      ${isAdded ? 'opacity-70 saturate-50' : 'hover:-translate-y-0.5 shadow-lg'}
                    `}
                  >
                    {/* Cover Art */}
                    <div className="w-14 h-14 bg-black/60 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-white/10 shadow-md relative">
                      {song.coverArtBase64 ? (
                        <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <Music size={20} className={activeTheme.emptyIconColor} />
                      )}
                      {isAdded && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <CheckCircle2 size={24} className="text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className={`font-bold text-sm truncate leading-tight ${activeTheme.textMain}`}>{song.title}</h4>
                      <p className={`text-[11px] font-medium truncate mt-0.5 ${activeTheme.textMuted}`}>{song.artist || 'Unknown Artist'}</p>
                    </div>
                    
                    {/* Action Button */}
                    <button 
                      onClick={() => handleAddToPlaylist(song)}
                      disabled={isAdded || isAdding}
                      className={`shrink-0 ml-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 min-w-[90px] shadow-sm
                        ${isAdded 
                          ? `${activeTheme.successBg} cursor-default` 
                          : `bg-white/10 border border-white/10 ${activeTheme.textMain} hover:bg-white/20 hover:scale-105 active:scale-95`
                        }
                      `}
                    >
                      {isAdding ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isAdded ? (
                        <><Check size={16} /> Added</>
                      ) : (
                        <><Plus size={16} /> Add</>
                      )}
                    </button>
                  </div>
                )
              })}

              <br /><br /><br />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SongUpload