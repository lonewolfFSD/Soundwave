import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';
import { nativePlayer, isNativeAudioSupported } from '../utils/nativePlayer';
import { resolveFullLengthSong, isYoutubeVideoId, findYouTubeVideoId, extractYoutubeVideoId } from '../utils/ytMusic';
import { fetchLyrics } from '../utils/lyrics';
import { getMoodCoherentQueue, getSongRadioQueue } from '../utils/aiRecommender';
import { getLocalLikedSongs, saveLocalLikedSongs, fetchRemoteLikedSongs } from '../utils/likedSongs';
import { getLocalListenHistory, recordSongPlay } from '../utils/listenHistory';
import { auth } from '../utils/firebase';
import { getOfflineSongById } from '../utils/offlineStorage';
import {
  getOrCreateDeviceId,
  detectDeviceInfo,
  registerDevice,
  updateDeviceHeartbeat,
  unregisterDevice,
  subscribeToUserDevices,
  subscribeToPlaybackState,
  syncPlaybackState,
  transferPlaybackToTarget,
  type DeviceInfo,
  type PlaybackState
} from '../utils/deviceSync';

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
  currentDeviceId: string
  activeDeviceId: string | null
  activeDeviceName: string
  connectedDevices: DeviceInfo[]
  isRemotePlayback: boolean
  transferPlaybackToDevice: (targetDeviceId: string, targetDeviceName: string) => Promise<void>
  showDevicePicker: boolean
  setShowDevicePicker: (show: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const activeEngineRef = useRef<'html5' | 'youtube'>('html5')
  const isAdvancingRef = useRef(false)

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

  // ── CROSS-DEVICE & SPOTIFY CONNECT SYNC STATES ──
  const [currentDeviceId] = useState<string>(() => getOrCreateDeviceId())
  const [localDeviceInfo, setLocalDeviceInfo] = useState<DeviceInfo>(() => detectDeviceInfo())
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [activeDeviceName, setActiveDeviceName] = useState<string>('')
  const [showDevicePicker, setShowDevicePicker] = useState(false)
  const isSyncingFromRemoteRef = useRef(false)
  const isTransferringRef = useRef(false)
  const currentSongRef = useRef<Song | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const currentTimeRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  const isRemotePlayback = !!(activeDeviceId && activeDeviceId !== currentDeviceId)

  useEffect(() => {
    currentSongRef.current = currentSong
  }, [currentSong])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  // ── CROSS-DEVICE LIFECYCLE & PRESENCE ──
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setConnectedDevices([])
        setActiveDeviceId(null)
        return
      }

      // Register this device in Firestore
      const info = await registerDevice(firebaseUser.uid)
      setLocalDeviceInfo(info)

      // Heartbeat pulse every 25 seconds
      const heartbeatInterval = setInterval(() => {
        updateDeviceHeartbeat(firebaseUser.uid, currentDeviceId)
      }, 25000)

      // Subscribe to connected devices
      const unsubDevices = subscribeToUserDevices(firebaseUser.uid, (devices) => {
        setConnectedDevices(devices)
      })

      // Subscribe to real-time playback state
      const unsubPlayback = subscribeToPlaybackState(firebaseUser.uid, async (remoteState) => {
        if (!remoteState || !remoteState.currentSong) return
        if (isTransferringRef.current) return

        // 🛑 Ignore own echoed broadcasts from Firestore to eliminate infinite loops & crazy track skipping!
        if (remoteState.senderDeviceId === currentDeviceId) return

        // 1. Playback is active on another device (Remote Mode)
        if (remoteState.activeDeviceId && remoteState.activeDeviceId !== currentDeviceId) {
          setActiveDeviceId(remoteState.activeDeviceId)
          setActiveDeviceName(remoteState.activeDeviceName || 'Remote Device')

          // Stop local audio output immediately so only the remote device plays sound
          if (activeEngineRef.current === 'youtube') {
            try { ytPlayerRef.current?.pauseVideo() } catch {}
          } else if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause()
          }

          // Mirror remote state metadata & queue in UI
          isSyncingFromRemoteRef.current = true
          setIsPlaying(remoteState.isPlaying)
          setCurrentSong(remoteState.currentSong)
          if (remoteState.queue && Array.isArray(remoteState.queue) && remoteState.queue.length > 0) {
            setQueue(remoteState.queue)
          }
          if (typeof remoteState.position === 'number') {
            setCurrentTime(remoteState.position)
          }
          if (typeof remoteState.duration === 'number' && remoteState.duration > 0) {
            setDuration(remoteState.duration)
          }
          setTimeout(() => { isSyncingFromRemoteRef.current = false }, 150)
          return
        }

        // 2. Playback is active on THIS DEVICE
        if (remoteState.activeDeviceId === currentDeviceId) {
          setActiveDeviceId(currentDeviceId)
          setActiveDeviceName(localDeviceInfo.name)

          // Restore Queue, Repeat, Shuffle from cloud session
          if (remoteState.queue && Array.isArray(remoteState.queue) && remoteState.queue.length > 0) {
            setQueue(remoteState.queue)
          }
          if (remoteState.repeatMode) {
            setRepeatMode(remoteState.repeatMode)
          }
          if (typeof remoteState.isShuffle === 'boolean') {
            setIsShuffle(remoteState.isShuffle)
          }

          const isSameSong = currentSongRef.current?.id === remoteState.currentSong.id
          const isLocalPlaying = isPlayingRef.current || (audioRef.current && !audioRef.current.paused)

          // Latency compensation
          const elapsed = Math.max(0, Math.min(30, (Date.now() - (remoteState.updatedAt || Date.now())) / 1000))
          const targetPos = Math.min((remoteState.position || 0) + (remoteState.isPlaying ? elapsed : 0), remoteState.duration || 9999)

          // 🛑 CASE A: Remote requested PAUSE
          if (!remoteState.isPlaying) {
            if (isLocalPlaying) {
              if (activeEngineRef.current === 'youtube') {
                try { ytPlayerRef.current?.pauseVideo() } catch {}
              } else if (audioRef.current) {
                audioRef.current.pause()
              }
              setIsPlaying(false)
            }
            if (!isSameSong) {
              setCurrentSong(remoteState.currentSong)
            }
            if (typeof remoteState.position === 'number') {
              setCurrentTime(remoteState.position)
            }
            return
          }

          // ▶️ CASE B: Remote requested PLAY
          if (remoteState.isPlaying) {
            if (!isSameSong || !isLocalPlaying) {
              isSyncingFromRemoteRef.current = true
              await playSong(remoteState.currentSong, false, targetPos)
              setTimeout(() => { isSyncingFromRemoteRef.current = false }, 500)
            } else {
              if (Math.abs(currentTime - targetPos) > 3) {
                if (activeEngineRef.current === 'youtube') {
                  try { ytPlayerRef.current?.seekTo(targetPos, true) } catch {}
                } else if (audioRef.current) {
                  audioRef.current.currentTime = targetPos
                }
                setCurrentTime(targetPos)
              }
            }
          }
        }
      })

      return () => {
        clearInterval(heartbeatInterval)
        unsubDevices()
        unsubPlayback()
        unregisterDevice(firebaseUser.uid, currentDeviceId)
      }
    })

    return () => {
      unsubAuth()
    }
  }, [currentDeviceId])

  // ── PERIODIC POSITION BROADCAST WHILE ACTIVE HOST IS PLAYING ──
  useEffect(() => {
    let syncTimer: any = null
    const currentUser = auth.currentUser

    if (currentUser && isPlaying && !isRemotePlayback && !isInJam && !isSyncingFromRemoteRef.current) {
      syncTimer = setInterval(() => {
        let livePos = currentTime
        if (activeEngineRef.current === 'html5' && audioRef.current && !isNaN(audioRef.current.currentTime) && audioRef.current.currentTime > 0) {
          livePos = audioRef.current.currentTime
        } else if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const ytCur = ytPlayerRef.current.getCurrentTime()
            if (typeof ytCur === 'number' && !isNaN(ytCur) && ytCur > 0) livePos = ytCur
          } catch {}
        }

        if (livePos > 0) {
          syncPlaybackState(currentUser.uid, {
            activeDeviceId: currentDeviceId,
            activeDeviceName: localDeviceInfo.name,
            senderDeviceId: currentDeviceId,
            position: livePos,
            updatedAt: Date.now()
          })
        }
      }, 2500)
    }

    return () => {
      if (syncTimer) clearInterval(syncTimer)
    }
  }, [isPlaying, isRemotePlayback, isInJam, currentDeviceId, localDeviceInfo.name, currentTime])

  // ── SPOTIFY CONNECT TRANSFER FUNCTION ──
  const transferPlaybackToDevice = async (targetDeviceId: string, targetDeviceName: string) => {
    const user = auth.currentUser
    if (!user) return

    isTransferringRef.current = true
    const isTargetThisDevice = targetDeviceId === currentDeviceId

    // Grab the exact live seek position
    let currentSeekTime = currentTime
    if (activeEngineRef.current === 'html5' && audioRef.current && !isNaN(audioRef.current.currentTime) && audioRef.current.currentTime > 0) {
      currentSeekTime = audioRef.current.currentTime
    } else if (activeEngineRef.current === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      try {
        const ytCur = ytPlayerRef.current.getCurrentTime()
        if (typeof ytCur === 'number' && !isNaN(ytCur) && ytCur > 0) currentSeekTime = ytCur
      } catch {}
    }

    const effectiveQueue = (queue && queue.length > 0) ? queue : globalLibrary

    if (isTargetThisDevice) {
      setActiveDeviceId(currentDeviceId)
      setActiveDeviceName(localDeviceInfo.name)
      if (currentSong) {
        await playSong(currentSong, false, currentSeekTime)
      }
      await syncPlaybackState(user.uid, {
        activeDeviceId: currentDeviceId,
        activeDeviceName: localDeviceInfo.name,
        senderDeviceId: currentDeviceId,
        currentSong,
        isPlaying: true,
        position: currentSeekTime,
        duration,
        queue: effectiveQueue,
        isShuffle,
        repeatMode,
        updatedAt: Date.now()
      })
    } else {
      pauseSong()
      setActiveDeviceId(targetDeviceId)
      setActiveDeviceName(targetDeviceName)
      await transferPlaybackToTarget(user.uid, targetDeviceId, targetDeviceName, {
        currentSong,
        isPlaying: true,
        position: currentSeekTime,
        duration,
        queue: effectiveQueue,
        isShuffle,
        repeatMode
      })
    }

    setTimeout(() => {
      isTransferringRef.current = false
    }, 1000)
  }

  // ── INITIALIZE GLOBAL OFFICIAL YOUTUBE PLAYER ──
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform()

    const initYt = () => {
      if (!window.YT || !window.YT.Player || ytPlayerRef.current) return
      try {
        const mountEl = document.getElementById('soundwave-global-yt-player')
        if (!mountEl) return

        const playerVars: any = {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3
        }

        // Avoid passing invalid capacitor:// origin on native
        if (!isNative && window.location.origin && window.location.origin.startsWith('http')) {
          playerVars.origin = window.location.origin
        }

        ytPlayerRef.current = new window.YT.Player('soundwave-global-yt-player', {
          height: '100%',
          width: '100%',
          playerVars,
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
                if (!isAdvancingRef.current) {
                  isAdvancingRef.current = true;
                  setTimeout(() => { isAdvancingRef.current = false; }, 1500);
                  if (repeatMode === 'one') {
                    try {
                      event.target.seekTo(0, true);
                      event.target.playVideo();
                    } catch {}
                  } else {
                    nextSong();
                  }
                }
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
                // Paused: Ignore unintended background auto-pause if user did not manually pause
                if (isPlayingRef.current && (document.hidden || !document.hasFocus())) {
                  try { event.target.playVideo() } catch {}
                } else {
                  setIsPlaying(false)
                }
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

  // Sync timeline ticker when playing via YouTube (50ms ultra-smooth live tracking)
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
      }, 50)
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
  const spatialFilterRef = useRef<BiquadFilterNode | null>(null)
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

      const spatialFilter = ctx.createBiquadFilter()
      spatialFilter.type = 'lowpass'
      spatialFilter.frequency.value = 20000
      spatialFilterRef.current = spatialFilter

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
        panner.connect(spatialFilter)
        spatialFilter.connect(compressor)
        compressor.connect(gainNode)
        gainNode.connect(ctx.destination)
      } else {
        source.connect(lowFilter)
        lowFilter.connect(midFilter)
        midFilter.connect(highFilter)
        highFilter.connect(spatialFilter)
        spatialFilter.connect(compressor)
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
    if (!is8DMode) {
      if (panAnimFrameRef.current) {
        cancelAnimationFrame(panAnimFrameRef.current)
        panAnimFrameRef.current = null
      }
      if (pannerNodeRef.current && audioCtxRef.current) {
        pannerNodeRef.current.pan.setValueAtTime(0, audioCtxRef.current.currentTime)
      }
      if (spatialFilterRef.current && audioCtxRef.current) {
        spatialFilterRef.current.frequency.setValueAtTime(20000, audioCtxRef.current.currentTime)
      }
      return
    }

    // Ensure audio graph is initialized and context is active
    initAudioGraph()

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    let angle = 0
    let lastTime = performance.now()
    const rotate = (nowTime: number) => {
      const dt = Math.min((nowTime - lastTime) / 1000, 0.1)
      lastTime = nowTime

      // Smooth orbital rotation: 1 full 360-degree rotation every 5.5 seconds
      angle = (angle + dt * (Math.PI * 2 / 5.5)) % (Math.PI * 2)

      // Dynamic Left (-1.0) to Right (+1.0) sinusoidal panning
      const panValue = Math.sin(angle)

      // Psychoacoustic behind-head occlusion simulation:
      // When sound is behind listener (cos(angle) < 0), gently dip highest frequencies
      const cosAngle = Math.cos(angle)
      const depth = (cosAngle + 1) / 2 // 0 (behind) to 1 (in front)
      const cutoffFreq = 4000 + depth * 16000 // 4kHz to 20kHz

      if (audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime
        if (pannerNodeRef.current) {
          pannerNodeRef.current.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), now)
        }
        if (spatialFilterRef.current) {
          spatialFilterRef.current.frequency.setValueAtTime(cutoffFreq, now)
        }
      }

      panAnimFrameRef.current = requestAnimationFrame(rotate)
    }
    panAnimFrameRef.current = requestAnimationFrame(rotate)

    return () => {
      if (panAnimFrameRef.current) {
        cancelAnimationFrame(panAnimFrameRef.current)
        panAnimFrameRef.current = null
      }
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

  // --- BACKGROUND PLAYBACK & NOTIFICATION BAR CONTROL ENGINE ---
  useEffect(() => {
    // 1. Setup Standard Web & Android WebView MediaSession Handlers
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          resumeSong();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          pauseSong();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          nextSong();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          previousSong();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            setCurrentTimeHandler(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          const cur = audioRef.current?.currentTime || currentTime;
          setCurrentTimeHandler(Math.max(0, cur - skipTime));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          const cur = audioRef.current?.currentTime || currentTime;
          setCurrentTimeHandler(cur + skipTime);
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          pauseSong();
        });
      } catch (err) {
        console.warn('Web MediaSession action handler setup error:', err);
      }
    }

    // 2. Setup Capacitor Native Android / iOS MediaSession Handlers
    try {
      MediaSession.setActionHandler({ action: 'play' }, () => {
        resumeSong();
      });
      MediaSession.setActionHandler({ action: 'pause' }, () => {
        pauseSong();
      });
      MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
        nextSong();
      });
      MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
        previousSong();
      });
      MediaSession.setActionHandler({ action: 'seekto' }, (data: any) => {
        const targetPos = data.position ?? data.seekTime;
        if (targetPos !== undefined && targetPos !== null) {
          setCurrentTimeHandler(Number(targetPos));
        }
      });
      MediaSession.setActionHandler({ action: 'seekbackward' }, (data: any) => {
        const offset = data.seekOffset || 10;
        const cur = audioRef.current?.currentTime || currentTime;
        setCurrentTimeHandler(Math.max(0, cur - offset));
      });
      MediaSession.setActionHandler({ action: 'seekforward' }, (data: any) => {
        const offset = data.seekOffset || 10;
        const cur = audioRef.current?.currentTime || currentTime;
        setCurrentTimeHandler(cur + offset);
      });
    } catch (err) {
      console.warn('Capacitor MediaSession action handler setup error:', err);
    }
  }, []);

  // Synchronize Track Metadata across Lock Screen & Notification Center
  useEffect(() => {
    if (!currentSong) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
      MediaSession.setPlaybackState({ playbackState: 'none' }).catch(() => {});
      return;
    }

    const artworkList = currentSong.coverArtBase64 ? [
      { src: currentSong.coverArtBase64, sizes: '96x96', type: 'image/png' },
      { src: currentSong.coverArtBase64, sizes: '128x128', type: 'image/png' },
      { src: currentSong.coverArtBase64, sizes: '192x192', type: 'image/png' },
      { src: currentSong.coverArtBase64, sizes: '256x256', type: 'image/png' },
      { src: currentSong.coverArtBase64, sizes: '384x384', type: 'image/png' },
      { src: currentSong.coverArtBase64, sizes: '512x512', type: 'image/png' }
    ] : [];

    // Web MediaSession Metadata
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || 'SoundWave Track',
          artist: currentSong.artist || 'Unknown Artist',
          album: 'SoundWave',
          artwork: artworkList
        });
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (err) {}
    }

    // Native Capacitor MediaSession Metadata
    MediaSession.setMetadata({
      title: currentSong.title || 'SoundWave Track',
      artist: currentSong.artist || 'Unknown Artist',
      album: 'SoundWave',
      artwork: artworkList
    }).catch(() => {});

    MediaSession.setPlaybackState({
      playbackState: isPlaying ? 'playing' : 'paused',
      position: currentTime,
      duration: duration || currentSong?.duration || 0,
      playbackRate: 1.0
    }).catch(() => {});
  }, [currentSong?.id, currentSong?.title, currentSong?.artist, isPlaying, currentTime, duration]);

  // Synchronize Timeline Scrubber on Notification Bar every second
  useEffect(() => {
    if (!currentSong) return;

    const syncNotificationTimeline = () => {
      // Use latest values via refs to avoid stale closures in interval
      const dur = durationRef.current || currentSongRef.current?.duration || 0;
      const pos = currentTimeRef.current || 0;
      const playing = isPlayingRef.current;

      if (dur > 0 && !isNaN(dur) && !isNaN(pos)) {
        // Web MediaSession position state
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: 1.0,
              position: Math.min(dur, Math.max(0, pos))
            });
          } catch (err) {}
        }

        // Native Capacitor MediaSession position state
        MediaSession.setPositionState({
          duration: dur,
          playbackRate: 1.0,
          position: Math.min(dur, Math.max(0, pos))
        }).catch(() => {});

        MediaSession.setPlaybackState({
          playbackState: playing ? 'playing' : 'paused',
          duration: dur,
          position: Math.min(dur, Math.max(0, pos)),
          playbackRate: 1.0
        }).catch(() => {});
      }
    };

    // Run once on state changes that matter for the notification display
    syncNotificationTimeline();

    // Also run periodically to keep seeker moving while app is in background
    const timer = setInterval(syncNotificationTimeline, 1000);
    return () => clearInterval(timer);
  }, [currentSong?.id, isPlaying]); // Remove currentTime and duration to avoid interval thrashing

  // Keep AudioContext and HTML5 Audio alive across app minimization & screen lock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended' && isPlayingRef.current) {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (activeEngineRef.current === 'html5' && audioRef.current && isPlayingRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // ── ATTACH STANDALONE ANDROID MEDIA3 / EXOPLAYER EVENT LISTENERS ──
  useEffect(() => {
    if (!isNativeAudioSupported()) return;

    const unTrackEnd = nativePlayer.onTrackEnd(() => {
      nextSong();
    });

    const unStateChange = nativePlayer.onPlaybackStateChange((playing) => {
      setIsPlaying(playing);
    });

    const unPosUpdate = nativePlayer.onPositionUpdate((pos, dur) => {
      if (!isDragging) {
        setCurrentTime(pos);
      }
      if (dur > 0) {
        setDuration(dur);
      }
    });

    return () => {
      unTrackEnd?.then(h => h.remove());
      unStateChange?.then(h => h.remove());
      unPosUpdate?.then(h => h.remove());
    };
  }, [queue, currentSong, repeatMode, isShuffle, isDragging]);

  const playSong = async (song: Song, addToHistory = true, startPosition = 0) => {
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

    // Check if track is cached offline
    try {
      const offlineSong = await getOfflineSongById(song.id);
      if (offlineSong) {
        song = offlineSong;
      }
    } catch {}

    setCurrentSong(song)
    setCurrentTime(startPosition)
    setDuration(song.duration || 210)

    // Cross-Device Playback Sync
    const currentUser = auth.currentUser
    if (currentUser && !isInJam && !isSyncingFromRemoteRef.current) {
      setActiveDeviceId(currentDeviceId)
      setActiveDeviceName(localDeviceInfo.name)
      syncPlaybackState(currentUser.uid, {
        activeDeviceId: currentDeviceId,
        activeDeviceName: localDeviceInfo.name,
        senderDeviceId: currentDeviceId,
        currentSong: song,
        isPlaying: true,
        position: startPosition,
        duration: song.duration || 210,
        queue,
        isShuffle,
        repeatMode,
        updatedAt: Date.now()
      })
    }

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

    const isNative = Capacitor.isNativePlatform();

    const isLocalHost = !isNative && typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.')
    )

    const isUploadedSong = song.url?.startsWith('blob:') ||
      song.url?.startsWith('data:') ||
      song.playlistId === 'global' ||
      song.playlistId === 'offline' ||
      song.isOffline === true ||
      song.url?.includes('cloudinary') ||
      song.url?.includes('firebasestorage')

    // Request Battery Optimization Ignore on Start if on Android
    if (Capacitor.getPlatform() === 'android' && (window as any).AndroidSettings?.requestIgnoreBatteryOptimizations) {
      (window as any).AndroidSettings.requestIgnoreBatteryOptimizations();
    }

    // 🌟 Standalone Android Media3 / ExoPlayer Native Playback
    if (isNativeAudioSupported() && song.url) {
      activeEngineRef.current = 'html5';
      try { audioRef.current?.pause(); } catch {}
      try { ytPlayerRef.current?.pauseVideo(); } catch {}

      nativePlayer.play({
        url: song.url,
        title: song.title,
        artist: song.artist,
        album: (song as any).album || 'SoundWave',
        artwork: song.coverArtBase64 || '',
        position: startPosition
      }).then((success) => {
        if (success) {
          setIsPlaying(true);
        }
      });

      fetchLyrics(song.title, song.artist, song.duration, (song as any).youtubeId).then((lyrics) => {
        if (lyrics) {
          setCurrentSong(prev => prev && (prev.id === song.id || prev.title === song.title) ? { ...prev, lyrics } : prev);
        }
      }).catch(() => {});

      return;
    }

    if (isUploadedSong) {
      activeEngineRef.current = 'html5'
      try { ytPlayerRef.current?.pauseVideo() } catch {}

      if (audioRef.current && song.url) {
        audioRef.current.crossOrigin = 'anonymous'
        audioRef.current.src = song.url
        audioRef.current.volume = volume
        audioRef.current.muted = false
        if (startPosition > 0) {
          audioRef.current.currentTime = startPosition
        }
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true)
            if (startPosition > 0 && audioRef.current) {
              audioRef.current.currentTime = startPosition
            }
          })
          .catch(e => console.error("Audio playback error:", e))
      }
    } else {
      // 🌟 Official YouTube Stream Player (100% Full Song, 0 Previews, 0 Backend Dependencies)
      let videoId = extractYoutubeVideoId(song.id) ||
                    extractYoutubeVideoId((song as any).youtubeId) ||
                    extractYoutubeVideoId(song.youtubeUrl) ||
                    extractYoutubeVideoId(song.url);

      if (!videoId) {
        videoId = await findYouTubeVideoId(song.title, song.artist);
      }

      if (videoId) {
        activeEngineRef.current = 'youtube'
        try { audioRef.current?.pause() } catch {}

        const playYt = () => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
            try {
              ytPlayerRef.current.loadVideoById({ videoId, startSeconds: startPosition })
              ytPlayerRef.current.unMute()
              ytPlayerRef.current.setVolume(volume * 100)
              ytPlayerRef.current.playVideo()
              setIsPlaying(true)
              if (startPosition > 0) {
                setTimeout(() => { try { ytPlayerRef.current?.seekTo(startPosition, true) } catch {} }, 300)
                setTimeout(() => { try { ytPlayerRef.current?.seekTo(startPosition, true) } catch {} }, 700)
                setTimeout(() => { try { ytPlayerRef.current?.seekTo(startPosition, true) } catch {} }, 1200)
              }
            } catch (e) {
              console.warn('YouTube Player load error:', e)
            }
          } else {
            setTimeout(playYt, 250)
          }
        }
        playYt()
      }
    }

    fetchLyrics(song.title, song.artist, song.duration, song.youtubeId).then((lyrics) => {
      if (lyrics) {
        setCurrentSong(prev => prev && (prev.id === song.id || prev.title === song.title) ? { ...prev, lyrics } : prev)
      }
    }).catch(() => {})
  }

  const pauseSong = () => {
    if (isNativeAudioSupported()) {
      nativePlayer.pause();
    }

    if (isRemotePlayback) {
      // Remote Mode: send command to active host without touching local audio hardware
      setIsPlaying(false)
      const user = auth.currentUser
      if (user && !isInJam) {
        syncPlaybackState(user.uid, {
          activeDeviceId,
          activeDeviceName,
          isPlaying: false,
          position: currentTime,
          updatedAt: Date.now()
        })
      }
      return
    }

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

    const user = auth.currentUser
    if (user && !isInJam && !isSyncingFromRemoteRef.current) {
      syncPlaybackState(user.uid, {
        activeDeviceId: currentDeviceId,
        activeDeviceName: localDeviceInfo.name,
        senderDeviceId: currentDeviceId,
        isPlaying: false,
        position: currentTime,
        updatedAt: Date.now()
      })
    }
  }

  const resumeSong = () => {
    if (isNativeAudioSupported()) {
      nativePlayer.resume();
      setIsPlaying(true);
      return;
    }

    if (isRemotePlayback) {
      // Remote Mode: send resume to active host without local sound output
      setIsPlaying(true)
      const user = auth.currentUser
      if (user && !isInJam) {
        syncPlaybackState(user.uid, {
          activeDeviceId,
          activeDeviceName,
          senderDeviceId: currentDeviceId,
          isPlaying: true,
          position: currentTime,
          updatedAt: Date.now()
        })
      }
      return
    }

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

    const user = auth.currentUser
    if (user && !isInJam && !isSyncingFromRemoteRef.current) {
      syncPlaybackState(user.uid, {
        activeDeviceId: currentDeviceId,
        activeDeviceName: localDeviceInfo.name,
        senderDeviceId: currentDeviceId,
        isPlaying: true,
        position: currentTime,
        updatedAt: Date.now()
      })
    }
  }

  const nextSong = async () => {
    if (isRemotePlayback && auth.currentUser) {
      const effectiveQueue = queue.length > 0 ? queue : globalLibrary
      const currentIndex = effectiveQueue.findIndex(s => s.id === currentSong?.id || s.title === currentSong?.title)
      const nextIdx = currentIndex !== -1 && currentIndex < effectiveQueue.length - 1 ? currentIndex + 1 : 0
      const target = effectiveQueue[nextIdx]
      if (target) {
        syncPlaybackState(auth.currentUser.uid, {
          activeDeviceId,
          activeDeviceName,
          senderDeviceId: currentDeviceId,
          currentSong: target,
          isPlaying: true,
          position: 0,
          duration: target.duration || 210,
          updatedAt: Date.now()
        })
      }
      return
    }

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
          const moodQueue = await getSongRadioQueue(currentSong, [], playedHistory, 15);
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

    if (isRemotePlayback && auth.currentUser) {
      const effectiveQueue = queue.length > 0 ? queue : globalLibrary
      const currentIndex = effectiveQueue.findIndex(s => s.id === currentSong?.id || s.title === currentSong?.title)
      const prevIdx = currentIndex > 0 ? currentIndex - 1 : effectiveQueue.length - 1
      const target = effectiveQueue[prevIdx]
      if (target) {
        syncPlaybackState(auth.currentUser.uid, {
          activeDeviceId,
          activeDeviceName,
          senderDeviceId: currentDeviceId,
          currentSong: target,
          isPlaying: true,
          position: 0,
          duration: target.duration || 210,
          updatedAt: Date.now()
        })
      }
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

    if (isRemotePlayback) {
      // Remote Mode: send seek command to active host
      const user = auth.currentUser
      if (user && !isInJam) {
        syncPlaybackState(user.uid, {
          activeDeviceId,
          activeDeviceName,
          senderDeviceId: currentDeviceId,
          position: time,
          updatedAt: Date.now()
        })
      }
      return
    }

    if (isNativeAudioSupported()) {
      nativePlayer.seek(time);
    }

    if (activeEngineRef.current === 'youtube') {
      try {
        ytPlayerRef.current?.seekTo(time, true)
      } catch {}
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = time
      }
    }

    const user = auth.currentUser
    if (user && !isInJam && !isSyncingFromRemoteRef.current) {
      syncPlaybackState(user.uid, {
        activeDeviceId: currentDeviceId,
        activeDeviceName: localDeviceInfo.name,
        senderDeviceId: currentDeviceId,
        position: time,
        updatedAt: Date.now()
      })
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

      // Seamless track transition when audio reaches the end
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 2) {
        if (audio.currentTime >= audio.duration - 0.4 && !isAdvancingRef.current) {
          handleEnded()
        }
      }

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
      if (isAdvancingRef.current) return
      isAdvancingRef.current = true
      setTimeout(() => { isAdvancingRef.current = false }, 1500)

      if (repeatMode === 'one') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
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
        currentDeviceId,
        activeDeviceId,
        activeDeviceName,
        connectedDevices,
        isRemotePlayback,
        transferPlaybackToDevice,
        showDevicePicker,
        setShowDevicePicker,
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
          width: 2,
          height: 2,
          opacity: 1,
          pointerEvents: 'none',
          zIndex: 1,
          overflow: 'hidden'
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