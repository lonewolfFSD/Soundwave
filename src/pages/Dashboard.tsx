import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { db } from '../utils/firebase'
import { doc, getDoc, getDocs } from 'firebase/firestore'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Player from '../components/Player'
import PlaylistManager from '../components/PlaylistManager'
import { Plus, Music, Play, Pause, Dices, ChevronLeft, ChevronRight } from 'lucide-react'
import PlaylistWindow from '@/components/PlaylistDetail'

interface PlaylistPreview {
  id: string
  name: string
  coverArtBase64?: string | null
}

const Dashboard = () => {
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong } = usePlayer()
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const [showPlaylistManager, setShowPlaylistManager] = useState(false)
  const [loadingPlaylist, setLoadingPlaylist] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [playlistsPreview, setPlaylistsPreview] = useState<PlaylistPreview[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [quickPicks, setQuickPicks] = useState<any[]>([])
  const [fullLibrary, setFullLibrary] = useState<any[]>([]) 

  const displayName = user?.displayName || 'User'
  const dicebearUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(displayName)}`
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const currentAvatar = avatarUrl || dicebearUrl

  const [bgImage, setBgImage] = useState<string | null>(null)

  // --- SCROLL REFS & STATE ---
  const quickPicksRef = useRef<HTMLDivElement>(null)
  const playlistsRef = useRef<HTMLDivElement>(null)
  const [showQPArrows, setShowQPArrows] = useState({ left: false, right: false })
  const [showPLArrows, setShowPLArrows] = useState({ left: false, right: false })

  useEffect(() => {
    if (currentSong?.coverArtBase64) {
      setBgImage(currentSong.coverArtBase64)
    }
  }, [currentSong])

  // --- SCROLL LOGIC ---
  const checkScroll = (element: HTMLDivElement | null, setArrows: React.Dispatch<React.SetStateAction<{left: boolean, right: boolean}>>) => {
    if (!element) return
    const { scrollLeft, scrollWidth, clientWidth } = element
    setArrows({
      left: scrollLeft > 0,
      right: scrollLeft < (scrollWidth - clientWidth - 1)
    })
  }

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -600 : 600
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const handleResize = () => {
      checkScroll(quickPicksRef.current, setShowQPArrows)
      checkScroll(playlistsRef.current, setShowPLArrows)
    }
    const timer = setTimeout(handleResize, 100)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [quickPicks, playlistsPreview])


  // 1. Load Playlist Details
  useEffect(() => {
    const loadPlaylistName = async () => {
      if (!selectedPlaylist) {
        setPlaylistName('')
        setLoadingPlaylist(false)
        return
      }
      setLoadingPlaylist(true)
      try {
        const playlistDoc = await getDoc(doc(db, 'playlists', selectedPlaylist))
        if (playlistDoc.exists()) {
          setPlaylistName(playlistDoc.data().name || 'Untitled Playlist')
        }
      } catch (error) {
        console.error('Error loading playlist:', error)
      } finally {
        setLoadingPlaylist(false)
      }
    }
    loadPlaylistName()
  }, [selectedPlaylist])

  // 2. Fetch User's Playlists
  useEffect(() => {
    if (selectedPlaylist || !user?.id) return
    setLoadingPlaylists(true)
    const q = query(collection(db, 'playlists'), where('userId', '==', user.id))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Untitled',
        coverArtBase64: doc.data().coverArtBase64 || null,
      })) as PlaylistPreview[]
      setPlaylistsPreview(fetched)
      setLoadingPlaylists(false)
    })
    return () => unsubscribe()
  }, [selectedPlaylist, user?.id])

  // 3. Fetch Quick Picks
  useEffect(() => {
    const fetchQuickPicks = async () => {
      if (!user?.id || selectedPlaylist) return
      try {
        const globalUploadsRef = collection(db, 'users', user.id, 'uploads');
        const globalSnap = await getDocs(globalUploadsRef);
        const globalSongs = globalSnap.docs.map(doc => ({
          id: doc.id,
          playlistId: 'global',
          ...doc.data()
        }));

        const playlistsSnap = await getDocs(query(collection(db, 'playlists'), where('userId', '==', user.id)))
        const songPromises = playlistsSnap.docs.map(async (pDoc) => {
          const songsSnap = await getDocs(collection(db, 'playlists', pDoc.id, 'songs'))
          return songsSnap.docs.map(sDoc => ({
            id: sDoc.id,
            playlistId: pDoc.id,
            ...sDoc.data()
          }))
        })
        
        const playlistResults = await Promise.all(songPromises)
        const playlistSongs = playlistResults.flat()

        const uniqueSongsMap = new Map();
        [...globalSongs, ...playlistSongs].forEach(song => {
          if (song.url && !uniqueSongsMap.has(song.url)) {
            uniqueSongsMap.set(song.url, song);
          }
        });

        const combinedLibrary = Array.from(uniqueSongsMap.values());
        setFullLibrary(combinedLibrary);

        if (combinedLibrary.length > 0) {
          const shuffled = [...combinedLibrary].sort(() => 0.5 - Math.random())
          setQuickPicks(shuffled.slice(0, 10))
        } else {
          setQuickPicks([])
        }
      } catch (err) {
        console.error("Error fetching quick picks:", err)
      }
    }
    fetchQuickPicks()
  }, [user?.id, selectedPlaylist])

  const handleOpenPlaylistManager = () => setShowPlaylistManager(true)

  const handleQuickPickClick = (song: any) => {
    if (currentSong?.id === song.id) {
      if (isPlaying) pauseSong()
      else resumeSong()
    } else {
      playSong(song)
    }
  }

  const handleTryYourLuck = () => {
    if (fullLibrary.length > 0) {
      const randomIndex = Math.floor(Math.random() * fullLibrary.length);
      playSong(fullLibrary[randomIndex]);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-black text-white overflow-hidden relative">
      <Header user={user} />

      {/* --- ANIMATION STYLES --- */}
      <style>{`
        @keyframes luckyGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lucky-card {
          background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
          background-size: 400% 400%;
          animation: luckyGradient 10s ease infinite;
        }
        .animate-enter {
          animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0; /* Start hidden to prevent flash */
        }
      `}</style>

      <button
        className="lg:hidden fixed top-[12px] left-3 z-50 p-3 bg-black/80 rounded-md hover:bg-white/10 transition-all duration-200"
        onClick={() => setSidebarOpen(true)}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          selectedPlaylist={selectedPlaylist} 
          onSelectPlaylist={setSelectedPlaylist}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative bg-black">
          
          {/* Background Blur */}
          <div className="absolute top-0 left-0 w-full h-[60%] overflow-hidden z-0 pointer-events-none">
            <div 
              key={bgImage} 
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out animate-in fade-in"
              style={{
                backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(50px) brightness(0.2)',
                transform: 'scale(1.2)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-100" />
          </div>

          <div className="relative z-10 flex flex-col h-full overflow-hidden">
            {showPlaylistManager ? (
                <PlaylistManager onBack={() => setShowPlaylistManager(false)} />
            ) : selectedPlaylist ? (
              <div className="flex flex-col h-full overflow-hidden">
                 <PlaylistWindow playlistId={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col mt-24 p-6 md:p-10 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {loadingPlaylists ? (
                  <div className="text-center mt-20 animate-pulse text-gray-500">Loading library...</div>
                ) : (
                  <div className="w-full max-w-[1600px] mx-auto space-y-12 pb-24">
                    
                    {/* Greeting Section */}
                    <div className="animate-enter" style={{ animationDelay: '0ms' }}>
                      <span className='flex gap-4 items-center'>
                        <img src={currentAvatar} alt="avatar" className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-full shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
                        <div>
                          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            Hello, {user?.displayName}!
                          </h1>
                          <p className="text-gray-400 text-sm md:text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Welcome back to your music collection.</p>
                        </div>
                      </span>
                    </div>

                    {/* --- QUICK PICKS SECTION --- */}
                    {quickPicks.length > 0 && (
                      <section className="relative group/section">
                        <h2 className="text-2xl font-bold text-white mb-4 animate-enter" style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '100ms' }}>Quick Picks</h2>
                        
                        {/* LEFT ARROW */}
                         {showQPArrows.left && (
                          <button 
                            onClick={() => scrollContainer(quickPicksRef, 'left')}
                            className="absolute left-3 top-[46%] -translate-y-1/2 z-20 w-10 h-10 bg-black/20 hover:bg-black/80 backdrop-blur-md rounded-md  flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                          >
                            <ChevronLeft size={24} />
                          </button>
                        )}

                        {/* RIGHT ARROW */}
                        {showQPArrows.right && (
                          <button 
                            onClick={() => scrollContainer(quickPicksRef, 'right')}
                            className="absolute right-3 top-[46%] -translate-y-1/2 z-20 w-10 h-10 bg-black/20 hover:bg-black/80 backdrop-blur-md rounded-md  flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                          >
                            <ChevronRight size={24} />
                          </button>
                        )}

                        <div 
                          ref={quickPicksRef}
                          className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide snap-x relative z-10 scroll-smooth"
                          onScroll={() => checkScroll(quickPicksRef.current, setShowQPArrows)}
                        >
                          {/* Try Your Luck Card */}
                          <div 
                            className="flex-shrink-0 w-48 md:w-52 snap-start group cursor-pointer animate-enter" 
                            style={{ animationDelay: '150ms' }}
                            onClick={handleTryYourLuck}
                          >
                            <div className="aspect-square relative rounded-md overflow-hidden mb-3 lucky-card border border-white/10 flex flex-col items-center justify-center text-center p-4">
                              <Dices className="w-28 h-28 opacity-40 text-white mb-2 drop-shadow-lg" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-10 h-10 text-white fill-white" />
                              </div>
                            </div>
                            <h4 className="font-bold truncate text-sm text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Try your luck</h4>
                            <p className="text-xs text-gray-400 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Random selection</p>
                          </div>

                          {quickPicks.map((song, index) => {
                            const isActive = currentSong?.id === song.id;
                            // Stagger animation based on index
                            const delay = 200 + (index * 50) + 'ms'; 
                            
                            return (
                              <div 
                                key={song.id} 
                                className="flex-shrink-0 w-48 md:w-52 snap-start group cursor-pointer animate-enter" 
                                style={{ animationDelay: delay }}
                                onClick={() => handleQuickPickClick(song)}
                              >
                                <div className={`aspect-square relative rounded-md bg-zinc-900 overflow-hidden mb-3 border transition-colors duration-300 ${isActive ? 'border-white border-2' : 'border-white/5'}`}>
                                  {song.coverArtBase64 ? (
                                    <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Music className="w-10 h-10 text-zinc-600" /></div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    {isActive && isPlaying ? (
                                      <Pause className="w-10 h-10 text-white fill-white" />
                                    ) : (
                                      <Play className="w-10 h-10 text-white fill-white" />
                                    )}
                                  </div>
                                </div>
                                <h4 className="font-medium truncate text-sm text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</h4>
                                <p className="text-xs text-gray-500 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist || 'Unknown'}</p>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )}

                    {/* --- PLAYLISTS SECTION --- */}
                    <section className="relative group/section">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-1 mb-4 animate-enter" style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '300ms' }}>
                        Your Playlists
                      </h2>

                      {/* LEFT ARROW */}
                      {showPLArrows.left && (
                        <button 
                          onClick={() => scrollContainer(playlistsRef, 'left')}
                          className="absolute left-3 top-[46%] -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-black/20 backdrop-blur-md rounded-md flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                        >
                          <ChevronLeft size={24} />
                        </button>
                      )}

                      {/* RIGHT ARROW */}
                      {showPLArrows.right && (
                        <button 
                          onClick={() => scrollContainer(playlistsRef, 'right')}
                          className="absolute right-3 top-[46%] -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-black/20 backdrop-blur-md rounded-md flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                        >
                          <ChevronRight size={24} />
                        </button>
                      )}

                      <div 
                        ref={playlistsRef}
                        className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x relative z-10 scroll-smooth"
                        onScroll={() => checkScroll(playlistsRef.current, setShowPLArrows)}
                      >
                        {playlistsPreview.map((playlist, index) => {
                          const delay = 350 + (index * 50) + 'ms';
                          return (
                            <div 
                              key={playlist.id} 
                              className="flex-shrink-0 w-48 md:w-52 snap-start group cursor-pointer animate-enter" 
                              style={{ animationDelay: delay }}
                              onClick={() => setSelectedPlaylist(playlist.id)}
                            >
                              <div className="aspect-square relative bg-zinc-900 overflow-hidden rounded-md mb-3 border border-white/5 transition-colors duration-300">
                                {playlist.coverArtBase64 ? (
                                  <img src={playlist.coverArtBase64} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Music className="w-12 h-12 text-zinc-600" /></div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Play className="w-12 h-12 text-white fill-white" />
                                </div>
                              </div>
                              <h3 className="font-bold text-white truncate text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{playlist.name}</h3>
                              <p className="text-xs text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Playlist</p>
                            </div>
                          )
                        })}
                        <button 
                          onClick={handleOpenPlaylistManager} 
                          className="flex-shrink-0 w-48 rounded-md md:w-52 snap-start aspect-square bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center hover:bg-white/10 transition-colors group animate-enter"
                          style={{ animationDelay: `${350 + (playlistsPreview.length * 50)}ms` }}
                        >
                          <Plus className="w-8 h-8 text-gray-400 mb-2 group-hover:text-white transition-colors" />
                          <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Create Playlist</span>
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      {currentSong && <Player />}
    </div>
  )
}

export default Dashboard