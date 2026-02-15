import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { Plus, Music, X, Home, Upload, AlertCircle, Import } from 'lucide-react' 
import PlaylistManager from './PlaylistManager'
import SongUpload from './SongUpload' 
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import GlobalSongUpload from './GlobalSongUpload' 

import Logo from '../images/logo.png';

interface Playlist {
  id: string
  name: string
  songCount: number
  coverArtBase64?: string | null
}

interface SidebarProps {
  selectedPlaylist: string | null
  onSelectPlaylist: (id: string | null) => void
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedPlaylist,
  onSelectPlaylist,
  isOpen = true,
  onClose,
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlaylistManager, setShowPlaylistManager] = useState(false)

  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const playlistsRef = collection(db, 'playlists')
    const q = query(playlistsRef, where('userId', '==', user.id))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Untitled',
          songCount: doc.data().songCount || 0,
          coverArtBase64: doc.data().coverArtBase64 || null,
        })) as Playlist[]

        setPlaylists(fetched)
        setLoading(false)
      },
      (err) => {
        console.error('Playlists fetch error:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.id])

  const handleSelect = (id: string | null) => {
    onSelectPlaylist(id)
    if (onClose) onClose()
  }

  return (
    <>
      {/* --- ANIMATION STYLES --- */}
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-sidebar {
          animation: slideInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0; /* Start hidden */
        }
      `}</style>

      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 bg-black border-r border-white/10
          flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {onClose && (
            <div className="flex justify-end md:hidden p-4">
               <button onClick={onClose} className="text-white/50 hover:text-white"><X /></button>
            </div>
          )}

          <div className="p-4 border-b mt-2 border-white/10 flex-shrink-0">
            {/* Brand */}
            <div
              className="text-2xl md:text-3xl font-black text-center text-white hidden md:block tracking-tight cursor-pointer hover:text-indigo-400 transition-colors duration-200 animate-sidebar"
              style={{ fontFamily: 'Cabin, sans-serif', animationDelay: '0ms' }}
              onClick={() => {
                navigate('/dashboard');
                onSelectPlaylist(null);
              }}
            >
              <span className='flex'><img src={Logo} className='w-20 -mt-[23px] -mr-1.5' /> SoundWave</span>
            </div>

            {/* Home Button */}
            <button 
              onClick={() => {
                navigate('/')
                onSelectPlaylist(null)
              }}
              className="
                w-full flex items-center justify-left gap-2
                py-4 px-5 -mt-6 md:mt-6
                bg-white/5 hover:bg-white/10
                text-white text-sm
                rounded-t-md transition-all duration-200
                animate-sidebar
              " 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '100ms' }}
            >
              <Home size={22} />
              <span className='text-[15px] font-bold'>Home</span>
            </button>

            {/* Create Playlist Button */}
            <button 
              onClick={() => setShowNewPlaylistModal(true)}
              className="
                w-full flex items-center justify-left gap-2
                py-4 px-5 mt-1.5
                bg-white/5 hover:bg-white/10
                text-white text-sm
                transition-all duration-200
                animate-sidebar
              " 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '150ms' }}
            >
              <Plus size={22} />
              <span className='text-[15px] font-bold'>Create Playlist</span>
            </button>

            {/* Upload Music Button */}
            <button 
              onClick={() => setShowUploadModal(true)}
              className="
                w-full flex items-center justify-left gap-2
                py-4 px-5 mt-1.5
                bg-white/5 hover:bg-white/10
                text-white text-sm
                rounded-b-md transition-all duration-200
                animate-sidebar
              " 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '200ms' }}
            >
              <Import size={22} />
              <span className='text-[15px] font-bold'>Import Music</span>
            </button>
          </div>

          {!showPlaylistManager && (
            <div className="flex-1 overflow-y-auto px-5 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <h3 
                className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-5 animate-sidebar" 
                style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: '250ms' }}
              >
                Your Playlists
              </h3>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {playlists.map((playlist, index) => {
                    const isSelected = selectedPlaylist === playlist.id
                    // Calculate delay: Base delay (300ms) + index * 50ms
                    const delay = 300 + (index * 50) + 'ms';

                    return (
                      <button
                        key={playlist.id}
                        onClick={() => handleSelect(playlist.id)}
                        className={`
                          group w-full text-left px-4 py-3.5 rounded-md transition-all border border-transparent 
                          animate-sidebar
                          ${isSelected ? 'bg-white/10 border-white/10' : 'hover:bg-white/5 hover:border-white/5'}
                        `}
                        style={{ animationDelay: delay }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-black/50 border border-white/10 transition-transform group-hover:scale-105">
                            {playlist.coverArtBase64 ? (
                              <img src={playlist.coverArtBase64} alt={playlist.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
                                <Music className="w-5 h-5 text-zinc-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                            <p className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white transition-colors'}`}>
                              {playlist.name}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Playlist Creation Modal */}
      {showNewPlaylistModal && (
        <Modal isOpen={showNewPlaylistModal} onClose={() => setShowNewPlaylistModal(false)} title="Create New Playlist">
          <PlaylistManager onBack={() => setShowNewPlaylistModal(false)} />
        </Modal>
      )}

      {/* --- INTEGRATED SONG UPLOAD MODAL --- */}
      {showUploadModal && (
        <GlobalSongUpload 
          onClose={() => setShowUploadModal(false)} 
        />
      )}
    </>
  )
}

export default Sidebar