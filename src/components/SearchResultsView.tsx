import React, { useState, useEffect } from 'react'
import { usePlayer, Song } from '../context/PlayerContext'
import { searchYouTubeMusic } from '../utils/ytMusic'
import { fetchArtistProfile, type ArtistProfile } from '../utils/artistService'
import { getSongRadioQueue } from '../utils/aiRecommender'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { downloadSongForOffline } from '../utils/offlineStorage'
import AddToPlaylistModal from './AddToPlaylistModal'
import {
  Play,
  Pause,
  Music,
  ListMusic,
  ListPlus,
  DownloadCloud,
  ChevronLeft,
  Search,
  Sparkles,
  Youtube,
  Radio,
  Heart,
  Shuffle,
  Plus,
  Check,
  CheckCircle2,
  User
} from 'lucide-react'

interface SearchResultsViewProps {
  queryText: string
  user: any
  onBack: () => void
  onSelectArtist?: (artistName: string) => void
  activeTheme?: any
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({ queryText, user, onBack, onSelectArtist, activeTheme }) => {
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, setQueue, playedHistory, isSongLiked, toggleLikeSong, addToQueue, upNextQueue } = usePlayer()
  const [loading, setLoading] = useState(true)
  const [queueToast, setQueueToast] = useState<string | null>(null)
  const [matchedArtist, setMatchedArtist] = useState<ArtistProfile | null>(null)
  const accentColor = activeTheme?.accentColor || '#ffffff'
  const accentGlow = activeTheme?.accentGlow || 'rgba(255,255,255,0.15)'
  const [searchResults, setSearchResults] = useState<{
    songs: any[]
    playlists: any[]
    youtube: Song[]
  }>({
    songs: [],
    playlists: [],
    youtube: []
  })
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<any | null>(null)

