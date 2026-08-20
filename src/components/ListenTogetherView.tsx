import React, { useState, useEffect, useRef } from 'react'
import {
  Users,
  Radio,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Copy,
  Check,
  LogOut,
  Music,
  Crown,
  Search,
  Send,
  AlertCircle,
  Flame,
  X,
  ListPlus,
  Loader2,
  ArrowLeft,
  Disc3,
  Sparkles
} from 'lucide-react'
import {
  JamRoom,
  createJamRoom,
  joinJamRoom,
  leaveJamRoom,
  subscribeToJamRoom,
  updateJamPlayback,
  addSongToJamQueue,
  removeSongFromJamQueue,
  sendJamReaction,
  sendJamChatMessage,
  getActivePublicJamRooms,
  generateRoomCode
} from '../utils/jamRoomService'
import { usePlayer, Song } from '../context/PlayerContext'
import { searchYouTubeMusic, resolveFullLengthSong } from '../utils/ytMusic'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { auth } from '../utils/firebase'

interface ListenTogetherViewProps {
  onBack: () => void
  user: any
}

const REACTION_EMOJIS = ['🔥', '❤️', '⚡', '🎧', '💃', '🥳', '🚀', '🤯']

export const ListenTogetherView: React.FC<ListenTogetherViewProps> = ({ onBack, user }) => {
  const { 
    currentSong, 
    isPlaying, 
    playSong, 
    pauseSong, 
    resumeSong, 
    currentTime,
    setCurrentTime,
    setActiveJamRoom 
  } = usePlayer()

  const currentUserUid = user?.uid || user?.id || auth.currentUser?.uid || ''
  const currentUserName = user?.displayName || auth.currentUser?.displayName || (user?.email ? user.email.split('@')[0] : 'SoundWave Listener')
  const currentUserPhoto = user?.photoURL || auth.currentUser?.photoURL || ''

  // Theme Sync Engine
  const [theme, setTheme] = useState(() => localStorage.getItem('soundwave_theme') || 'default')

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

  // Theme palette mapping
  const themeConfig: Record<string, any> = {
    default: {
      cardBg: 'bg-white/[0.03] border-white/[0.07]',
      cardHover: 'hover:bg-white/[0.06] hover:border-white/[0.12]',
      inputBg: 'bg-white/[0.04] border-white/10 focus:border-white/30',
    },
    sunset: {
      cardBg: 'bg-orange-950/[0.2] border-orange-500/[0.12]',
      cardHover: 'hover:bg-orange-950/[0.3] hover:border-orange-500/[0.25]',
      inputBg: 'bg-orange-950/[0.3] border-orange-500/20 focus:border-orange-500/50',
    },
    valentine: {
      cardBg: 'bg-pink-950/[0.2] border-pink-500/[0.12]',
      cardHover: 'hover:bg-pink-950/[0.3] hover:border-pink-500/[0.25]',
      inputBg: 'bg-pink-950/[0.3] border-pink-500/20 focus:border-pink-500/50',
    },
    jungle: {
      cardBg: 'bg-emerald-950/[0.2] border-emerald-500/[0.12]',
      cardHover: 'hover:bg-emerald-950/[0.3] hover:border-emerald-500/[0.25]',
      inputBg: 'bg-emerald-950/[0.3] border-emerald-500/20 focus:border-emerald-500/50',
    },
    ocean: {
      cardBg: 'bg-cyan-950/[0.2] border-cyan-500/[0.12]',
      cardHover: 'hover:bg-cyan-950/[0.3] hover:border-cyan-500/[0.25]',
      inputBg: 'bg-cyan-950/[0.3] border-cyan-500/20 focus:border-cyan-500/50',
    },
    cyberpunk: {
      cardBg: 'bg-fuchsia-950/[0.2] border-fuchsia-500/[0.12]',
      cardHover: 'hover:bg-fuchsia-950/[0.3] hover:border-fuchsia-500/[0.25]',
      inputBg: 'bg-fuchsia-950/[0.3] border-fuchsia-500/20 focus:border-fuchsia-500/50',
    },
    midnight: {
      cardBg: 'bg-violet-950/[0.2] border-violet-500/[0.12]',
      cardHover: 'hover:bg-violet-950/[0.3] hover:border-violet-500/[0.25]',
      inputBg: 'bg-violet-950/[0.3] border-violet-500/20 focus:border-violet-500/50',
    },
    coffee: {
      cardBg: 'bg-amber-950/[0.2] border-amber-600/[0.12]',
      cardHover: 'hover:bg-amber-950/[0.3] hover:border-amber-600/[0.25]',
      inputBg: 'bg-amber-950/[0.3] border-amber-600/20 focus:border-amber-600/50',
    }
  }

  const activeTheme = themeConfig[theme] || themeConfig['default']

  // Lobby States
  const [activeRoom, setActiveRoom] = useState<JamRoom | null>(null)
  const [publicRooms, setPublicRooms] = useState<JamRoom[]>([])
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Create Room Modal / Form States
  const [newRoomName, setNewRoomName] = useState(`${currentUserName}'s Jam`)
  const [newRoomCode, setNewRoomCode] = useState(generateRoomCode())
  const [isPublicRoom, setIsPublicRoom] = useState(true)
  const [isOpenDjMode, setIsOpenDjMode] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // In-Room States
  const [copiedCode, setCopiedCode] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([])
  const [showAddSongDrawer, setShowAddSongDrawer] = useState(false)
  const [songSearchQuery, setSongSearchQuery] = useState('')
  const [songSearchResults, setSongSearchResults] = useState<Song[]>([])
  const [isSearchingSongs, setIsSearchingSongs] = useState(false)

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingPlaybackRef = useRef(false)
  const lastProcessedReactionRef = useRef<string>('')

  // Live refs
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubTime, setScrubTime] = useState(0)
  const isScrubbingRef = useRef(false)
  isScrubbingRef.current = isScrubbing

  const isHost = activeRoom ? activeRoom.hostUid === currentUserUid : false
  const canControlPlayback = activeRoom ? (activeRoom.openDjMode || isHost) : true

  const triggerHaptic = async (style = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }) } catch {}
    }
  }

  useEffect(() => {
    setActiveJamRoom(activeRoom)
    return () => { setActiveJamRoom(null) }
  }, [activeRoom])

  useEffect(() => {
    if (!activeRoom) {
      setLoadingPublicRooms(true)
      getActivePublicJamRooms()
        .then(rooms => setPublicRooms(rooms))
        .finally(() => setLoadingPublicRooms(false))
    }
  }, [activeRoom])

  useEffect(() => {
    if (!activeRoom?.id) return

    const unsubscribe = subscribeToJamRoom(
      activeRoom.id,
      async (updatedRoom) => {
        setActiveRoom(updatedRoom)

        if (updatedRoom.currentSong) {
          const isDifferentSong = !currentSong || currentSong.id !== updatedRoom.currentSong.id
          if (isDifferentSong) {
            isSyncingPlaybackRef.current = true
            const resolved = await resolveFullLengthSong(updatedRoom.currentSong)
            playSong(resolved, false)
            setTimeout(() => { 
              isSyncingPlaybackRef.current = false 
              if (!updatedRoom.isPlaying) pauseSong()
              if (updatedRoom.position !== undefined) setCurrentTime(updatedRoom.position)
            }, 600)
            return
          }
        }

        if (updatedRoom.currentSong && !isSyncingPlaybackRef.current && !isScrubbingRef.current) {
          const localIsPlaying = isPlayingRef.current
          const localCurrentTime = currentTimeRef.current

          if (!updatedRoom.isPlaying) {
            if (localIsPlaying) pauseSong()
            const posDiff = Math.abs(localCurrentTime - (updatedRoom.position || 0))
            if (posDiff > 0.3) setCurrentTime(updatedRoom.position || 0)
          } else {
            const now = Date.now()
            const timeElapsed = Math.max(0, (now - (updatedRoom.lastUpdatedTimestamp || now)) / 1000)
            const targetPosition = (updatedRoom.position || 0) + timeElapsed

            if (!localIsPlaying) resumeSong()

            const drift = Math.abs(localCurrentTime - targetPosition)
            if (drift > 0.5) setCurrentTime(targetPosition)
          }
        }

        if (updatedRoom.reactions && updatedRoom.reactions.length > 0) {
          const latest = updatedRoom.reactions[updatedRoom.reactions.length - 1]
          if (latest && latest.id !== lastProcessedReactionRef.current) {
            lastProcessedReactionRef.current = latest.id
            triggerFloatingReaction(latest.emoji)
          }
        }
      },
      (err) => console.error('Jam Room sync error:', err)
    )

    return () => unsubscribe()
  }, [activeRoom?.id])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [activeRoom?.chat])

  const triggerFloatingReaction = (emoji: string) => {
    const id = Math.random().toString(36).slice(2, 8)
    const randomX = 20 + Math.random() * 60
    setFloatingReactions(prev => [...prev.slice(-15), { id, emoji, x: randomX }])
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id))
    }, 2800)
  }

  const handleCreateRoom = async () => {
    if (!currentUserUid) {
      alert('Please log in to create a Jam Room.')
      return
    }
    setIsCreating(true)
    try {
      const room = await createJamRoom(
        newRoomName,
        newRoomCode,
        { uid: currentUserUid, displayName: currentUserName, photoURL: currentUserPhoto },
        currentSong,
        isPublicRoom,
        isOpenDjMode
      )
      setActiveRoom(room)
      triggerHaptic(ImpactStyle.Medium)
    } catch (e: any) {
      alert(`Failed to create room: ${e.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || joinCodeInput).trim()
    if (!code) return
    if (!currentUserUid) {
      alert('Please log in to join a Jam Room.')
      return
    }
    setIsJoining(true)
    setJoinError('')
    try {
      const room = await joinJamRoom(code, {
        uid: currentUserUid,
        displayName: currentUserName,
        photoURL: currentUserPhoto
      })
      setActiveRoom(room)
      triggerHaptic(ImpactStyle.Medium)
    } catch (e: any) {
      setJoinError(e.message || 'Room not found')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveRoom = async () => {
    if (!activeRoom) return
    await leaveJamRoom(activeRoom.id, currentUserUid)
    setActiveRoom(null)
    triggerHaptic()
    getActivePublicJamRooms().then(rooms => setPublicRooms(rooms))
  }

  const handleTogglePlay = async () => {
    if (!activeRoom || !canControlPlayback) return
    const newIsPlaying = !activeRoom.isPlaying
    triggerHaptic()
    if (newIsPlaying) resumeSong()
    else pauseSong()

    await updateJamPlayback(
      activeRoom.id,
      newIsPlaying,
      currentTime || activeRoom.position || 0,
      activeRoom.currentSong
    )
  }

  const handleSeekStart = () => {
    if (!canControlPlayback) return
    setIsScrubbing(true)
    setScrubTime(currentTime)
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControlPlayback) return
    setScrubTime(Number(e.target.value))
  }

  const handleSeekCommit = async (newSec: number) => {
    if (!activeRoom || !canControlPlayback) return
    setIsScrubbing(false)
    setCurrentTime(newSec)
    triggerHaptic()
    await updateJamPlayback(
      activeRoom.id,
      activeRoom.isPlaying,
      newSec,
      activeRoom.currentSong
    )
  }

  const handleSkipNext = async () => {
    if (!activeRoom || !canControlPlayback) return
    triggerHaptic()
    if (activeRoom.queue && activeRoom.queue.length > 1) {
      const nextTrack = activeRoom.queue[1]
      await removeSongFromJamQueue(activeRoom.id, 0)
      await updateJamPlayback(activeRoom.id, true, 0, nextTrack)
    } else {
      await updateJamPlayback(activeRoom.id, true, 0, activeRoom.currentSong)
    }
  }

  const handleSkipPrev = async () => {
    if (!activeRoom || !canControlPlayback) return
    triggerHaptic()
    setCurrentTime(0)
    await updateJamPlayback(activeRoom.id, activeRoom.isPlaying, 0, activeRoom.currentSong)
  }

  const handleSendReaction = async (emoji: string) => {
    if (!activeRoom) return
    triggerHaptic(ImpactStyle.Light)
    triggerFloatingReaction(emoji)
    await sendJamReaction(activeRoom.id, emoji, currentUserName)
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRoom || !chatInput.trim()) return
    const msg = chatInput.trim()
    setChatInput('')
    await sendJamChatMessage(activeRoom.id, msg, {
      displayName: currentUserName,
      photoURL: currentUserPhoto
    })
  }

  const handleSearchSongs = async () => {
    if (!songSearchQuery.trim()) return
    setIsSearchingSongs(true)
    try {
      const results = await searchYouTubeMusic(songSearchQuery)
      setSongSearchResults(results)
    } catch {
      setSongSearchResults([])
    } finally {
      setIsSearchingSongs(false)
    }
  }

  const handleAddSongToJam = async (song: Song) => {
    if (!activeRoom) return
    await addSongToJamQueue(activeRoom.id, song, currentUserName)
    triggerHaptic()
    setShowAddSongDrawer(false)
  }

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="relative flex flex-col h-full overflow-y-auto sw-scroll px-4 md:px-8 py-6 max-w-7xl mx-auto w-full pb-36">
      {/* ── FLOATING LIVE REACTIONS ── */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-24 text-3xl md:text-4xl animate-float-reaction"
            style={{ left: `${r.x}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes floatReaction {
          0% { opacity: 1; transform: translateY(0) scale(0.7) rotate(0deg); }
          50% { opacity: 0.9; transform: translateY(-160px) scale(1.2) rotate(-10deg); }
          100% { opacity: 0; transform: translateY(-300px) scale(1.4) rotate(10deg); }
        }
        .animate-float-reaction {
          animation: floatReaction 2.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={activeRoom ? handleLeaveRoom : onBack}
          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors w-fit group cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] group-hover:bg-white/[0.08] transition-all">
            <ArrowLeft size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {activeRoom ? activeRoom.name : 'Listen Together'}
              </h1>
              {activeRoom && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 font-normal mt-0.5">
              {activeRoom ? `Room Code: ${activeRoom.code}` : 'Listen to music in sync with friends in real time'}
            </p>
          </div>
        </button>

        {activeRoom && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeRoom.code)
                setCopiedCode(true)
                setTimeout(() => setCopiedCode(false), 2000)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                copiedCode 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border-white/10'
              }`}
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copied Code' : `Code: ${activeRoom.code}`}</span>
            </button>

            <button
              onClick={handleLeaveRoom}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all border border-red-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Leave Room</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LOBBY MODE (When NOT in a room)
      ────────────────────────────────────────────────────────────── */}
      {!activeRoom ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 border border-white/10 shadow-2xl bg-zinc-950">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/20 to-black pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/40 inline-flex items-center gap-1.5">
                <Sparkles size={12} />
                Real-Time Jam Engine
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Listen Together in Perfect Sync.
              </h2>
              <p className="text-xs md:text-sm text-white/60 leading-relaxed font-light">
                Sync tracks, timeline scrub, and shared queue across multiple accounts in real time. Share a room code with friends or discover public jam parties.
              </p>
            </div>
          </div>

          {/* Action Grid: Host or Join */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. HOST A ROOM */}
            <div className={`p-6 md:p-7 rounded-2xl ${activeTheme.cardBg} backdrop-blur-xl space-y-5 flex flex-col justify-between`}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.06] text-white border border-white/10">
                    <Radio size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Host a Jam
                    </h2>
                    <p className="text-xs text-white/40">Create a synced room and invite listeners</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Room Name</label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g. Late Night Vibes"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition-colors ${activeTheme.inputBg}`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/50">Room Code</span>
                      <button
                        onClick={() => setNewRoomCode(generateRoomCode())}
                        className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Randomize
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={8}
                      value={newRoomCode}
                      onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-white focus:outline-none transition-colors ${activeTheme.inputBg}`}
                    />
                  </div>

                  {/* Clean Toggles */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                      <div>
                        <span className="text-xs font-medium text-white block">Open DJ Mode</span>
                        <span className="text-[10px] text-white/40">Anyone in room can play and queue songs</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isOpenDjMode}
                        onChange={(e) => setIsOpenDjMode(e.target.checked)}
                        className="w-4 h-4 accent-white cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                      <div>
                        <span className="text-xs font-medium text-white block">Public Jam</span>
                        <span className="text-[10px] text-white/40">Display in public discover list</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isPublicRoom}
                        onChange={(e) => setIsPublicRoom(e.target.checked)}
                        className="w-4 h-4 accent-white cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full mt-4 py-3 rounded-xl bg-white text-black hover:bg-white/90 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}
                <span>Create Jam Room</span>
              </button>
            </div>

            {/* 2. JOIN A ROOM */}
            <div className={`p-6 md:p-7 rounded-2xl ${activeTheme.cardBg} backdrop-blur-xl space-y-5 flex flex-col justify-between`}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.06] text-white border border-white/10">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Join with Code
                    </h2>
                    <p className="text-xs text-white/40">Enter a code shared by a friend</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Room Code</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. PARTY"
                      className={`w-full px-4 py-3.5 rounded-xl text-base font-mono text-center text-white uppercase tracking-widest focus:outline-none transition-colors ${activeTheme.inputBg}`}
                    />
                  </div>

                  {joinError && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{joinError}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleJoinRoom()}
                disabled={isJoining || !joinCodeInput.trim()}
                className="w-full mt-4 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {isJoining ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
                <span>Join Room</span>
              </button>
            </div>
          </div>

          {/* 3. DISCOVER PUBLIC JAMS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <Flame size={16} className="text-amber-400" />
                <span>Live Public Jams</span>
              </h2>
              <span className="text-xs text-white/40">{publicRooms.length} active</span>
            </div>

            {loadingPublicRooms ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={20} className="animate-spin text-white/40" />
              </div>
            ) : publicRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicRooms.map((room) => {
                  const participantCount = Object.keys(room.participants || {}).length
                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-2xl ${activeTheme.cardBg} ${activeTheme.cardHover} transition-all space-y-3`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-white border border-white/10">
                          {room.code}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {participantCount} {participantCount === 1 ? 'listener' : 'listeners'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {room.name}
                        </h4>
                        <p className="text-xs text-white/40 truncate mt-0.5">Host: {room.hostName}</p>
                      </div>

                      {room.currentSong && (
                        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                            {room.currentSong.coverArtBase64 ? (
                              <img src={room.currentSong.coverArtBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={14} className="m-auto text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[10px] font-bold text-white truncate">{room.currentSong.title}</h4>
                            <p className="text-[9px] text-white/40 truncate">{room.currentSong.artist}</p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleJoinRoom(room.code)}
                        className="w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs transition-colors cursor-pointer border border-white/10"
                      >
                        Join Jam
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={`p-8 rounded-2xl ${activeTheme.cardBg} text-center space-y-1.5`}>
                <Radio size={20} className="mx-auto text-white/30" />
                <p className="text-xs text-white/60">No public jam sessions right now.</p>
                <p className="text-[11px] text-white/30">Host a room above to listen together with friends!</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            ACTIVE JAM STUDIO (When INSIDE a room)
        ────────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          
          {/* LEFT: LIVE PLAYER & SHARED QUEUE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Live Center Player Card */}
            <div className={`p-6 md:p-7 rounded-2xl ${activeTheme.cardBg} backdrop-blur-xl space-y-6`}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Artwork */}
                <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black shrink-0">
                  {activeRoom.currentSong?.coverArtBase64 ? (
                    <img
                      src={activeRoom.currentSong.coverArtBase64}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                      <Disc3 size={44} className={`text-white/30 ${activeRoom.isPlaying ? 'animate-spin-slow' : ''}`} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/90 border border-white/10">
                      {activeRoom.openDjMode ? 'Open DJ Sync' : 'Host Only DJ'}
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {activeRoom.currentSong?.title || 'No Track Selected'}
                  </h2>
                  <p className="text-sm text-white/60 truncate font-medium">
                    {activeRoom.currentSong?.artist || 'Add a song to get the jam started!'}
                  </p>
                  {activeRoom.currentSong?.addedBy && (
                    <p className="text-xs text-white/40">Queued by @{activeRoom.currentSong.addedBy}</p>
                  )}
                </div>
              </div>

              {/* Synchronized Scrub Timeline */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="range"
                  min={0}
                  max={currentSong?.duration || activeRoom.currentSong?.duration || 210}
                  value={isScrubbing ? scrubTime : (currentTime || activeRoom.position || 0)}
                  onPointerDown={handleSeekStart}
                  onChange={handleSeekChange}
                  onPointerUp={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
                  onPointerCancel={() => setIsScrubbing(false)}
                  disabled={!canControlPlayback}
                  className={`w-full accent-white cursor-pointer ${!canControlPlayback ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>{formatSec(isScrubbing ? scrubTime : (currentTime || activeRoom.position || 0))}</span>
                  <span>{formatSec(currentSong?.duration || activeRoom.currentSong?.duration || 210)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={handleSkipPrev}
                  disabled={!canControlPlayback}
                  className="p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white transition-all disabled:opacity-40 cursor-pointer"
                  title="Previous / Restart"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  onClick={handleTogglePlay}
                  disabled={!canControlPlayback}
                  className="p-4 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-40 cursor-pointer"
                  title={activeRoom.isPlaying ? 'Pause for everyone' : 'Play for everyone'}
                >
                  {activeRoom.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>

                <button
                  onClick={handleSkipNext}
                  disabled={!canControlPlayback}
                  className="p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white transition-all disabled:opacity-40 cursor-pointer"
                  title="Next Track"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Live Emojis Reaction Emitter */}
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-2 justify-center">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-lg transition-all hover:scale-125 active:scale-95 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shared Queue Panel */}
            <div className={`p-6 rounded-2xl ${activeTheme.cardBg} backdrop-blur-xl space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <Music size={16} />
                    <span>Shared Queue ({activeRoom.queue?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-white/40">Collaborative queue for everyone in this jam</p>
                </div>

                <button
                  onClick={() => setShowAddSongDrawer(true)}
                  className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:bg-white/90"
                >
                  <Plus size={13} />
                  <span>Add Track</span>
                </button>
              </div>

              {/* Queue Rows */}
              <div className="space-y-1.5">
                {activeRoom.queue && activeRoom.queue.length > 0 ? (
                  activeRoom.queue.map((song, idx) => {
                    const isNowPlaying = idx === 0
                    return (
                      <div
                        key={`${song.id}_${idx}`}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isNowPlaying
                            ? 'bg-white/[0.08] border-white/20 text-white'
                            : 'bg-white/[0.02] border-white/[0.04] text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-white/40 w-4 text-center">{idx + 1}</span>
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                            {song.coverArtBase64 ? (
                              <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={14} className="m-auto text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
                            <p className="text-[10px] text-white/40 truncate">
                              {song.artist} {song.addedBy && `• @${song.addedBy}`}
                            </p>
                          </div>
                        </div>

                        {canControlPlayback && !isNowPlaying && (
                          <button
                            onClick={() => removeSongFromJamQueue(activeRoom.id, idx)}
                            className="p-1 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                            title="Remove from queue"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-white/40 py-4 text-center">Queue is empty. Tap &ldquo;Add Track&rdquo; to add songs!</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: PARTICIPANTS & CHAT */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Participants */}
            <div className={`p-5 rounded-2xl ${activeTheme.cardBg} backdrop-blur-xl space-y-3`}>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} />
                <span>Listeners ({Object.keys(activeRoom.participants || {}).length})</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                {Object.values(activeRoom.participants || {}).map((p) => (
                  <div
                    key={p.uid}
                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                  >
                    <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-white/15 bg-zinc-900 shrink-0">
                      <img src={p.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${p.displayName}`} alt="" className="w-full h-full object-cover" />
                      {p.isHost && (
                        <div className="absolute top-0 right-0 bg-amber-400 p-0.5 rounded-bl">
                          <Crown size={6} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate max-w-[90px]">{p.displayName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Box */}
            <div className={`p-5 rounded-2xl ${activeTheme.cardBg} backdrop-blur-xl space-y-3 flex flex-col h-[400px]`}>
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Party Chat</h3>

              {/* Message log */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto sw-scroll space-y-2 pr-1">
                {activeRoom.chat && activeRoom.chat.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-xs ${msg.isSystem ? 'text-white/40 italic p-1.5 rounded-lg bg-white/[0.02]' : 'text-white/80'}`}
                  >
                    {!msg.isSystem && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-white text-[11px]">{msg.user}</span>
                        <span className="text-[9px] font-mono text-white/30">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <p className="leading-relaxed font-normal">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-white/[0.06]">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message..."
                  className={`flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition-colors ${activeTheme.inputBg}`}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-xl bg-white text-black disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DRAWER: ADD SONG SEARCH OVERLAY
      ────────────────────────────────────────────────────────────── */}
      {showAddSongDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <ListPlus size={16} />
                <span>Add Track to Jam</span>
              </h3>
              <button
                onClick={() => setShowAddSongDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search songs, artists..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSongs()}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <button
                onClick={handleSearchSongs}
                disabled={isSearchingSongs}
                className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs cursor-pointer"
              >
                {isSearchingSongs ? <Loader2 size={13} className="animate-spin" /> : 'Search'}
              </button>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto sw-scroll space-y-1.5 pr-1 min-h-[220px]">
              {songSearchResults.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                      {song.coverArtBase64 ? (
                        <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music size={14} className="m-auto text-white/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
                      <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddSongToJam(song)}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Queue</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListenTogetherView
