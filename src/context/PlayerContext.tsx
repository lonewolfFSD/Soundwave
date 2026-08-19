import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { MediaSession } from '@capgo/capacitor-media-session';
import { resolveFullLengthSong } from '../utils/ytMusic';
import { fetchLyrics } from '../utils/lyrics';
import { getMoodCoherentQueue, getSongRadioQueue } from '../utils/aiRecommender';
import { getLocalLikedSongs, saveLocalLikedSongs, fetchRemoteLikedSongs } from '../utils/likedSongs';
import { getLocalListenHistory, recordSongPlay } from '../utils/listenHistory';
import { auth } from '../utils/firebase';

export interface Song {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  playlistId: string
  coverArtBase64?: string
  lyrics?: string
  youtubeUrl?: string
  isOffline?: boolean
  sizeBytes?: number
  downloadedAt?: number
}

interface PlayerContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  queue: Song[]
  playedHistory: Song[]
  globalLibrary: Song[]
  isShuffle: boolean
  repeatMode: 'none' | 'one' | 'all'
  upNextQueue: Song[]
  is8DMode: boolean
  audioQuality: 'best' | 'standard'
  likedSongs: Song[]
  isSongLiked: (songOrId: string | Song) => boolean
  toggleLikeSong: (song: Song) => Promise<boolean>
  audioRef: React.RefObject<HTMLAudioElement>
  playSong: (song: Song, addToHistory?: boolean) => void
  pauseSong: () => void
  resumeSong: () => void
  nextSong: () => void
  previousSong: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  setVolume: (vol: number) => void
  setCurrentTime: (time: number) => void
  setAudioQuality: (quality: 'best' | 'standard') => void
  setQueue: (songs: Song[]) => void
  addToQueue: (song: Song) => void
  removeFromQueue: (index: number) => void
  setIs8DMode: (enabled: boolean) => void
  setSongLyrics: (lyrics: string) => void
  clearQueue: () => void
  setGlobalLibrary: React.Dispatch<React.SetStateAction<Song[]>>
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null)

  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState<Song[]>([])
  const [globalLibrary, setGlobalLibrary] = useState<Song[]>([]) 
  const [playedHistory, setPlayedHistory] = useState<Song[]>(() => getLocalListenHistory())
  const [upNextQueue, setUpNextQueue] = useState<Song[]>([])
  const [is8DMode, setIs8DMode] = useState(false)
  const [audioQuality, setAudioQualityState] = useState<'best' | 'standard'>(() => {
    return (localStorage.getItem('sw_audio_quality') as 'best' | 'standard') || 'best'
  })

  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('player_volume')
    return saved !== null ? Number(saved) : 1
  })
  const [isShuffle, setIsShuffle] = useState(() => {
    const saved = localStorage.getItem('player_shuffle')
    return saved ? saved === 'true' : false
  })
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>(() => {
    const saved = localStorage.getItem('player_repeat')
    return (saved as 'none' | 'one' | 'all') || 'none'
  })

  const [isDragging, setIsDragging] = useState(false)

  const setAudioQuality = (quality: 'best' | 'standard') => {
    setAudioQualityState(quality)
    localStorage.setItem('sw_audio_quality', quality)
    window.dispatchEvent(new Event('sw-settings-updated'))

    if (currentSong && audioRef.current && currentSong.url?.includes('/api/yt-stream')) {
      const currentPos = audioRef.current.currentTime
      const wasPlaying = isPlaying
      const base = currentSong.url.split('&quality=')[0].split('?quality=')[0]
      const delimiter = base.includes('?') ? '&' : '?'
      const updatedUrl = `${base}${delimiter}quality=${quality}`
      audioRef.current.src = updatedUrl
      audioRef.current.currentTime = currentPos
      if (wasPlaying) {
        audioRef.current.play().catch(() => {})
      }
    }
  }

  // ── WEB AUDIO API SIGNAL CHAIN ──
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const lowFilterRef = useRef<BiquadFilterNode | null>(null)
  const midFilterRef = useRef<BiquadFilterNode | null>(null)
  const highFilterRef = useRef<BiquadFilterNode | null>(null)
  const pannerNodeRef = useRef<StereoPannerNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const panAnimFrameRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)

  // Initialize Web Audio Graph on first user interaction
  const initAudioGraph = () => {
    if (audioCtxRef.current || !audioRef.current) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      const source = ctx.createMediaElementSource(audioRef.current)
      sourceNodeRef.current = source

      // 1. Equalizer Filters
      const lowFilter = ctx.createBiquadFilter()
      lowFilter.type = 'lowshelf'
      lowFilter.frequency.value = 250
      lowFilterRef.current = lowFilter

      const midFilter = ctx.createBiquadFilter()
      midFilter.type = 'peaking'
      midFilter.frequency.value = 1500
      midFilter.Q.value = 1.0
      midFilterRef.current = midFilter

      const highFilter = ctx.createBiquadFilter()
      highFilter.type = 'highshelf'
      highFilter.frequency.value = 6000
      highFilterRef.current = highFilter

      // 2. 8D Spatial Stereo Panner
      let panner: StereoPannerNode | null = null
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner()
        pannerNodeRef.current = panner
      }

      // 3. Dynamics Compressor (Volume Normalization / ReplayGain)
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.knee.value = 30
      compressor.ratio.value = 12
      compressor.attack.value = 0.003
      compressor.release.value = 0.25
      compressorRef.current = compressor

      // 4. Master Gain Node
      const gainNode = ctx.createGain()
      gainNodeRef.current = gainNode

      // Connect Signal Chain
      let lastNode: AudioNode = source
      lastNode = lastNode.connect(lowFilter)
      lastNode = lastNode.connect(midFilter)
      lastNode = lastNode.connect(highFilter)

      if (panner) {
        lastNode = lastNode.connect(panner)
      }

      const isNormalizeOn = localStorage.getItem('sw_normalize') === 'true'
      if (isNormalizeOn) {
        lastNode = lastNode.connect(compressor)
      }

      lastNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      applyEqualizerPreset(localStorage.getItem('sw_eq_preset') || 'Flat')
    } catch (e) {
      console.warn('Web Audio initialization fallback:', e)
    }
  }

  // Apply Equalizer Preset to Filters
  const applyEqualizerPreset = (preset: string) => {
    const EQ_MAP: Record<string, { low: number; mid: number; high: number }> = {
      'Flat': { low: 0, mid: 0, high: 0 },
      'Bass Boost': { low: 7, mid: 0, high: -1 },
      'Electronic': { low: 5, mid: 2, high: 4 },
      'Acoustic': { low: 2, mid: 3, high: 3 },
      'Vocal Booster': { low: -2, mid: 6, high: 1 },
      'Rock': { low: 4, mid: 2, high: 5 },
      'Hi-Fi Master': { low: 3, mid: 1, high: 4 }
    }
    const values = EQ_MAP[preset] || EQ_MAP['Flat']
    if (lowFilterRef.current && audioCtxRef.current) {
      lowFilterRef.current.gain.setTargetAtTime(values.low, audioCtxRef.current.currentTime, 0.05)
    }
    if (midFilterRef.current && audioCtxRef.current) {
      midFilterRef.current.gain.setTargetAtTime(values.mid, audioCtxRef.current.currentTime, 0.05)
    }
    if (highFilterRef.current && audioCtxRef.current) {
      highFilterRef.current.gain.setTargetAtTime(values.high, audioCtxRef.current.currentTime, 0.05)
    }
  }

  // 8D Spatial Audio Continuous Rotation Orbit (Optimized to not freeze UI)
  useEffect(() => {
    const is8DActive = is8DMode || localStorage.getItem('sw_8d_audio') === 'true'
    if (!is8DActive || !isPlaying) {
      if (panAnimFrameRef.current) {
        cancelAnimationFrame(panAnimFrameRef.current)
        panAnimFrameRef.current = null
      }
      if (pannerNodeRef.current && audioCtxRef.current) {
        pannerNodeRef.current.pan.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1)
      }
      return
    }

    let lastPanTime = 0
    const animate8D = (timestamp: number) => {
      if (timestamp - lastPanTime > 40) { // Limit to 25fps audio pan updates
        lastPanTime = timestamp
        if (pannerNodeRef.current && audioCtxRef.current && isPlaying) {
          const panValue = Math.sin(Date.now() / 2500)
          pannerNodeRef.current.pan.setValueAtTime(panValue, audioCtxRef.current.currentTime)
        }
      }
      panAnimFrameRef.current = requestAnimationFrame(animate8D)
    }

    panAnimFrameRef.current = requestAnimationFrame(animate8D)
    return () => {
      if (panAnimFrameRef.current) {
        cancelAnimationFrame(panAnimFrameRef.current)
        panAnimFrameRef.current = null
      }
    }
  }, [is8DMode, isPlaying])

  // Listen to setting updates in real time
  useEffect(() => {
    const handleSettingsUpdated = () => {
      const eq = localStorage.getItem('sw_eq_preset') || 'Flat'
      applyEqualizerPreset(eq)

      const is8D = localStorage.getItem('sw_8d_audio') === 'true'
      setIs8DMode(is8D)

      const quality = (localStorage.getItem('sw_audio_quality') as 'best' | 'standard') || 'best'
      setAudioQualityState(quality)

      // Mono Audio
      if (audioCtxRef.current) {
        const isMono = localStorage.getItem('sw_mono_audio') === 'true'
        audioCtxRef.current.destination.channelCount = isMono ? 1 : 2
      }
    }

    window.addEventListener('sw-settings-updated', handleSettingsUpdated)
    return () => window.removeEventListener('sw-settings-updated', handleSettingsUpdated)
  }, [])

  const addToQueue = (song: Song) => {
    if (!currentSong) {
      setQueue(globalLibrary.length > 0 ? globalLibrary : [song]);
      playSong(song);
      return;
    }
    setUpNextQueue((prev) => {
      if (prev.some((s) => s.id === song.id)) return prev;
      return [...prev, song];
    });
  }

  const removeFromQueue = (index: number) => {
    setUpNextQueue((prev) => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });
  }
  
  const setVolume = (vol: number) => {
    setVolumeState(vol)
    localStorage.setItem('player_volume', String(vol))
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
  }

  const setCurrentTimeHandler = (time: number) => {
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const [likedSongs, setLikedSongs] = useState<Song[]>(() => getLocalLikedSongs())

  // Sync liked songs event across windows/components
  useEffect(() => {
    const handleLikedUpdate = () => {
      setLikedSongs(getLocalLikedSongs())
    }
    window.addEventListener('soundwave-liked-updated', handleLikedUpdate)
    return () => window.removeEventListener('soundwave-liked-updated', handleLikedUpdate)
  }, [])

  // Sync listening history across windows/components
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setPlayedHistory(getLocalListenHistory())
    }
    window.addEventListener('soundwave-history-updated', handleHistoryUpdate)
    return () => window.removeEventListener('soundwave-history-updated', handleHistoryUpdate)
  }, [])

  // Fetch remote liked songs on auth state change
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u?.uid) {
        fetchRemoteLikedSongs(u.uid)
      }
    })
    return () => unsub()
  }, [])

  const isSongLiked = (songOrId: string | Song): boolean => {
    if (!songOrId) return false
    if (typeof songOrId === 'string') {
      return likedSongs.some(s => s.id === songOrId || s.title.toLowerCase() === songOrId.toLowerCase())
    }
    return likedSongs.some(s => s.id === songOrId.id || (s.title.toLowerCase() === songOrId.title.toLowerCase() && s.artist.toLowerCase() === songOrId.artist.toLowerCase()))
  }

  const toggleLikeSong = async (song: Song): Promise<boolean> => {
    if (!song) return false
    const exists = isSongLiked(song)
    let updated: Song[]
    if (exists) {
      updated = likedSongs.filter(s => !(s.id === song.id || (s.title.toLowerCase() === song.title.toLowerCase() && s.artist.toLowerCase() === song.artist.toLowerCase())))
    } else {
      updated = [song, ...likedSongs]
    }
    setLikedSongs(updated)
    saveLocalLikedSongs(updated)
    return !exists
  }

  useEffect(() => { localStorage.setItem('player_shuffle', String(isShuffle)) }, [isShuffle])
  useEffect(() => { localStorage.setItem('player_repeat', repeatMode) }, [repeatMode])

  useEffect(() => {
    if (!currentSong) return;

    const syncNativeMedia = async () => {
      await MediaSession.setMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: currentSong.artist || 'Unknown Artist',
        album: 'Soundwave',
        artwork: currentSong.coverArtBase64 ? [{ src: currentSong.coverArtBase64, sizes: '512x512', type: 'image/png' }] : []
      });

      await MediaSession.setPlaybackState({
        playbackState: isPlaying ? 'playing' : 'paused'
      });
    };

    syncNativeMedia();
  }, [currentSong, isPlaying]);

  const playSong = async (song: Song, addToHistory = true) => {
    if (!song) return

    // 1. Initialize Web Audio API Signal Chain
    initAudioGraph()
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    // 2. Private Session Check (Incognito Mode)
    const isPrivate = localStorage.getItem('sw_private_session') === 'true'
    if (addToHistory && !isPrivate) {
      recordSongPlay(song)
    }

    if (addToHistory && currentSong) {
      setPlayedHistory(prev => [...prev, currentSong])
    }

    setCurrentSong(song)
    setCurrentTime(0)
    setDuration(song.duration || 0)

    // 3. Keep Screen Awake API
    if (localStorage.getItem('sw_keep_awake') === 'true' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      } catch {}
    }

    // 4. Discord Webhook Notification
    const discordHook = localStorage.getItem('sw_discord_webhook')
    if (discordHook && discordHook.startsWith('http')) {
      try {
        fetch(discordHook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Soundwave Player',
            embeds: [{
              title: `🎵 Now Playing: ${song.title}`,
              description: `By **${song.artist}**\nLossless Hi-Fi Audio Stream`,
              color: 3447003,
              thumbnail: { url: song.coverArtBase64 || '' }
            }]
          })
        }).catch(() => {})
      } catch {}
    }

    // Resolve full-length direct audio stream with chosen audio quality (best / standard)
    const activeSong = await resolveFullLengthSong(song, audioQuality)
    setCurrentSong(activeSong)

    if (audioRef.current && activeSong.url) {
      audioRef.current.src = activeSong.url
      audioRef.current.currentTime = 0
      audioRef.current.volume = volume
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Audio playback error:", e))
    }

    fetchLyrics(song.title, song.artist, song.duration).then((lyrics) => {
      if (lyrics) {
        setCurrentSong(prev => prev && (prev.id === song.id || prev.title === song.title) ? { ...prev, lyrics } : prev)
      }
    }).catch(() => {})
  }

  const pauseSong = () => {
    audioRef.current?.pause()
    setIsPlaying(false)
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }

  const resumeSong = () => {
    initAudioGraph()
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Resume failed:", e))
    }
  }

  const nextSong = async () => {
    if (upNextQueue && upNextQueue.length > 0) {
      const nextFromUpNext = upNextQueue[0];
      removeFromQueue(0);
      if (currentSong) setPlayedHistory(prev => [...prev, currentSong]);
      playSong(nextFromUpNext, false);
      return;
    }

    const effectiveQueue = queue.length > 0 ? queue : globalLibrary;
    if (effectiveQueue.length === 0) return;

    if (currentSong) {
      setPlayedHistory(prev => [...prev, currentSong]);
    }

    if (isShuffle) {
      if (currentSong) {
        const candidatePool = effectiveQueue.filter(s => s.id !== currentSong.id && s.title !== currentSong.title)
        if (candidatePool.length > 0) {
          const coherent = getMoodCoherentQueue(currentSong, candidatePool, playedHistory, candidatePool.length)
          const topPool = coherent.slice(0, Math.min(4, coherent.length))
          const pick = topPool[Math.floor(Math.random() * topPool.length)]
          playSong(pick, false)
          return
        }
      }
      let randomIndex = Math.floor(Math.random() * effectiveQueue.length);
      if (effectiveQueue.length > 1 && (effectiveQueue[randomIndex].id === currentSong?.id || effectiveQueue[randomIndex].title === currentSong?.title)) {
        randomIndex = (randomIndex + 1) % effectiveQueue.length;
      }
      playSong(effectiveQueue[randomIndex], false);
    } else {
      let currentIndex = effectiveQueue.findIndex(s => s.id === currentSong?.id);
      if (currentIndex === -1) {
        currentIndex = effectiveQueue.findIndex(s => s.title === currentSong?.title && s.artist === currentSong?.artist);
      }
      
      if (currentIndex >= 0 && currentIndex < effectiveQueue.length - 1) {
        playSong(effectiveQueue[currentIndex + 1], false);
      } else if (currentIndex === -1 && effectiveQueue.length > 0) {
        playSong(effectiveQueue[0], false);
      } else if (repeatMode === 'all') {
        playSong(effectiveQueue[0], false);
      } else {
        // Infinite Flow Autoplay Check (Continuous ML Vibe Radio)
        const isAutoplayOn = localStorage.getItem('sw_autoplay') !== 'false' || localStorage.getItem('sw_infinite_feed') !== 'false'
        if (isAutoplayOn && currentSong) {
          try {
            const moodQueue = await getSongRadioQueue(currentSong, effectiveQueue, playedHistory, 15)
            if (moodQueue.length > 0) {
              setQueue([currentSong, ...moodQueue])
              playSong(moodQueue[0], false)
              return
            }
          } catch {}
        }
        setIsPlaying(false);
      }
    }
  }

  const previousSong = () => {
    if (currentTime > 3) {
      setCurrentTimeHandler(0);
      return;
    }

    if (playedHistory.length > 0) {
      const prevSong = playedHistory[playedHistory.length - 1];
      setPlayedHistory(prev => prev.slice(0, -1));
      playSong(prevSong, false);
      return;
    }

    const effectiveQueue = queue.length > 0 ? queue : globalLibrary;
    if (effectiveQueue.length === 0) return;

    let currentIndex = effectiveQueue.findIndex(s => s.id === currentSong?.id);
    if (currentIndex === -1) {
      currentIndex = effectiveQueue.findIndex(s => s.title === currentSong?.title && s.artist === currentSong?.artist);
    }

    if (currentIndex > 0) {
      playSong(effectiveQueue[currentIndex - 1], false);
    } else if (currentIndex === -1 && effectiveQueue.length > 0) {
      playSong(effectiveQueue[0], false);
    } else {
      playSong(effectiveQueue[effectiveQueue.length - 1], false);
    }
  }

  const lastTimeUpdateTickRef = useRef(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const now = Date.now()
      // Throttle React state update to at most once every 250ms to eliminate UI stutter
      if (now - lastTimeUpdateTickRef.current > 220) {
        lastTimeUpdateTickRef.current = now
        setCurrentTime(audio.currentTime)
      }

      // Crossfade logic
      const crossfadeSec = Number(localStorage.getItem('sw_crossfade') || 0)
      if (crossfadeSec > 0 && audio.duration && audio.duration > crossfadeSec + 4) {
        const remaining = audio.duration - audio.currentTime
        if (remaining <= crossfadeSec && remaining > 0.3 && gainNodeRef.current && audioCtxRef.current) {
          gainNodeRef.current.gain.setTargetAtTime(0.05, audioCtxRef.current.currentTime, crossfadeSec / 2)
        }
      }
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        nextSong()
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [repeatMode, queue, currentSong])

  const toggleShuffle = () => setIsShuffle(p => !p)

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      switch (prev) {
        case 'none': return 'all'
        case 'all':  return 'one'
        case 'one':  return 'none'
      }
    })
  }

  const setSongLyrics = (lyrics: string) => {
    setCurrentSong(prev => prev ? { ...prev, lyrics } : null)
  }

  const clearHistory = () => setPlayedHistory([])

  const clearQueue = () => {
    setQueue([])
    setUpNextQueue([])
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        playedHistory,
        globalLibrary,
        isShuffle,
        repeatMode,
        is8DMode,
        setIs8DMode,
        audioQuality,
        setAudioQuality,
        likedSongs,
        isSongLiked,
        toggleLikeSong,
        setSongLyrics,
        clearQueue,
        playSong,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        setCurrentTime: setCurrentTimeHandler,
        setVolume,
        setQueue,
        setGlobalLibrary,
        toggleShuffle,
        toggleRepeat,
        clearHistory,
        audioRef,
        addToQueue,
        upNextQueue,
        removeFromQueue,
        isDragging,
        setIsDragging,
      }}
    >
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}