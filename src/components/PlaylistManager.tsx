import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { ArrowLeft, Sparkles, Image as ImageIcon, Plus, X, FolderPlus } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

interface PlaylistManagerProps {
  onBack: () => void
}

const getThemeStyles = (theme: string) => {
  const themes: Record<string, any> = {
    default: {
      accentColor: '#818cf8',
      textMain: 'text-slate-100',
      textMuted: 'text-zinc-400',
      cardBg: 'bg-white/[0.03] border-white/[0.08]',
      inputBg: 'bg-white/[0.04] border-white/10 focus:border-indigo-400 focus:bg-white/[0.07]',
      pillBg: 'bg-white/[0.05] border-white/10 hover:border-indigo-400/50 hover:bg-white/[0.08] text-zinc-300',
      pillActive: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
      primaryBtn: 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]',
      dropzoneBg: 'bg-white/[0.02] border-white/10 hover:border-indigo-400/40',
      headerBadge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    sunset: {
      accentColor: '#f97316',
      textMain: 'text-orange-50',
      textMuted: 'text-orange-200/50',
      cardBg: 'bg-orange-950/[0.2] border-orange-500/[0.15]',
      inputBg: 'bg-orange-950/[0.3] border-orange-500/20 focus:border-orange-400 focus:bg-orange-950/[0.4]',
      pillBg: 'bg-orange-500/[0.06] border-orange-500/20 hover:border-orange-400/50 hover:bg-orange-500/[0.1] text-orange-200',
      pillActive: 'bg-orange-500/25 border-orange-500/50 text-orange-200',
      primaryBtn: 'bg-orange-500 text-black hover:bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.25)]',
      dropzoneBg: 'bg-orange-950/[0.2] border-orange-500/20 hover:border-orange-400/40',
      headerBadge: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    valentine: {
      accentColor: '#ec4899',
      textMain: 'text-pink-50',
      textMuted: 'text-pink-200/50',
      cardBg: 'bg-pink-950/[0.2] border-pink-500/[0.15]',
      inputBg: 'bg-pink-950/[0.3] border-pink-500/20 focus:border-pink-400 focus:bg-pink-950/[0.4]',
      pillBg: 'bg-pink-500/[0.06] border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/[0.1] text-pink-200',
      pillActive: 'bg-pink-500/25 border-pink-500/50 text-pink-200',
      primaryBtn: 'bg-pink-500 text-black hover:bg-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.25)]',
      dropzoneBg: 'bg-pink-950/[0.2] border-pink-500/20 hover:border-pink-400/40',
      headerBadge: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    jungle: {
      accentColor: '#10b981',
      textMain: 'text-emerald-50',
      textMuted: 'text-emerald-200/50',
      cardBg: 'bg-emerald-950/[0.2] border-emerald-500/[0.15]',
      inputBg: 'bg-emerald-950/[0.3] border-emerald-500/20 focus:border-emerald-400 focus:bg-emerald-950/[0.4]',
      pillBg: 'bg-emerald-500/[0.06] border-emerald-500/20 hover:border-emerald-400/50 hover:bg-emerald-500/[0.1] text-emerald-200',
      pillActive: 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200',
      primaryBtn: 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      dropzoneBg: 'bg-emerald-950/[0.2] border-emerald-500/20 hover:border-emerald-400/40',
      headerBadge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    ocean: {
      accentColor: '#06b6d4',
      textMain: 'text-cyan-50',
      textMuted: 'text-cyan-200/50',
      cardBg: 'bg-cyan-950/[0.2] border-cyan-500/[0.15]',
      inputBg: 'bg-cyan-950/[0.3] border-cyan-500/20 focus:border-cyan-400 focus:bg-cyan-950/[0.4]',
      pillBg: 'bg-cyan-500/[0.06] border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/[0.1] text-cyan-200',
      pillActive: 'bg-cyan-500/25 border-cyan-500/50 text-cyan-200',
      primaryBtn: 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]',
      dropzoneBg: 'bg-cyan-950/[0.2] border-cyan-500/20 hover:border-cyan-400/40',
      headerBadge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    cyberpunk: {
      accentColor: '#d946ef',
      textMain: 'text-fuchsia-50',
      textMuted: 'text-fuchsia-200/50',
      cardBg: 'bg-fuchsia-950/[0.2] border-fuchsia-500/[0.15]',
      inputBg: 'bg-fuchsia-950/[0.3] border-fuchsia-500/20 focus:border-fuchsia-400 focus:bg-fuchsia-950/[0.4]',
      pillBg: 'bg-fuchsia-500/[0.06] border-fuchsia-500/20 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/[0.1] text-fuchsia-200',
      pillActive: 'bg-fuchsia-500/25 border-fuchsia-500/50 text-fuchsia-200',
      primaryBtn: 'bg-fuchsia-500 text-black hover:bg-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.25)]',
      dropzoneBg: 'bg-fuchsia-950/[0.2] border-fuchsia-500/20 hover:border-fuchsia-400/40',
      headerBadge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    midnight: {
      accentColor: '#a78bfa',
      textMain: 'text-violet-50',
      textMuted: 'text-violet-200/50',
      cardBg: 'bg-violet-950/[0.2] border-violet-500/[0.15]',
      inputBg: 'bg-violet-950/[0.3] border-violet-500/20 focus:border-violet-400 focus:bg-violet-950/[0.4]',
      pillBg: 'bg-violet-500/[0.06] border-violet-500/20 hover:border-violet-400/50 hover:bg-violet-500/[0.1] text-violet-200',
      pillActive: 'bg-violet-500/25 border-violet-500/50 text-violet-200',
      primaryBtn: 'bg-violet-500 text-black hover:bg-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.25)]',
      dropzoneBg: 'bg-violet-950/[0.2] border-violet-500/20 hover:border-violet-400/40',
      headerBadge: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
      spinner: 'border-black/30 border-t-black',
    },
    coffee: {
      accentColor: '#f59e0b',
      textMain: 'text-amber-50',
      textMuted: 'text-amber-200/50',
      cardBg: 'bg-amber-950/[0.2] border-amber-500/[0.15]',
      inputBg: 'bg-amber-950/[0.3] border-amber-500/20 focus:border-amber-400 focus:bg-amber-950/[0.4]',
      pillBg: 'bg-amber-500/[0.06] border-amber-500/20 hover:border-amber-400/50 hover:bg-amber-500/[0.1] text-amber-200',
      pillActive: 'bg-amber-500/25 border-amber-500/50 text-amber-200',
      primaryBtn: 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      dropzoneBg: 'bg-amber-950/[0.2] border-amber-500/20 hover:border-amber-400/40',
      headerBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      spinner: 'border-black/30 border-t-black',
    }
  }
  return themes[theme] || themes['default']
}

const VIBE_PRESETS = [
  { label: '🔥 Workout & Gym', name: 'Workout Beast Mode' },
  { label: '🌙 Midnight Chill', name: 'Midnight Lofi Chill' },
  { label: '⚡ High Energy', name: 'High Energy Boost' },
  { label: '🚗 Night Drive', name: 'Late Night Drive' },
  { label: '🎧 Focus & Code', name: 'Deep Focus & Flow' },
  { label: '💖 Romantic', name: 'Heart & Soul Vibes' },
  { label: '🌧️ Sad Hours', name: 'Melancholy & Rain' },
  { label: '🎉 Weekend Party', name: 'Weekend Bangerz' },
]

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({ onBack }) => {
  const { user } = useAuth()
  const [playlistName, setPlaylistName] = useState('')
  const [description, setDescription] = useState('')
  const [coverArtBase64, setCoverArtBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('soundwave_theme') || 'default'
  })

  useEffect(() => {
    const handleThemeUpdate = () => {
      setTheme(localStorage.getItem('soundwave_theme') || 'default')
    }
    window.addEventListener('theme-change', handleThemeUpdate)
    window.addEventListener('sw-settings-updated', handleThemeUpdate)
    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate)
      window.removeEventListener('sw-settings-updated', handleThemeUpdate)
    }
  }, [])

  const triggerHaptic = async (style = ImpactStyle.Light) => {
    if (localStorage.getItem('sw_haptics') !== 'false' && Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }) } catch {}
    }
  }

  const styles = getThemeStyles(theme)

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverArtBase64(reader.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageFile(file)
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!playlistName.trim()) {
      setError('Playlist name cannot be empty')
      return
    }
    if (!user) {
      setError('You must be logged in to create playlists.')
      return
    }

    triggerHaptic(ImpactStyle.Medium)
    setLoading(true)
    try {
      await addDoc(collection(db, 'playlists'), {
        userId: user.id,
        name: playlistName.trim(),
        description: description.trim() || null,
        songCount: 0,
        createdAt: new Date(),
        coverArtBase64: coverArtBase64 || null,
      })
      setPlaylistName('')
      setDescription('')
      setCoverArtBase64(null)
      onBack()
    } catch (err: any) {
      setError(err.message || 'Failed to create playlist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 md:px-10 md:py-8 sw-scroll">
      
      {/* ── TOP HEADER / NAV ── */}
      <div className="max-w-4xl mx-auto w-full mb-8">
        <div className="flex items-center justify-between gap-4 mb-3">
          <button
            onClick={() => { triggerHaptic(); onBack(); }}
            className={`p-2.5 rounded-full ${styles.cardBg} ${styles.textMain} hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shrink-0`}
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex-1">
            <h1
              className={`text-2xl md:text-4xl font-extrabold tracking-tight ${styles.textMain}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Build Your Next Mix
            </h1>
          </div>
        </div>
        <p className={`text-sm ${styles.textMuted} max-w-xl`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Give your playlist a name, choose a custom cover, or pick a vibe preset to get started.
        </p>
      </div>

      {/* ── MAIN CONTENT FORM ── */}
      <div className="max-w-4xl mx-auto w-full">
        <form onSubmit={handleCreatePlaylist} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: COVER ART DROPZONE (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <label className={`text-xs font-bold uppercase tracking-wider ${styles.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Cover Artwork
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all ${styles.dropzoneBg} ${
                isDragOver ? 'scale-[1.02] border-indigo-400' : ''
              }`}
            >
              {coverArtBase64 ? (
                <>
                  <img src={coverArtBase64} alt="Playlist Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                    <span className="text-xs font-bold text-white bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                      <ImageIcon size={14} /> Change Cover
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverArtBase64(null);
                      }}
                      className="text-xs font-bold text-red-300 bg-red-500/20 backdrop-blur-md px-3 py-1 rounded-full hover:bg-red-500/30 flex items-center gap-1"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl ${styles.cardBg} flex items-center justify-center mb-3 text-zinc-400 group-hover:text-white transition-colors`}>
                    <FolderPlus size={30} style={{ color: styles.accentColor }} />
                  </div>
                  <p className={`text-sm font-bold ${styles.textMain} mb-1`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Upload Playlist Cover
                  </p>
                  <p className={`text-xs ${styles.textMuted}`}>
                    Drag and drop or click to browse
                  </p>
                  <span className="text-[10px] text-zinc-600 mt-3 uppercase tracking-widest font-mono">
                    PNG, JPG, WEBP (Square Recommended)
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* RIGHT: DETAILS & PRESETS (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              
              {/* PLAYLIST NAME */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${styles.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Playlist Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="e.g. Late Night Drives & Chill"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium transition-all outline-none ${styles.inputBg} ${styles.textMain}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    required
                  />
                  {playlistName && (
                    <button
                      type="button"
                      onClick={() => setPlaylistName('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* VIBE PRESETS CHIPS */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${styles.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Quick Vibe Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {VIBE_PRESETS.map((vibe, i) => {
                    const isSelected = playlistName === vibe.name
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setPlaylistName(vibe.name);
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                          isSelected ? styles.pillActive : styles.pillBg
                        }`}
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {vibe.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* DESCRIPTION (OPTIONAL) */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${styles.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Description <span className="text-zinc-500 text-[10px] font-normal normal-case">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Give your playlist a vibe or description..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all outline-none resize-none ${styles.inputBg} ${styles.textMain}`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />
              </div>

              {/* ERROR BANNER */}
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-400 text-xs font-bold animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {error}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => { triggerHaptic(); onBack(); }}
                className={`px-6 py-3.5 rounded-xl text-xs font-bold border border-white/10 ${styles.textMuted} hover:text-white hover:bg-white/5 transition-all`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !playlistName.trim()}
                className={`flex-1 py-3.5 px-6 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm ${styles.primaryBtn}`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {loading ? (
                  <>
                    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${styles.spinner}`} />
                    <span>Creating Playlist...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Create Playlist</span>
                  </>
                )}
              </button>
              
            </div>
                <span className='md:hidden'>
                <br /><br /><br />
              </span>
          </div>

        </form>
      </div>

      <div className="h-28 md:h-16 shrink-0" />
    </div>
  )
}

export default PlaylistManager