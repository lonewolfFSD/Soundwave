import React, { createContext, useContext, useState, useRef } from 'react'

export interface Song {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  playlistId: string
}

interface PlayerContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  queue: Song[]
  volume: number
  playSong: (song: Song) => void
  pauseSong: () => void
  resumeSong: () => void
  nextSong: () => void
  previousSong: () => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  setQueue: (songs: Song[]) => void
  audioRef: React.RefObject<HTMLAudioElement>
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState<Song[]>([])
  const [volume, setVolume] = useState(1)

  const playSong = (song: Song) => {
    if (audioRef.current) {
      audioRef.current.src = song.url
      setCurrentSong(song)
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseSong = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resumeSong = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const nextSong = () => {
    if (currentSong && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id)
      if (currentIndex < queue.length - 1) {
        playSong(queue[currentIndex + 1])
      }
    }
  }

  const previousSong = () => {
    if (currentSong && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id)
      if (currentIndex > 0) {
        playSong(queue[currentIndex - 1])
      }
    }
  }

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => nextSong()

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentSong, queue])

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        queue,
        volume,
        playSong,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        setCurrentTime,
        setVolume,
        setQueue,
        audioRef,
      }}
    >
      {children}
      <audio ref={audioRef} crossOrigin="anonymous" />
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}
