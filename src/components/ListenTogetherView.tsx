import React, { useState, useEffect, useRef } from 'react'
import {
  Users,
  Radio,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Copy,
  Check,
  Share2,
  LogOut,
  Sparkles,
  Music,
  Crown,
  Search,
  Send,
  Lock,
  Unlock,
  AlertCircle,
  Headphones,
  Flame,
  Heart,
  Zap,
  Smile,
  X,
  ListPlus,
  Loader2,
  ArrowLeft,
  Settings,
  Disc3,
  FlameKindling
} from 'lucide-react'
import {
  JamRoom,
  JamParticipant,
  JamChatMessage,
  createJamRoom,
  joinJamRoom,
  leaveJamRoom,
  subscribeToJamRoom,
  updateJamPlayback,
  addSongToJamQueue,
  removeSongFromJamQueue,
  sendJamReaction,
  sendJamChatMessage,
  toggleOpenDjMode,
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

const REACTION_EMOJIS = ['🔥', '❤️', '🚀', '🎧', '💃', '⚡', '🤯', '🥳']

export const ListenTogetherView: React.FC<ListenTogetherViewProps> = ({ onBack, user }) => {
  const { 
    currentSong, 
    isPlaying, 
    playSong, 
    pauseSong, 
    resumeSong, 
    audioRef, 
    volume, 
    setVolume,
    currentTime,
    setCurrentTime,
    setActiveJamRoom 
  } = usePlayer()

  const currentUserUid = user?.uid || user?.id || auth.currentUser?.uid || ''
  const currentUserName = user?.displayName || auth.currentUser?.displayName || (user?.email ? user.email.split('@')[0] : 'Soundwave Listener')
  const currentUserPhoto = user?.photoURL || auth.currentUser?.photoURL || ''

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
  const [showRoomSettings, setShowRoomSettings] = useState(false)

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingPlaybackRef = useRef(false)
  const lastProcessedReactionRef = useRef<string>('')

  const isHost = activeRoom ? activeRoom.hostUid === currentUserUid : false
  const canControlPlayback = activeRoom ? (activeRoom.openDjMode || isHost) : true

  const triggerHaptic = async (style = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }) } catch {}
    }
  }

  // Sync activeJamRoom with PlayerContext
  useEffect(() => {
    setActiveJamRoom(activeRoom)
    return () => {
      setActiveJamRoom(null)
    }
  }, [activeRoom])

  // Load public rooms on lobby mount
  useEffect(() => {
    if (!activeRoom) {
      setLoadingPublicRooms(true)
      getActivePublicJamRooms()
        .then(rooms => setPublicRooms(rooms))
        .finally(() => setLoadingPublicRooms(false))
    }
  }, [activeRoom])

  // Real-time Jam Room Subscription & Sync Engine
  useEffect(() => {
    if (!activeRoom?.id) return

    const unsubscribe = subscribeToJamRoom(
      activeRoom.id,
      async (updatedRoom) => {
        setActiveRoom(updatedRoom)

        // 1. Sync Audio Track Selection
        if (updatedRoom.currentSong) {
          const isDifferentSong = !currentSong || currentSong.id !== updatedRoom.currentSong.id
          if (isDifferentSong) {
            isSyncingPlaybackRef.current = true
            const resolved = await resolveFullLengthSong(updatedRoom.currentSong)
            playSong(resolved, false)
            setTimeout(() => { isSyncingPlaybackRef.current = false }, 800)
          }
        }

        // 2. Sync Audio Time Position & Playback State (Latency Compensated across all engines)
        if (updatedRoom.currentSong) {
          const now = Date.now()
          const timeElapsedSinceUpdate = (now - (updatedRoom.lastUpdatedTimestamp || now)) / 1000

          let targetPosition = updatedRoom.position
          if (updatedRoom.isPlaying) {
            targetPosition += Math.max(0, timeElapsedSinceUpdate)
          }

          const drift = Math.abs(currentTime - targetPosition)

          // If out of sync by > 1.0s, adjust seamlessly
          if (drift > 1.0 && !isSyncingPlaybackRef.current) {
            setCurrentTime(targetPosition)
          }

          if (updatedRoom.isPlaying && !isPlaying) {
            resumeSong()
          } else if (!updatedRoom.isPlaying && isPlaying) {
            pauseSong()
          }
        }

        // 3. Sync Floating Emoji Reactions
        if (updatedRoom.reactions && updatedRoom.reactions.length > 0) {
          const latest = updatedRoom.reactions[updatedRoom.reactions.length - 1]
          if (latest && latest.id !== lastProcessedReactionRef.current) {
            lastProcessedReactionRef.current = latest.id
            triggerFloatingReaction(latest.emoji)
          }
        }
      },
      (err) => console.error('Jam Room error:', err)
    )

    return () => unsubscribe()
  }, [activeRoom?.id, currentSong?.id, isPlaying, currentTime])

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [activeRoom?.chat])

  // Spawn visual floating reaction
  const triggerFloatingReaction = (emoji: string) => {
    const id = Math.random().toString(36).slice(2, 8)
    const randomX = 20 + Math.random() * 60 // 20% to 80% width
    setFloatingReactions(prev => [...prev.slice(-15), { id, emoji, x: randomX }])
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id))
    }, 2800)
  }

  // Handle Create Room
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

  // Handle Join Room by Code
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

  // Handle Leave Room
  const handleLeaveRoom = async () => {
    if (!activeRoom || !currentUserUid) return
    const roomId = activeRoom.id
    setActiveRoom(null)
    await leaveJamRoom(roomId, currentUserUid, currentUserName)
    triggerHaptic()
  }

  // Synced Play / Pause
  const handleTogglePlay = async () => {
    if (!canControlPlayback || !activeRoom) return
    const nextPlayState = !activeRoom.isPlaying
    const currentPos = audioRef.current?.currentTime || 0

    if (nextPlayState) resumeSong()
    else pauseSong()

    await updateJamPlayback(activeRoom.id, {
      isPlaying: nextPlayState,
      position: currentPos
    })
    triggerHaptic()
  }

  // Synced Timeline Seek
  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControlPlayback || !activeRoom) return
    const targetPos = Number(e.target.value)
    setCurrentTime(targetPos)
    await updateJamPlayback(activeRoom.id, {
      position: targetPos,
      isPlaying: activeRoom.isPlaying
    })
  }

  // Synced Previous Song / Seek to Beginning
  const handleSkipPrev = async () => {
    if (!canControlPlayback || !activeRoom) return
    setCurrentTime(0)
    await updateJamPlayback(activeRoom.id, {
      position: 0
    })
    triggerHaptic()
  }

  // Synced Skip Next Song
  const handleSkipNext = async () => {
    if (!canControlPlayback || !activeRoom) return
    const queue = activeRoom.queue || []
    if (queue.length > 1) {
      const nextTrack = queue[1]
      const updatedQueue = queue.slice(1)
      await updateJamPlayback(activeRoom.id, {
        currentSong: nextTrack,
        isPlaying: true,
        position: 0,
        queue: updatedQueue
      })
    } else {
      await updateJamPlayback(activeRoom.id, {
        isPlaying: false,
        position: 0
      })
    }
    triggerHaptic()
  }

  // Send Emoji Reaction
  const handleSendReaction = async (emoji: string) => {
    if (!activeRoom) return
    triggerFloatingReaction(emoji)
    triggerHaptic(ImpactStyle.Light)
    await sendJamReaction(activeRoom.id, emoji, currentUserName)
  }

  // Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeRoom) return
    const msg = chatInput.trim()
    setChatInput('')
    await sendJamChatMessage(activeRoom.id, msg, {
      displayName: currentUserName,
      photoURL: currentUserPhoto
    })
  }

  // Search online catalog for Add to Jam
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

  // Add song to shared Jam queue
  const handleAddSongToJam = async (song: Song) => {
    if (!activeRoom) return
    await addSongToJamQueue(activeRoom.id, song, currentUserName)
    triggerHaptic()
    setShowAddSongDrawer(false)
    setSongSearchQuery('')
    setSongSearchResults([])
  }

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="relative flex flex-col h-full overflow-y-auto sw-scroll px-4 md:px-8 py-6 max-w-7xl mx-auto w-full pb-36">
      {/* ── FLOATING LIVE REACTIONS PARTICLES ── */}
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
          0% { opacity: 1; transform: translateY(0) scale(0.6) rotate(0deg); }
          50% { opacity: 0.9; transform: translateY(-160px) scale(1.3) rotate(-15deg); }
          100% { opacity: 0; transform: translateY(-320px) scale(1.6) rotate(15deg); }
        }
        .animate-float-reaction {
          animation: floatReaction 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── TOP NAVIGATION HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={activeRoom ? handleLeaveRoom : onBack}
          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors w-fit group"
        >
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
            <ArrowLeft size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {activeRoom ? activeRoom.name : 'Listen Together'}
              </h1>
              {activeRoom && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                  <Radio size={10} /> Live Jam
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 font-light">
              {activeRoom ? `Room Code: ${activeRoom.code}` : 'Real-time synchronized listening parties'}
            </p>
          </div>
        </button>

        {activeRoom && (
          <div className="flex items-center gap-2">
            {/* Copy Room Code */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeRoom.code)
                setCopiedCode(true)
                setTimeout(() => setCopiedCode(false), 2000)
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 flex items-center gap-1.5"
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copied Code' : `Code: ${activeRoom.code}`}</span>
            </button>

            {/* Leave Room Button */}
            <button
              onClick={handleLeaveRoom}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all border border-red-500/20 flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Leave</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODE A: LOBBY & ROOM CREATOR (When NOT in a room)
      ────────────────────────────────────────────────────────────── */}
      {!activeRoom ? (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden p-8 md:p-12 border border-white/10 shadow-2xl bg-zinc-950">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/20 to-black pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/40 inline-flex items-center gap-1.5">
                <Sparkles size={12} />
                Real-Time Jam Engine
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Listen Together in Perfect Sync.
              </h2>
              <p className="text-sm text-white/60 leading-relaxed font-light">
                Sync tracks, timeline scrub, and shared queue across multiple accounts in real time. Share a room code with friends or discover public jam parties.
              </p>
            </div>
          </div>

          {/* Create & Join Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. CREATE A JAM ROOM */}
            <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Create a Jam Room
                  </h3>
                  <p className="text-xs text-white/40">Host a synced party with your own code</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Room Title</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Midnight Lo-Fi Beats"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/50">Custom Room Code</span>
                    <button
                      onClick={() => setNewRoomCode(generateRoomCode())}
                      className="text-violet-400 hover:underline"
                    >
                      Randomize
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={8}
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-violet-400"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-white block">Open DJ Mode</span>
                      <span className="text-[10px] text-white/40">Allow all participants to play, seek, and queue</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isOpenDjMode}
                      onChange={(e) => setIsOpenDjMode(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-white block">Public Jam</span>
                      <span className="text-[10px] text-white/40">Show on public Discover list for other listeners</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPublicRoom}
                      onChange={(e) => setIsPublicRoom(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                  </label>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />}
                  <span>Launch Jam Room</span>
                </button>
              </div>
            </div>

            {/* 2. JOIN A JAM ROOM */}
            <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Join with Code
                    </h3>
                    <p className="text-xs text-white/40">Enter room code from a friend</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/50 block mb-1.5">6-Character Room Code</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. GROOVE"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-lg font-mono text-center text-white uppercase tracking-widest focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {joinError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{joinError}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleJoinRoom()}
                disabled={isJoining || !joinCodeInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {isJoining ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                <span>Join Jam Room</span>
              </button>
            </div>
          </div>

          {/* 3. ACTIVE PUBLIC JAMS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame size={16} className="text-amber-400" />
              <span>Explore Public Jams</span>
            </h3>

            {loadingPublicRooms ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={24} className="animate-spin text-white/40" />
              </div>
            ) : publicRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {publicRooms.map((room) => {
                  const participantCount = Object.keys(room.participants || {}).length
                  return (
                    <div
                      key={room.id}
                      className="p-5 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] transition-all space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-white/10 text-white border border-white/10">
                          {room.code}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {participantCount} {participantCount === 1 ? 'Listener' : 'Listeners'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {room.name}
                        </h4>
                        <p className="text-xs text-white/50 truncate mt-0.5">Host: {room.hostName}</p>
                      </div>

                      {room.currentSong && (
                        <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                            {room.currentSong.coverArtBase64 ? (
                              <img src={room.currentSong.coverArtBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={14} className="m-auto text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white block truncate">{room.currentSong.title}</span>
                            <span className="text-[10px] text-white/40 block truncate">{room.currentSong.artist}</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleJoinRoom(room.code)}
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        Join Party
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
                <Radio size={24} className="mx-auto text-white/30" />
                <p className="text-xs text-white/60">No active public jam parties right now.</p>
                <p className="text-[11px] text-white/40">Be the first to create one!</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MODE B: ACTIVE JAM STUDIO (When INSIDE a room)
        ────────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
          {/* LEFT/CENTER: SYNCED LIVE PLAYER & QUEUE */}
          <div className="lg:col-span-8 space-y-6">
            {/* Live Center Player Card */}
            <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Rotating Vinyl Artwork */}
                <div className="relative group w-36 h-36 md:w-44 md:h-44 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black shrink-0">
                  {activeRoom.currentSong?.coverArtBase64 ? (
                    <img
                      src={activeRoom.currentSong.coverArtBase64}
                      alt=""
                      className={`w-full h-full object-cover ${activeRoom.isPlaying ? 'animate-spin-slow' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                      <Disc3 size={48} className={`text-white/30 ${activeRoom.isPlaying ? 'animate-spin-slow' : ''}`} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/40">
                      {activeRoom.openDjMode ? 'Open DJ Sync' : 'Host DJ Only'}
                    </span>
                    <span className="text-[11px] font-mono text-white/50">
                      Hi-Fi 320kbps Lossless
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-black text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {activeRoom.currentSong?.title || 'No Track Selected'}
                  </h2>
                  <p className="text-sm text-white/60 truncate font-medium">
                    {activeRoom.currentSong?.artist || 'Add a song to start the jam!'}
                  </p>
                  {activeRoom.currentSong?.addedBy && (
                    <p className="text-[11px] text-violet-400/80">Queued by {activeRoom.currentSong.addedBy}</p>
                  )}
                </div>
              </div>

              {/* Synchronized Scrub Timeline */}
              <div className="space-y-1.5 pt-2">
                <input
                  type="range"
                  min={0}
                  max={currentSong?.duration || activeRoom.currentSong?.duration || 210}
                  value={currentTime || activeRoom.position || 0}
                  onChange={handleSeek}
                  disabled={!canControlPlayback}
                  className={`w-full accent-violet-400 cursor-pointer ${!canControlPlayback ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>{formatSec(currentTime || activeRoom.position || 0)}</span>
                  <span>{formatSec(currentSong?.duration || activeRoom.currentSong?.duration || 210)}</span>
                </div>
              </div>

              {/* Synced Playback Controls */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={handleSkipPrev}
                  disabled={!canControlPlayback}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-40"
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
                  {activeRoom.isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
                </button>

                <button
                  onClick={handleSkipNext}
                  disabled={!canControlPlayback}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-40"
                  title="Next Track"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Quick Emojis Reaction Emitter Bar */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Live Reactions</span>
                  <span className="text-[10px] text-white/30">Tap to burst for everyone</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-xl transition-all hover:scale-125 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shared Live Queue Section */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <Music size={16} className="text-violet-400" />
                    <span>Shared Up Next ({activeRoom.queue?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-white/40">Collaborative queue for everyone in the jam</p>
                </div>

                <button
                  onClick={() => setShowAddSongDrawer(true)}
                  className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Plus size={14} />
                  <span>Add to Jam</span>
                </button>
              </div>

              {/* Queue Song Rows */}
              <div className="space-y-2">
                {activeRoom.queue && activeRoom.queue.length > 0 ? (
                  activeRoom.queue.map((song, idx) => {
                    const isNowPlaying = idx === 0
                    return (
                      <div
                        key={`${song.id}_${idx}`}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isNowPlaying
                            ? 'bg-violet-500/15 border-violet-400 text-white shadow-md'
                            : 'bg-white/[0.02] border-white/5 text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-white/40 w-4 text-center">{idx + 1}</span>
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                            {song.coverArtBase64 ? (
                              <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={14} className="m-auto text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
                            <p className="text-[10px] text-white/50 truncate">
                              {song.artist} • <span className="text-violet-300">Added by {song.addedBy || 'DJ'}</span>
                            </p>
                          </div>
                        </div>

                        {canControlPlayback && !isNowPlaying && (
                          <button
                            onClick={() => removeSongFromJamQueue(activeRoom.id, idx)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                            title="Remove from queue"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-white/40 py-4 text-center">Queue is empty. Add a song!</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PARTICIPANTS & CHAT */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Connected Listeners */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-400" />
                  <span>Participants ({Object.keys(activeRoom.participants || {}).length})</span>
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.values(activeRoom.participants || {}).map((p) => (
                  <div
                    key={p.uid}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/15 bg-zinc-900 shrink-0">
                      <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                      {p.isHost && (
                        <div className="absolute top-0 right-0 bg-amber-400 p-0.5 rounded-bl shadow">
                          <Crown size={8} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate max-w-[100px]">{p.displayName}</span>
                      <span className="text-[9px] text-emerald-400 block font-mono">● Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live In-Room Chat */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-3 flex flex-col h-[420px]">
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Party Chat & Activity</h3>

              {/* Chat Messages Log */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto sw-scroll space-y-2.5 pr-1">
                {activeRoom.chat && activeRoom.chat.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-xs ${msg.isSystem ? 'text-white/40 italic p-2 rounded-xl bg-white/[0.02] border border-white/5' : 'text-white/80'}`}
                  >
                    {!msg.isSystem && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-white text-[11px]">{msg.user}</span>
                        <span className="text-[9px] font-mono text-white/30">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <p className="leading-relaxed font-light">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-white/10">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-violet-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DRAWER: ADD SONG TO JAM SEARCH
      ────────────────────────────────────────────────────────────── */}
      {showAddSongDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full p-6 rounded-3xl bg-zinc-950 border border-white/15 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <ListPlus size={18} className="text-violet-400" />
                <span>Add Song to Jam Party</span>
              </h3>
              <button
                onClick={() => setShowAddSongDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search music catalog..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSongs()}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-400"
                />
              </div>
              <button
                onClick={handleSearchSongs}
                disabled={isSearchingSongs}
                className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs"
              >
                {isSearchingSongs ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
              </button>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto sw-scroll space-y-2 pr-1 min-h-[220px]">
              {songSearchResults.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                      {song.coverArtBase64 ? (
                        <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music size={14} className="m-auto text-white/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
                      <p className="text-[10px] text-white/50 truncate">{song.artist}</p>
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