  const handleQueueSong = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation()
    if (addToQueue) {
      addToQueue(song)
      setQueueToast(`Added "${song.title}" to Up Next (Priority Queue)`)
      setTimeout(() => setQueueToast(null), 2500)
    }
  }

  useEffect(() => {
    let isMounted = true
    const fetchResults = async () => {
      if (!queryText.trim()) {
        setLoading(false)
        return
      }
      setLoading(true)

      try {
        const userId = user?.uid || user?.id

        // 1. Search user playlists
        let userPlaylists: any[] = []
        if (userId) {
          const pSnap = await getDocs(query(collection(db, 'playlists'), where('userId', '==', userId)))
          userPlaylists = pSnap.docs
            .map(doc => ({ id: doc.id, type: 'playlist', ...doc.data() }))
            .filter((p: any) => p.name.toLowerCase().includes(queryText.toLowerCase()))
        }

        // 2. Search user uploaded songs
        let userSongs: any[] = []
        if (userId) {
          const sSnap = await getDocs(collection(db, 'users', userId, 'uploads'))
          userSongs = sSnap.docs
            .map(doc => ({ id: doc.id, type: 'song', ...doc.data() }))
            .filter((s: any) =>
              s.title.toLowerCase().includes(queryText.toLowerCase()) ||
              s.artist.toLowerCase().includes(queryText.toLowerCase())
            )
        }

        // 3. Search millions of online YouTube Music tracks & Artist Profile concurrently
        const [ytTracks, artistProfile] = await Promise.all([
          searchYouTubeMusic(queryText),
          fetchArtistProfile(queryText.trim()).catch(() => null)
        ])

        let foundArtist: ArtistProfile | null = null
        let finalYtTracks = ytTracks || []

        if (artistProfile && artistProfile.name) {
          const normQ = queryText.toLowerCase().replace(/[^a-z0-9]/g, '')
          const normName = artistProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (normName.includes(normQ) || normQ.includes(normName) || normName.split(' ').some(w => w === normQ)) {
            foundArtist = artistProfile
            if (artistProfile.topSongs && artistProfile.topSongs.length > 0) {
              const seen = new Set<string>()
              const merged: Song[] = []
              for (const s of [...artistProfile.topSongs, ...finalYtTracks]) {
                const key = (s.title + ' ' + s.artist).toLowerCase().replace(/[^a-z0-9]/g, '')
                if (!seen.has(key)) {
                  seen.add(key)
                  merged.push(s)
                }
              }
              finalYtTracks = merged
            }
          }
        }

        if (isMounted) {
          setMatchedArtist(foundArtist)
          setSearchResults({
            songs: userSongs,
            playlists: userPlaylists,
            youtube: finalYtTracks
          })
        }
      } catch (err) {
        console.error('Failed to load search results:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchResults()
    return () => {
      isMounted = false
    }
  }, [queryText, user])

  const topTrack = searchResults.youtube[0] || searchResults.songs[0]
  const otherTracks = searchResults.youtube.length > 0
    ? searchResults.youtube.slice(1)
    : searchResults.songs.slice(1)

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '3:30'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const getAllSearchSongs = (): Song[] => {
    const combined = [...searchResults.songs, ...searchResults.youtube]
    const seen = new Set<string>()
    const unique: Song[] = []
    for (const s of combined) {
      if (!s) continue
      const key = s.id || `${s.title}_${s.artist}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(s)
      }
    }
    return unique
  }

  const handlePlaySong = async (song: Song) => {
    const isActive = currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)
    if (isActive) {
      if (isPlaying) pauseSong()
      else resumeSong()
    } else {
      // 1. Play clicked track immediately
      playSong(song)
      if (setQueue) setQueue([song])

      // 2. Concurrently generate YouTube Music style similar-vibe radio queue
      try {
        const radioVibeQueue = await getSongRadioQueue(song, [], playedHistory, 25)
        if (radioVibeQueue.length > 0 && setQueue) {
          setQueue([song, ...radioVibeQueue])
        }
      } catch (err) {
        console.warn('Radio queue generation failed:', err)
      }
    }
  }

  const handlePlayAll = () => {
    const allSongs = getAllSearchSongs()
    if (allSongs.length === 0) return
    if (setQueue) setQueue(allSongs)
    playSong(allSongs[0])
  }

  const handleShuffleAll = () => {
    const allSongs = getAllSearchSongs()
    if (allSongs.length === 0) return
    const shuffled = [...allSongs].sort(() => 0.5 - Math.random())
    if (setQueue) setQueue(shuffled)
    playSong(shuffled[0])
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-28 space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Go back"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Search Results
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white truncate max-w-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              &ldquo;{queryText}&rdquo;
            </h1>
          </div>
        </div>

        {!loading && (topTrack || searchResults.youtube.length > 0) && (
          <div className="flex items-center gap-3 pl-12 sm:pl-0">
            <button
              onClick={handlePlayAll}
              className="px-5 py-2.5 rounded-full bg-white text-black font-extrabold text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Play size={14} fill="currentColor" className="ml-0.5" /> Play All
            </button>
            <button
              onClick={handleShuffleAll}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Shuffle size={14} /> Shuffle
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }}
          />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Searching music catalog...
          </p>
        </div>
      ) : !topTrack && searchResults.playlists.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <Search size={40} className="mx-auto text-zinc-600 mb-2" />
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            No results found for &ldquo;{queryText}&rdquo;
          </h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Please check the spelling or try searching for a different song or artist.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* TOP RESULT + SONGS GRID (YouTube Music Style Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── TOP RESULT HERO CARD (Left Column) ── */}
            {matchedArtist ? (
              <div className="lg:col-span-5 space-y-3">
                <h2
                  className="text-[14px] font-bold uppercase tracking-widest flex items-center gap-2"
                  style={{ color: accentColor, fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <Sparkles size={14} style={{ color: accentColor }} /> Top Result • Artist
                </h2>

                <div
                  onClick={() => onSelectArtist && onSelectArtist(matchedArtist.name)}
                  className="relative p-6 rounded-2xl bg-white/[0.03] border transition-all cursor-pointer group shadow-2xl overflow-hidden backdrop-blur-md"
                  style={{
                    borderColor: `${accentColor}25`,
                    backgroundImage: `radial-gradient(circle at 10% 20%, ${accentColor}12, transparent 65%)`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${accentColor}60`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${accentColor}25`
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Artist Circular Avatar with Theme Glow */}
                    <div
                      className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden shadow-2xl shrink-0 group-hover:scale-105 transition-all duration-300 relative border-2"
                      style={{
                        borderColor: accentColor,
                        boxShadow: `0 0 24px ${accentGlow}`
                      }}
                    >
                      {matchedArtist.pictureUrl ? (
                        <img
                          src={matchedArtist.pictureUrl}
                          alt={matchedArtist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                          <User size={40} className="text-zinc-600" />
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 border"
                        style={{
                          background: `${accentColor}15`,
                          borderColor: `${accentColor}30`,
                          color: accentColor
                        }}
                      >
                        Artist
                      </span>
                      <h3
                        className="text-xl md:text-2xl font-extrabold text-white truncate flex items-center justify-center sm:justify-start gap-2 transition-colors"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {matchedArtist.name}
                        <CheckCircle2 size={18} style={{ color: accentColor }} className="shrink-0" />
                      </h3>
                      {matchedArtist.monthlyListeners ? (
                        <p className="text-xs text-zinc-400 font-medium truncate mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {matchedArtist.monthlyListeners}
                        </p>
                      ) : matchedArtist.genres && matchedArtist.genres.length > 0 ? (
                        <p className="text-xs text-zinc-400 font-medium truncate mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {matchedArtist.genres.slice(0, 2).join(' • ')}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-5">
                        {matchedArtist.topSongs && matchedArtist.topSongs.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePlaySong(matchedArtist.topSongs[0])
                              if (setQueue) setQueue(matchedArtist.topSongs)
                            }}
                            className="px-5 py-2.5 rounded-full bg-white text-black font-extrabold text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                          >
                            <Play size={15} fill="currentColor" className="ml-0.5" /> Play Top Hits
                          </button>
                        )}

                        {onSelectArtist && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectArtist(matchedArtist.name)
                            }}
                            className="px-4 py-2.5 rounded-full border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:brightness-125"
                            style={{
                              background: `${accentColor}18`,
                              borderColor: `${accentColor}35`,
                              color: accentColor,
                              fontFamily: 'Space Grotesk, sans-serif'
                            }}
                          >
                            View Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : topTrack ? (
              <div className="lg:col-span-5 space-y-3">
                <h2 className="text-[14px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Sparkles size={14} style={{ color: accentColor }} /> Top Result
                </h2>

                <div
                  onClick={() => handlePlaySong(topTrack)}
                  className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group shadow-xl overflow-hidden backdrop-blur-md"
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Artwork */}
                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/10 relative">
                      {topTrack.coverArtBase64 ? (
                        <img
                          src={topTrack.coverArtBase64}
                          alt={topTrack.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                          <Music size={32} className="text-zinc-600" />
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/90 border border-white/10 mb-2">
                        Song
                      </span>
                      <h3
                        className="text-xl md:text-2xl font-extrabold text-white truncate group-hover:text-indigo-300 transition-colors"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {topTrack.title}
                      </h3>
                      <p
                        onClick={(e) => {
                          if (onSelectArtist) {
                            e.stopPropagation()
                            onSelectArtist(topTrack.artist)
                          }
                        }}
                        className={`text-sm text-zinc-400 font-medium truncate mt-1 ${
                          onSelectArtist ? 'hover:text-white hover:underline cursor-pointer' : ''
                        }`}
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {topTrack.artist}
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlaySong(topTrack)
                          }}
                          className="px-5 py-2.5 rounded-full bg-white text-black font-extrabold text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {currentSong?.id === topTrack.id && isPlaying ? (
                            <>
                              <Pause size={15} fill="currentColor" /> Pause
                            </>
                          ) : (
                            <>
                              <Play size={15} fill="currentColor" className="ml-0.5" /> Play
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLikeSong(topTrack)
                          }}
                          title={isSongLiked(topTrack) ? 'Liked' : 'Like'}
                          className={`p-2.5 rounded-full transition-colors ${
                            isSongLiked(topTrack)
                              ? 'bg-white/20 text-white fill-white shadow-lg'
                              : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                          }`}
                        >
                          <Heart size={16} fill={isSongLiked(topTrack) ? 'currentColor' : 'none'} />
                        </button>

                        <button
                          onClick={(e) => handleQueueSong(e, topTrack)}
                          title="Add to Priority Queue (Play Next)"
                          className={`p-2.5 rounded-full transition-colors ${
                            upNextQueue?.some(s => s.id === topTrack.id || s.title === topTrack.title)
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                          }`}
                        >
                          <Plus size={16} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedSongForPlaylist(topTrack)
                          }}
                          title="Add to Playlist"
                          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                        >
                          <ListPlus size={16} />
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await downloadSongForOffline(topTrack)
                              alert(`Downloaded "${topTrack.title}" for offline playback!`)
                            } catch {
                              alert('Failed to download track.')
                            }
                          }}
                          title="Download for Offline"
                          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                        >
                          <DownloadCloud size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── SONGS LIST (Right Column) ── */}
            {otherTracks.length > 0 && (
              <div className="lg:col-span-7 space-y-3">
                <h2 className="text-[14px] font-bold uppercase tracking-widest text-zinc-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Songs
                </h2>

                <div className="rounded-2xl bg-white/[0.02] border border-white/5 divide-y divide-white/5 overflow-hidden">
                  {otherTracks.slice(0, 6).map((song, idx) => {
                    const isActive = currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)
                    return (
                      <div
                        key={song.id || idx}
                        onClick={() => handlePlaySong(song)}
                        className={`flex items-center justify-between gap-4 p-3 hover:bg-white/[0.06] transition-colors cursor-pointer group ${
                          isActive ? 'bg-white/[0.08]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/50 shrink-0 border border-white/10 relative">
                            {song.coverArtBase64 ? (
                              <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music size={18} className="text-zinc-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              {isActive && isPlaying ? (
                                <Pause size={16} className="text-white fill-white" />
                              ) : (
                                <Play size={16} className="text-white fill-white ml-0.5" />
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h4
                              className="text-sm font-bold truncate transition-colors text-white/90 group-hover:text-white"
                              style={{
                                color: isActive ? accentColor : undefined,
                                fontFamily: 'Space Grotesk, sans-serif'
                              }}
                            >
                              {song.title}
                            </h4>
                            <p
                              onClick={(e) => {
                                if (onSelectArtist) {
                                  e.stopPropagation()
                                  onSelectArtist(song.artist)
                                }
                              }}
                              className={`text-xs text-zinc-400 font-medium truncate ${
                                onSelectArtist ? 'hover:text-white hover:underline cursor-pointer' : ''
                              }`}
                              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                            >
                              {song.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-zinc-500 font-medium hidden sm:inline-block">
                            {formatDuration(song.duration)}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleLikeSong(song)
                              }}
                              title={isSongLiked(song) ? 'Liked' : 'Like'}
                              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                                isSongLiked(song) ? 'text-white fill-white drop-shadow-sm' : 'text-white/70 hover:text-white'
                              }`}
                            >
                              <Heart size={16} fill={isSongLiked(song) ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={(e) => handleQueueSong(e, song)}
                              title="Add to Priority Queue (Play Next)"
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                              style={{
                                color: upNextQueue?.some(s => s.id === song.id || s.title === song.title) ? accentColor : undefined
                              }}
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSongForPlaylist(song)
                              }}
                              title="Add to Playlist"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            >
                              <ListPlus size={16} />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await downloadSongForOffline(song)
                                  alert(`Downloaded "${song.title}" for offline playback!`)
                                } catch {
                                  alert('Failed to download track.')
                                }
                              }}
                              title="Download for offline"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            >
                              <DownloadCloud size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── MATCHING PLAYLISTS ── */}
          {searchResults.playlists.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-[14px] font-bold uppercase tracking-widest text-zinc-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Playlists
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.playlists.map(playlist => (
                  <div
                    key={playlist.id}
                    onClick={() => {
                      window.location.href = `/dashboard?playlist=${playlist.id}`
                    }}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all cursor-pointer group hover:bg-white/[0.05]"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 mb-3 flex items-center justify-center">
                      {playlist.coverArtBase64 ? (
                        <img src={playlist.coverArtBase64} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic size={28} className="text-zinc-500" />
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {playlist.name}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Playlist</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ALL MATCHING TRACKS GRID ── */}
          {searchResults.youtube.length > 7 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-[14px] font-bold uppercase tracking-widest text-zinc-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                All Matching Hits
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.youtube.slice(6).map(song => {
                  const isActive = currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)
                  return (
                    <div
                      key={song.id}
                      onClick={() => handlePlaySong(song)}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all cursor-pointer group hover:bg-white/[0.06]"
                    >
                      <div className="aspect-square relative rounded-xl overflow-hidden mb-2.5 border border-white/10 shadow-md">
                        {song.coverArtBase64 ? (
                          <img
                            src={song.coverArtBase64}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <Music size={20} className="text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                            {isActive && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                          </div>
                          <button
                            onClick={(e) => handleQueueSong(e, song)}
                            title="Add to Priority Queue (Play Next)"
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-md"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold truncate text-sm text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {song.title}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {song.artist}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Queue Toast Feedback */}
      {queueToast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 text-white px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200 border"
          style={{ borderColor: `${accentColor}40`, boxShadow: `0 10px 30px -10px ${accentGlow}` }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
            style={{ background: accentColor, color: '#000000' }}
          >
            <Check size={12} strokeWidth={3} />
          </div>
          <span className="text-xs font-bold truncate max-w-xs sm:max-w-md" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {queueToast}
          </span>
        </div>
      )}

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
