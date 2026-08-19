import React, { useState } from 'react'
import { ArrowLeft, Play, Pause, Shuffle, Music, ListPlus, DownloadCloud, CheckCircle2, Clock, Heart } from 'lucide-react'
import { usePlayer, type Song } from '../context/PlayerContext'
import { downloadSongForOffline } from '../utils/offlineStorage'
import AddToPlaylistModal from './AddToPlaylistModal'
import type { FeaturedMix } from '../utils/aiRecommender'

interface DynamicPlaylistViewProps {
  playlist: FeaturedMix | {
    id: string
    title: string
    subtitle?: string
    badge?: string
    sampleCovers?: string[]
    songs: Song[]
    coverArtBase64?: string
  }
  onBack: () => void
  onSelectArtist?: (artistName: string) => void
}

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const DynamicPlaylistView: React.FC<DynamicPlaylistViewProps> = ({ playlist, onBack, onSelectArtist }) => {
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, setQueue, isSongLiked, toggleLikeSong } = usePlayer()
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null)
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())

  const totalDuration = playlist.songs.reduce((sum, s) => sum + (s.duration || 180), 0)
  const totalMinutes = Math.floor(totalDuration / 60)

  const isPlaylistActive = currentSong && playlist.songs.some(s => s.id === currentSong.id || s.title === currentSong.title)

  const handlePlayAll = () => {
    if (playlist.songs.length === 0) return
    if (isPlaylistActive) {
      if (isPlaying) pauseSong()
      else resumeSong()
    } else {
      setQueue(playlist.songs)
      playSong(playlist.songs[0])
    }
  }

  const handleShuffle = () => {
    if (playlist.songs.length === 0) return
    const shuffled = [...playlist.songs].sort(() => 0.5 - Math.random())
    setQueue(shuffled)
    playSong(shuffled[0])
  }

  const handleDownload = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation()
    try {
      await downloadSongForOffline(song)
      setDownloadedIds(prev => new Set([...prev, song.id]))
    } catch {
      alert('Could not download track.')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto sw-scroll px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
      {/* ── BACK BUTTON ── */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors w-fit group"
      >
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </div>
        <span className="text-sm font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Back</span>
      </button>

      {/* ── PLAYLIST HERO HEADER ── */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-8 border-b border-white/10">
        {/* Cover Art Tile */}
        <div className="w-48 h-48 md:w-56 md:h-56 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/[0.03] relative">
          {playlist.sampleCovers && playlist.sampleCovers.length >= 4 ? (
            <div className="grid grid-cols-2 w-full h-full">
              {playlist.sampleCovers.slice(0, 4).map((c, i) => (
                <img key={i} src={c} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          ) : playlist.coverArtBase64 || (playlist.sampleCovers && playlist.sampleCovers[0]) ? (
            <img
              src={playlist.coverArtBase64 || playlist.sampleCovers![0]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-16 h-16 text-white/20" />
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white/10 border border-white/15 text-white/80 mb-2">
            {playlist.badge || 'FEATURED PLAYLIST'}
          </span>
          <h1
            className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {playlist.title}
          </h1>
          {playlist.subtitle && (
            <p className="text-sm text-white/60 mb-3 max-w-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {playlist.subtitle}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-white/40 mb-5 font-mono">
            <span>{playlist.songs.length} songs</span>
            <span>•</span>
            <span>{totalMinutes} min</span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-transform"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {isPlaylistActive && isPlaying ? (
                <>
                  <Pause size={18} fill="currentColor" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                  <span>Play All</span>
                </>
              )}
            </button>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/10 active:scale-95 transition-all"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Shuffle size={16} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TRACKS TABLE LIST ── */}
      <div className="py-6 flex flex-col gap-1">
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40 border-b border-white/5">
          <span className="w-8 text-center">#</span>
          <span>Title</span>
          <span className="hidden sm:inline-flex items-center gap-1"><Clock size={12} /></span>
          <span className="w-16"></span>
        </div>

        {playlist.songs.map((song, idx) => {
          const isCurrent = currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)
          const isDownloaded = downloadedIds.has(song.id) || song.isOffline

          return (
            <div
              key={song.id || idx}
              onClick={() => {
                if (isCurrent) {
                  if (isPlaying) pauseSong()
                  else resumeSong()
                } else {
                  setQueue(playlist.songs)
                  playSong(song)
                }
              }}
              className={`
                grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-2.5 rounded-xl cursor-pointer
                transition-all duration-150 group
                ${isCurrent ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/80'}
              `}
            >
              {/* Index / Play Icon */}
              <div className="w-8 text-center flex items-center justify-center text-xs font-mono text-white/40">
                {isCurrent && isPlaying ? (
                  <div className="flex gap-0.5 items-end h-3">
                    <div className="w-0.5 bg-white animate-pulse h-full" />
                    <div className="w-0.5 bg-white animate-pulse h-2" />
                    <div className="w-0.5 bg-white animate-pulse h-3" />
                  </div>
                ) : (
                  <span className="group-hover:hidden">{idx + 1}</span>
                )}
                <Play size={12} fill="currentColor" className={`hidden group-hover:inline-block ${isCurrent ? 'text-white' : 'text-white/60'}`} />
              </div>

              {/* Title & Cover & Artist */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
                  {song.coverArtBase64 ? (
                    <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={16} className="text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-semibold text-sm truncate ${isCurrent ? 'text-white' : 'text-white/90'}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {song.title}
                  </span>
                  <span
                    onClick={(e) => {
                      if (onSelectArtist && song.artist) {
                        e.stopPropagation()
                        onSelectArtist(song.artist)
                      }
                    }}
                    className={`text-xs text-white/40 truncate ${
                      onSelectArtist ? 'hover:text-white hover:underline cursor-pointer' : ''
                    }`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {song.artist || 'Unknown Artist'}
                  </span>
                </div>
              </div>

              {/* Duration */}
              <span className="text-xs font-mono text-white/40 hidden sm:inline">
                {formatDuration(song.duration || 180)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLikeSong(song)
                  }}
                  title={isSongLiked(song) ? 'Liked' : 'Like'}
                  className={`p-2 rounded-lg transition-colors ${
                    isSongLiked(song)
                      ? 'text-white fill-white drop-shadow-sm'
                      : 'text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart size={16} fill={isSongLiked(song) ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSongForPlaylist(song)
                  }}
                  title="Add to Playlist"
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ListPlus size={16} />
                </button>

                <button
                  onClick={(e) => handleDownload(e, song)}
                  title={isDownloaded ? 'Downloaded' : 'Download for Offline'}
                  className={`p-2 rounded-lg transition-colors ${
                    isDownloaded ? 'text-emerald-400' : 'text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isDownloaded ? <CheckCircle2 size={16} /> : <DownloadCloud size={16} />}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {selectedSongForPlaylist && (
        <AddToPlaylistModal
          song={selectedSongForPlaylist}
          onClose={() => setSelectedSongForPlaylist(null)}
        />
      )}
    </div>
  )
}
