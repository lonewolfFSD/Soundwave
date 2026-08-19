import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { MediaSession } from '@capgo/capacitor-media-session';
import { resolveFullLengthSong, isYoutubeVideoId, findYouTubeVideoId } from '../utils/ytMusic';
import { fetchLyrics } from '../utils/lyrics';
import { getMoodCoherentQueue, getSongRadioQueue } from '../utils/aiRecommender';
import { getLocalLikedSongs, saveLocalLikedSongs, fetchRemoteLikedSongs } from '../utils/likedSongs';
import { getLocalListenHistory, recordSongPlay } from '../utils/listenHistory';
import { auth } from '../utils/firebase';

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

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
  previewUrl?: string
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
  clearHistory: () => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  activeJamRoom: any | null
  setActiveJamRoom: (room: any | null) => void
  isInJam: boolean
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const activeEngineRef = useRef<'html5' | 'youtube'>('html5')

  const [activeJamRoom, setActiveJamRoom] = useState<any | null>(null)
  const isInJam = !!activeJamRoom

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

  // ── INITIALIZE GLOBAL OFFICIAL YOUTUBE PLAYER ──
  useEffect(() => {
    const initYt = () => {
      if (!window.YT || !window.YT.Player || ytPlayerRef.current) return
      try {
        const mountEl = document.getElementById('soundwave-global-yt-player')
        if (!mountEl) return
        ytPlayerRef.current = new window.YT.Player('soundwave-global-yt-player', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              try {
                event.target.unMute()
                event.target.setVolume(volume * 100)
              } catch {}
            },
            onStateChange: (event: any) => {
              if (event.data === 0) {
                // Video Ended -> Next Song
                nextSong()
              } else if (event.data === 1) {
                // Playing
                setIsPlaying(true)
                try {
                  event.target.unMute()
                  event.target.setVolume(volume * 100)
                  const dur = event.target.getDuration()
                  if (dur && dur > 0) setDuration(dur)
                } catch {}
              } else if (event.data === 2) {
                // Paused
                setIsPlaying(false)
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player API message:', err)
            }
          }
        })
      } catch (e) {
        console.warn('Error initializing global YouTube player:', e)
      }
    }

    if (window.YT && window.YT.Player) {
      initYt()
    } else {
      const existing = document.getElementById('soundwave-youtube-iframe-api')
      if (!existing) {
        const tag = document.createElement('script')
        tag.id = 'soundwave-youtube-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        const first = document.getElementsByTagName('script')[0]
        first?.parentNode?.insertBefore(tag, first)
      }

      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev()
        initYt()
      }

      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initYt()
          clearInterval(interval)
        }
      }, 300)
      return () => clearInterval(interval)
    }
  }, [])

  // Sync timeline ticker when playing via YouTube
  useEffect(() => {
    let timer: any = null
    if (isPlaying) {
      timer = setInterval(() => {
        if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const cur = ytPlayerRef.current.getCurrentTime()
            const dur = ytPlayerRef.current.getDuration()
            if (typeof cur === 'number' && !isNaN(cur)) {
              setCurrentTime(cur)
            }
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setDuration(dur)
            }
          } catch {}
        }
      }, 250)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying])

  const setAudioQuality = (quality: 'best' | 'standard') => {
    setAudioQualityState(quality)
    localStorage.setItem('sw_audio_quality', quality)
    window.dispatchEvent(new Event('sw-settings-updated'))
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

      let panner: StereoPannerNode | null = null
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner()
        panner.pan.value = 0
        pannerNodeRef.current = panner
      }

      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.setValueAtTime(-14, ctx.currentTime)
      compressor.knee.setValueAtTime(40, ctx.currentTime)
      compressor.ratio.setValueAtTime(12, ctx.currentTime)
      compressor.attack.setValueAtTime(0.003, ctx.currentTime)
      compressor.release.setValueAtTime(0.25, ctx.currentTime)
      compressorRef.current = compressor

      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(1.0, ctx.currentTime)
      gainNodeRef.current = gainNode

      if (panner) {
        source.connect(lowFilter)
        lowFilter.connect(midFilter)
        midFilter.connect(highFilter)
        highFilter.connect(panner)
        panner.connect(compressor)
        compressor.connect(gainNode)
        gainNode.connect(ctx.destination)
      } else {
        source.connect(lowFilter)
        lowFilter.connect(midFilter)
        midFilter.connect(highFilter)
        highFilter.connect(compressor)
        compressor.connect(gainNode)
        gainNode.connect(ctx.destination)
      }

      loadSavedEqualizer(lowFilter, midFilter, highFilter)
    } catch (e) {
      console.warn("Web Audio API initialization failed:", e)
    }
  }

  const loadSavedEqualizer = (low: BiquadFilterNode, mid: BiquadFilterNode, high: BiquadFilterNode) => {
    const savedEq = localStorage.getItem('sw_eq_preset') || 'flat'
    applyEqPreset(savedEq, low, mid, high)
  }

  const applyEqPreset = (preset: string, low?: BiquadFilterNode, mid?: BiquadFilterNode, high?: BiquadFilterNode) => {
    const l = low || lowFilterRef.current
    const m = mid || midFilterRef.current
    const h = high || highFilterRef.current
    if (!l || !m || !h || !audioCtxRef.current) return

    const now = audioCtxRef.current.currentTime
    switch (preset) {
      case 'bass_boost':
        l.gain.setTargetAtTime(8, now, 0.1)
        m.gain.setTargetAtTime(1, now, 0.1)
        h.gain.setTargetAtTime(2, now, 0.1)
        break
      case 'vocal':
        l.gain.setTargetAtTime(-2, now, 0.1)
        m.gain.setTargetAtTime(6, now, 0.1)
        h.gain.setTargetAtTime(3, now, 0.1)
        break
      case 'treble':
        l.gain.setTargetAtTime(-3, now, 0.1)
        m.gain.setTargetAtTime(1, now, 0.1)
        h.gain.setTargetAtTime(7, now, 0.1)
        break
      case 'rock':
        l.gain.setTargetAtTime(5, now, 0.1)
        m.gain.setTargetAtTime(-1, now, 0.1)
        h.gain.setTargetAtTime(5, now, 0.1)
        break
      case 'flat':
      default:
        l.gain.setTargetAtTime(0, now, 0.1)
        m.gain.setTargetAtTime(0, now, 0.1)
        h.gain.setTargetAtTime(0, now, 0.1)
        break
    }
  }

  // 8D Audio Rotation Loop
  useEffect(() => {
    if (!is8DMode || !pannerNodeRef.current || !isPlaying) {
      if (panAnimFrameRef.current) {
        cancelAnimationFrame(panAnimFrameRef.current)
        panAnimFrameRef.current = null
      }
      if (pannerNodeRef.current) {
        pannerNodeRef.current.pan.value = 0
      }
      return
    }

    let angle = 0
    const rotate = () => {
      if (!pannerNodeRef.current) return
      angle += 0.015
      pannerNodeRef.current.pan.value = Math.sin(angle)
      panAnimFrameRef.current = requestAnimationFrame(rotate)
    }
    panAnimFrameRef.current = requestAnimationFrame(rotate)

    return () => {
      if (panAnimFrameRef.current) cancelAnimationFrame(panAnimFrameRef.current)
    }
  }, [is8DMode, isPlaying])

  // Listen to external EQ Preset Changes
  useEffect(() => {
    const handleEqChange = (e: any) => {
      if (e.detail?.preset) {
        applyEqPreset(e.detail.preset)
      }
    }
    window.addEventListener('sw-eq-change', handleEqChange)
    return () => window.removeEventListener('sw-eq-change', handleEqChange)
  }, [])

  // ── LIKED SONGS STATE & FIREBASE SYNC ──
  const [likedSongs, setLikedSongs] = useState<Song[]>(() => getLocalLikedSongs())

  useEffect(() => {
    const handleLikedUpdate = (e: any) => {
      if (e.detail?.likedSongs) {
        setLikedSongs(e.detail.likedSongs)
      }
    }
    window.addEventListener('sw-liked-songs-updated', handleLikedUpdate)
    return () => window.removeEventListener('sw-liked-songs-updated', handleLikedUpdate)
  }, [])

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

    initAudioGraph()
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    const isPrivate = localStorage.getItem('sw_private_session') === 'true'
    if (addToHistory && !isPrivate) {
      recordSongPlay(song)
    }

    if (addToHistory && currentSong) {
      setPlayedHistory(prev => [...prev, currentSong])
    }

    setCurrentSong(song)
    setCurrentTime(0)
    setDuration(song.duration || 210)

    if (localStorage.getItem('sw_keep_awake') === 'true' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      } catch {}
    }

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

    const isLocalHost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.')
    )

    const isUploadedSong = song.url?.startsWith('blob:') ||
      song.url?.startsWith('data:') ||
      song.playlistId === 'global' ||
      song.url?.includes('cloudinary') ||
      song.url?.includes('firebasestorage')

    if (isUploadedSong) {
      activeEngineRef.current = 'html5'
      try { ytPlayerRef.current?.pauseVideo() } catch {}

      if (audioRef.current && song.url) {
        audioRef.current.crossOrigin = 'anonymous'
        audioRef.current.src = song.url
        audioRef.current.currentTime = 0
        audioRef.current.volume = volume
        audioRef.current.muted = false
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Audio playback error:", e))
      }
    } else if (isLocalHost) {
      // Local dev server with yt-dlp backend
      const activeSong = await resolveFullLengthSong(song, audioQuality)
      setCurrentSong(activeSong)
      activeEngineRef.current = 'html5'
      try { ytPlayerRef.current?.pauseVideo() } catch {}

      if (audioRef.current && activeSong.url) {
        audioRef.current.crossOrigin = 'anonymous'
        audioRef.current.src = activeSong.url
        audioRef.current.currentTime = 0
        audioRef.current.volume = volume
        audioRef.current.muted = false
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Audio playback error:", e))
      }
    } else {
      // 🌟 Production: Official YouTube Stream Player (100% Full Song, 0 Errors)
      let videoId = ''
      const cleanId = (song.id || '').replace('yt_', '').trim()
      if (isYoutubeVideoId(cleanId)) {
        videoId = cleanId
      } else {
        videoId = await findYouTubeVideoId(song.title, song.artist)
      }

      if (videoId) {
        activeEngineRef.current = 'youtube'
        try { audioRef.current?.pause() } catch {}

        try {
          ytPlayerRef.current?.loadVideoById({ videoId, startSeconds: 0 })
          ytPlayerRef.current?.unMute()
          ytPlayerRef.current?.setVolume(volume * 100)
          ytPlayerRef.current?.playVideo()
        } catch (e) {
          console.warn('YouTube Player load error:', e)
        }
        setIsPlaying(true)
      } else if (song.previewUrl) {
        // Fallback
        activeEngineRef.current = 'html5'
        if (audioRef.current) {
          audioRef.current.src = song.previewUrl
          audioRef.current.currentTime = 0
          audioRef.current.volume = volume
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
        }
      }
    }

    fetchLyrics(song.title, song.artist, song.duration).then((lyrics) => {
      if (lyrics) {
        setCurrentSong(prev => prev && (prev.id === song.id || prev.title === song.title) ? { ...prev, lyrics } : prev)
      }
    }).catch(() => {})
  }

  const pauseSong = () => {
    if (activeEngineRef.current === 'youtube') {
      try { ytPlayerRef.current?.pauseVideo() } catch {}
    } else {
      audioRef.current?.pause()
    }
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

    if (activeEngineRef.current === 'youtube') {
      try {
        ytPlayerRef.current?.unMute()
        ytPlayerRef.current?.setVolume(volume * 100)
        ytPlayerRef.current?.playVideo()
      } catch {}
      setIsPlaying(true)
    } else {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Resume failed:", e))
      }
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
      return;
    }

    const currentIndex = effectiveQueue.findIndex(s => s.id === currentSong?.id || s.title === currentSong?.title);
    if (currentIndex !== -1 && currentIndex < effectiveQueue.length - 1) {
      playSong(effectiveQueue[currentIndex + 1], false);
    } else if (repeatMode === 'all') {
      playSong(effectiveQueue[0], false);
    } else {
      if (currentSong) {
        try {
          const moodQueue = await getSongRadioQueue(currentSong, playedHistory, 10);
          if (moodQueue.length > 0) {
            setQueue(moodQueue);
            playSong(moodQueue[0], false);
            return;
          }
        } catch (e) {
          console.warn('Continuous mood queue resolution error:', e);
        }
      }
      playSong(effectiveQueue[0], false);
    }
  }

  const previousSong = () => {
    if (currentTime > 3) {
      setCurrentTimeHandler(0)
      return
    }

    if (playedHistory.length > 0) {
      const prevSong = playedHistory[playedHistory.length - 1]
      setPlayedHistory(prev => prev.slice(0, -1))
      playSong(prevSong, false);
      return
    }

    const effectiveQueue = queue.length > 0 ? queue : globalLibrary;
    if (effectiveQueue.length === 0) return;

    const currentIndex = effectiveQueue.findIndex(s => s.id === currentSong?.id);
    if (currentIndex > 0) {
      playSong(effectiveQueue[currentIndex - 1], false);
    } else if (repeatMode === 'all') {
      playSong(effectiveQueue[effectiveQueue.length - 1], false);
    } else {
      playSong(effectiveQueue[0], false);
    }
  }

  const setCurrentTimeHandler = (time: number) => {
    setCurrentTime(time)
    if (activeEngineRef.current === 'youtube') {
      try {
        ytPlayerRef.current?.seekTo(time, true)
      } catch {}
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = time
      }
    }
  }

  const setVolume = (newVol: number) => {
    setVolumeState(newVol)
    localStorage.setItem('player_volume', String(newVol))
    if (audioRef.current) {
      audioRef.current.volume = newVol
    }
    try {
      ytPlayerRef.current?.unMute()
      ytPlayerRef.current?.setVolume(newVol * 100)
    } catch {}
  }

  const addToQueue = (song: Song) => {
    setUpNextQueue(prev => [...prev, song])
  }

  const removeFromQueue = (index: number) => {
    setUpNextQueue(prev => prev.filter((_, i) => i !== index))
  }

  // Handle Audio Element Lifecycle
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let lastTimeUpdate = 0
    const handleTimeUpdate = () => {
      if (activeEngineRef.current !== 'html5') return
      const now = performance.now()
      if (now - lastTimeUpdate < 220) return
      lastTimeUpdate = now

      setCurrentTime(audio.currentTime)

      const crossfadeSec = Number(localStorage.getItem('sw_crossfade_duration') || 0)
      if (crossfadeSec > 0 && audio.duration && !isNaN(audio.duration) && gainNodeRef.current && audioCtxRef.current) {
        const timeLeft = audio.duration - audio.currentTime
        if (timeLeft <= crossfadeSec && timeLeft > 0) {
          gainNodeRef.current.gain.setTargetAtTime(0.05, audioCtxRef.current.currentTime, crossfadeSec / 2)
        }
      }
    }

    const handleLoadedMetadata = () => {
      if (activeEngineRef.current === 'html5' && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      if (activeEngineRef.current !== 'html5') return
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
        activeJamRoom,
        setActiveJamRoom,
        isInJam,
      }}
    >
      {children}
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />
      {/* 🌟 Global Official YouTube Stream Bridge for Full-Length Playback */}
      <div
        id="soundwave-global-yt-player-container"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 200,
          height: 200,
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -10
        }}
      >
        <div id="soundwave-global-yt-player" />
      </div>
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