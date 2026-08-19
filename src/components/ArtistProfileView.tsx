import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Play,
  Pause,
  Shuffle,
  CheckCircle2,
  Heart,
  ListPlus,
  DownloadCloud,
  Clock,
  Music,
  Loader2,
  Disc3,
  Radio,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ListMusic
} from 'lucide-react'
import { usePlayer, type Song } from '../context/PlayerContext'
import {
  fetchArtistProfile,
  type ArtistProfile,
  type ArtistRelease,
  type ArtistPlaylist,
  type SimilarArtist
} from '../utils/artistService'
import { downloadSongForOffline } from '../utils/offlineStorage'
import AddToPlaylistModal from './AddToPlaylistModal'

interface ArtistProfileViewProps {
  artistName: string
  onBack: () => void
  onSelectArtist?: (artistName: string) => void
}

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const ArtistProfileView: React.FC<ArtistProfileViewProps> = ({
  artistName,
  onBack,
  onSelectArtist
}) => {
  const {
    currentSong,
    isPlaying,
    playSong,
    pauseSong,
    resumeSong,
    setQueue,
    isSongLiked,
    toggleLikeSong
  } = usePlayer()

  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllTracks, setShowAllTracks] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null)
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())

  // Carousel refs for smooth horizontal scrolling
  const albumsScrollRef = useRef<HTMLDivElement>(null)
  const singlesScrollRef = useRef<HTMLDivElement>(null)
  const playlistsScrollRef = useRef<HTMLDivElement>(null)
  const similarScrollRef = useRef<HTMLDivElement>(null)

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === 'left' ? -400 : 400,
        behavior: 'smooth'
      })
    }
  }

  // Load artist profile data
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    fetchArtistProfile(artistName)
      .then((data) => {
        if (isMounted) {
          // Strictly verify all topSongs have this artist name
          const strictlyFilteredSongs = data.topSongs.map((s) => ({
            ...s,
            artist: s.artist || data.name
          }))
          setProfile({
            ...data,
            topSongs: strictlyFilteredSongs
          })
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load artist profile')
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [artistName])

  // Play ONLY this artist's songs
  const handlePlayTopSongs = () => {
    if (!profile || profile.topSongs.length === 0) return
    const isCurrentlyPlayingArtist =
      currentSong &&
      profile.topSongs.some(
        (s) => s.id === currentSong.id || s.title === currentSong.title
      )

    if (isCurrentlyPlayingArtist) {
      if (isPlaying) pauseSong()
      else resumeSong()
    } else {
      setQueue(profile.topSongs)
      playSong(profile.topSongs[0])
    }
  }

  // Shuffle ONLY this artist's songs
  const handleShuffleTopSongs = () => {
    if (!profile || profile.topSongs.length === 0) return
    const shuffled = [...profile.topSongs].sort(() => 0.5 - Math.random())
    setQueue(shuffled)
    playSong(shuffled[0])
  }

  const handleDownloadTrack = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation()
    try {
      await downloadSongForOffline(song)
      setDownloadedIds((prev) => new Set([...prev, song.id]))
    } catch {
      alert('Could not download track.')
    }
  }

  const handlePlayRelease = (release: ArtistRelease) => {
    if (!profile || profile.topSongs.length === 0) return
    // Play artist songs
    setQueue(profile.topSongs)
    playSong(profile.topSongs[0])
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin text-white/70" />
        <p className="text-sm font-medium text-white/50" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Loading {artistName}&apos;s profile...
        </p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
        <Disc3 size={48} className="text-white/30" />
        <h3 className="text-xl font-bold text-white">Artist Not Found</h3>
        <p className="text-sm text-white/50 max-w-md">
          {error || `Unable to fetch profile for "${artistName}". Please check your connection.`}
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all mt-2"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  const isCurrentArtistPlaying =
    currentSong &&
    profile.topSongs.some(
      (s) => s.id === currentSong.id || s.title === currentSong.title
    )

  const displayedTopSongs = showAllTracks
    ? profile.topSongs
    : profile.topSongs.slice(0, 6)

  return (
    <div className="flex flex-col h-full overflow-y-auto sw-scroll px-4 md:px-8 py-4 max-w-7xl mx-auto w-full pb-36">
      {/* ── BACK BUTTON ── */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors w-fit group"
      >
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </div>
        <span className="text-sm font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Back
        </span>
      </button>

      {/* ── CINEMATIC HALF-FADED HERO BANNER ── */}
      <div className="relative rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-2xl bg-zinc-950 min-h-[380px] md:min-h-[440px] flex flex-col justify-end">
        {/* Right-Side Half-Faded Artist Photo */}
        {profile.pictureUrl && (
          <div className="absolute top-0 right-0 bottom-0 w-full md:w-[65%] z-0 overflow-hidden pointer-events-none">
            <img
              src={profile.pictureUrl}
              alt={profile.name}
              className="w-full h-full object-cover object-center md:object-top opacity-85 transform scale-105"
            />
            {/* Silky smooth half-fade gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-transparent to-zinc-950" />
          </div>
        )}

        {/* Hero Content (Overlaid on the Left) */}
        <div className="relative z-10 p-6 md:p-12 max-w-3xl">
          {/* Verified Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm backdrop-blur-md">
              <CheckCircle2 size={13} className="text-cyan-400 fill-cyan-400/20" />
              Verified Artist
            </span>
            {profile.genres.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white/70 bg-black/40 border border-white/10 backdrop-blur-md">
                {profile.genres[0]}
              </span>
            )}
          </div>

          {/* Big Artist Name */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-none mb-3 drop-shadow-md"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {profile.name}
          </h1>

          {/* Monthly Listeners */}
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-white/80">
            <Radio size={16} className="text-emerald-400" />
            <span>{profile.monthlyListeners}</span>
          </div>

          {/* Description / Bio snippet */}
          {profile.description && (
            <div className="mb-6 max-w-xl">
              <p
                className={`text-sm text-white/70 font-light leading-relaxed ${
                  bioExpanded ? '' : 'line-clamp-2'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {profile.description}
              </p>
              {profile.description.length > 120 && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
                >
                  {bioExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Action Buttons: Play & Shuffle (Exclusively this artist's tracks) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handlePlayTopSongs}
              className="px-8 py-3.5 rounded-full bg-white text-black font-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2.5 text-sm cursor-pointer"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {isCurrentArtistPlaying && isPlaying ? (
                <>
                  <Pause size={18} fill="currentColor" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                  <span>Play {profile.name}</span>
                </>
              )}
            </button>

            <button
              onClick={handleShuffleTopSongs}
              className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/15 hover:scale-105 active:scale-95 flex items-center gap-2 backdrop-blur-md"
              title={`Shuffle all ${profile.name} songs`}
            >
              <Shuffle size={16} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: TOP SONGS (Exclusive to this artist) ── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-2xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Popular Tracks
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Top songs by {profile.name}
            </p>
          </div>
          {profile.topSongs.length > 6 && (
            <button
              onClick={() => setShowAllTracks(!showAllTracks)}
              className="text-xs font-bold text-white/70 hover:text-white transition-colors flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
            >
              {showAllTracks ? (
                <>
                  <span>Show Less</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>See all ({profile.topSongs.length})</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>

        {profile.topSongs.length === 0 ? (
          <p className="text-sm text-white/40 italic">No tracks available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {displayedTopSongs.map((song, index) => {
              const isActive =
                currentSong?.id === song.id ||
                (currentSong?.title === song.title &&
                  currentSong?.artist === song.artist)
              const liked = isSongLiked(song)

              return (
                <div
                  key={song.id || index}
                  onClick={() => {
                    setQueue(profile.topSongs)
                    playSong(song)
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 border border-white/20 shadow-lg'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-5 text-center text-xs font-bold text-white/40 group-hover:hidden">
                      {index + 1}
                    </span>
                    <div className="w-5 hidden group-hover:flex items-center justify-center text-white">
                      {isActive && isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </div>

                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 relative">
                      {song.coverArtBase64 ? (
                        <img
                          src={song.coverArtBase64}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={16} className="text-white/30" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-white font-bold' : 'text-white/90'
                        }`}
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {song.title}
                      </p>
                      <p className="text-xs text-white/50 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLikeSong(song)
                      }}
                      title={liked ? 'Liked' : 'Like'}
                      className={`p-2 rounded-lg transition-colors ${
                        liked
                          ? 'text-white fill-white drop-shadow-sm'
                          : 'text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSongForPlaylist(song)
                      }}
                      title="Add to playlist"
                      className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ListPlus size={15} />
                    </button>

                    <button
                      onClick={(e) => handleDownloadTrack(e, song)}
                      title="Download for offline"
                      className={`p-2 rounded-lg transition-colors ${
                        downloadedIds.has(song.id)
                          ? 'text-emerald-400'
                          : 'text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <DownloadCloud size={15} />
                    </button>

                    <span className="text-xs text-white/40 font-mono w-10 text-right">
                      {formatDuration(song.duration)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SECTION 2: ALBUMS (Horizontal Scroll) ── */}
      {profile.albums.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Albums
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Albums by {profile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollContainer(albumsScrollRef, 'left')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollContainer(albumsScrollRef, 'right')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={albumsScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 sw-scroll snap-x scroll-smooth"
          >
            {profile.albums.map((album, idx) => (
              <div
                key={album.id || idx}
                onClick={() => handlePlayRelease(album)}
                className="flex-shrink-0 w-[180px] md:w-[200px] snap-start p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-800 shadow-md relative">
                  {album.coverArtBase64 ? (
                    <img
                      src={album.coverArtBase64}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={32} className="text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>

                <h4
                  className="font-bold text-sm text-white truncate"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {album.title}
                </h4>
                <p className="text-xs text-white/50 mt-0.5">
                  {album.year || 'Album'} • {album.genre || 'Release'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 3: SINGLES & EPS (Horizontal Scroll) ── */}
      {profile.singlesAndEPs.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Singles & EPs
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Singles by {profile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollContainer(singlesScrollRef, 'left')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollContainer(singlesScrollRef, 'right')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={singlesScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 sw-scroll snap-x scroll-smooth"
          >
            {profile.singlesAndEPs.map((single, idx) => (
              <div
                key={single.id || idx}
                onClick={() => handlePlayRelease(single)}
                className="flex-shrink-0 w-[180px] md:w-[200px] snap-start p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-800 shadow-md relative">
                  {single.coverArtBase64 ? (
                    <img
                      src={single.coverArtBase64}
                      alt={single.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={32} className="text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>

                <h4
                  className="font-bold text-sm text-white truncate"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {single.title}
                </h4>
                <p className="text-xs text-white/50 mt-0.5">
                  {single.year || 'Single'} • Single
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 4: FEATURED PLAYLISTS FROM YOUTUBE (Horizontal Scroll) ── */}
      {profile.playlists && profile.playlists.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-bold text-white tracking-tight flex items-center gap-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <ListMusic size={22} className="text-cyan-400" />
                <span>Featured Playlists</span>
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Official & curated playlists for {profile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollContainer(playlistsScrollRef, 'left')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollContainer(playlistsScrollRef, 'right')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={playlistsScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 sw-scroll snap-x scroll-smooth"
          >
            {profile.playlists.map((pl, idx) => (
              <div
                key={pl.id || idx}
                onClick={handlePlayTopSongs}
                className="flex-shrink-0 w-[200px] md:w-[220px] snap-start p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-800 shadow-md relative">
                  {pl.coverArtBase64 ? (
                    <img
                      src={pl.coverArtBase64}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={32} className="text-white/30" />
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white/90 border border-white/15">
                      Playlist
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>

                <h4
                  className="font-bold text-sm text-white truncate"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {pl.title}
                </h4>
                <p className="text-xs text-white/50 mt-0.5">
                  {pl.author || 'YouTube Music'} • {pl.trackCount || 'Playlist'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 5: FANS ALSO LIKE / SIMILAR ARTISTS (Horizontal Scroll) ── */}
      {profile.similarArtists && profile.similarArtists.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Fans Also Like
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Similar artists to {profile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollContainer(similarScrollRef, 'left')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollContainer(similarScrollRef, 'right')}
                className="w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={similarScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 sw-scroll snap-x scroll-smooth"
          >
            {profile.similarArtists.map((sim, idx) => (
              <div
                key={idx}
                onClick={() => onSelectArtist && onSelectArtist(sim.name)}
                className="flex-shrink-0 w-[150px] md:w-[170px] snap-start p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer group text-center"
              >
                <div className="w-28 h-28 mx-auto rounded-full overflow-hidden mb-3 bg-zinc-800 shadow-md border-2 border-white/10 group-hover:border-white/30 transition-all">
                  {sim.pictureUrl ? (
                    <img
                      src={sim.pictureUrl}
                      alt={sim.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/40">
                      <Music size={28} />
                    </div>
                  )}
                </div>

                <h4
                  className="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition-colors"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {sim.name}
                </h4>
                <p className="text-xs text-white/50 mt-0.5">
                  {sim.genre || 'Artist'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add To Playlist Modal */}
      {selectedSongForPlaylist && (
        <AddToPlaylistModal
          isOpen={!!selectedSongForPlaylist}
          song={selectedSongForPlaylist}
          onClose={() => setSelectedSongForPlaylist(null)}
        />
      )}
    </div>
  )
}
