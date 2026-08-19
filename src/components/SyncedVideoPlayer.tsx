import React, { useEffect, useRef, useState } from 'react'
import { Play, Loader2, Music } from 'lucide-react'

interface SyncedVideoPlayerProps {
  videoId: string
  isPlaying: boolean
  currentTime: number
  coverArt?: string
  title?: string
  className?: string
  onTogglePlay?: () => void
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export const SyncedVideoPlayer: React.FC<SyncedVideoPlayerProps> = ({
  videoId,
  isPlaying,
  currentTime,
  coverArt,
  title,
  className = '',
  onTogglePlay
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [isApiReady, setIsApiReady] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isVideoBuffering, setIsVideoBuffering] = useState(true)
  const lastSyncTimeRef = useRef<number>(0)
  const playerIdRef = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`)

  // 1. Ensure YouTube IFrame API script is present
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true)
      return
    }

    const existingTag = document.getElementById('youtube-iframe-api')
    if (!existingTag) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScript = document.getElementsByTagName('script')[0]
      firstScript?.parentNode?.insertBefore(tag, firstScript)
    }

    const prevCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback()
      setIsApiReady(true)
    }

    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        setIsApiReady(true)
        clearInterval(checkInterval)
      }
    }, 200)

    return () => clearInterval(checkInterval)
  }, [])

  // 2. Initialize or Update YouTube Player
  useEffect(() => {
    if (!isApiReady || !videoId || !containerRef.current) return

    let playerInstance: any = null

    // If player already exists, simply load new video
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: Math.floor(currentTime || 0)
        })
        playerRef.current.mute()
        if (isPlaying) {
          playerRef.current.playVideo()
        } else {
          playerRef.current.pauseVideo()
        }
        return
      } catch (e) {
        console.warn('Error reloading video in existing player:', e)
      }
    }

    // Create new player element inside container
    const playerId = playerIdRef.current
    let mountEl = document.getElementById(playerId)
    if (!mountEl) {
      mountEl = document.createElement('div')
      mountEl.id = playerId
      mountEl.className = 'w-full h-full'
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(mountEl)
    }

    try {
      playerInstance = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target
            setIsPlayerReady(true)
            setIsVideoBuffering(false)
            try {
              event.target.mute()
              if (currentTime > 0) {
                event.target.seekTo(currentTime, true)
              }
              if (isPlaying) {
                event.target.playVideo()
              } else {
                event.target.pauseVideo()
              }
            } catch {}
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.BUFFERING = 3
            if (event.data === 3) {
              setIsVideoBuffering(true)
            } else if (event.data === 1 || event.data === 2) {
              setIsVideoBuffering(false)
            }
          }
        }
      })
    } catch (err) {
      console.error('Error creating YouTube player instance:', err)
    }

    return () => {
      if (playerInstance && typeof playerInstance.destroy === 'function') {
        try {
          playerInstance.destroy()
        } catch {}
        playerRef.current = null
        setIsPlayerReady(false)
      }
    }
  }, [isApiReady, videoId])

  // 3. Play / Pause Synchronization
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return
    try {
      if (isPlaying) {
        playerRef.current.playVideo()
      } else {
        playerRef.current.pauseVideo()
      }
    } catch {}
  }, [isPlaying, isPlayerReady])

  // 4. Seek & Drift Auto-Resynchronization
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return

    const now = Date.now()
    // Avoid spamming seeks
    if (now - lastSyncTimeRef.current < 250) return

    try {
      const ytTime = typeof playerRef.current.getCurrentTime === 'function' ? playerRef.current.getCurrentTime() : 0
      const diff = Math.abs(ytTime - currentTime)

      // If user jumped / scrubbed or drift exceeds 0.8s
      if (diff > 0.8) {
        lastSyncTimeRef.current = now
        playerRef.current.seekTo(currentTime, true)
        if (isPlaying) {
          playerRef.current.playVideo()
        }
      }
    } catch {}
  }, [currentTime, isPlayerReady, isPlaying])

  return (
    <div
      onClick={onTogglePlay}
      className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center cursor-pointer group ${className}`}
    >
      {/* YouTube Player Mount Container */}
      <div
        ref={containerRef}
        className="w-full h-full pointer-events-none transform scale-105"
      />

      {/* Buffering or Poster Placeholder when paused / loading */}
      {(!isPlayerReady || isVideoBuffering || !isPlaying) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all duration-300">
          {coverArt && (
            <img
              src={coverArt}
              alt={title || ''}
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-105 pointer-events-none"
            />
          )}

          {!isPlaying ? (
            <div className="relative z-30 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform">
              <Play size={28} fill="currentColor" className="ml-1" />
            </div>
          ) : isVideoBuffering && !isPlayerReady ? (
            <div className="relative z-30 flex flex-col items-center gap-3 text-white/80">
              <Loader2 size={32} className="animate-spin text-white" />
              <span className="text-xs font-mono tracking-wider uppercase opacity-70">
                Syncing Video...
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
