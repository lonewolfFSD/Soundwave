import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { Search as SearchIcon, Music, ListMusic, X } from 'lucide-react'

import Logo from '../images/logo.png';

interface HeaderProps {
  user: any
  onSelectPlaylist?: (id: string | null) => void 
}

const Header: React.FC<HeaderProps> = ({ user, onSelectPlaylist }) => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { playSong } = usePlayer()
  
  const displayName = user?.displayName || 'User'
  const email = user?.email || 'No email'
  const googlePhotoUrl = user?.photoURL
  
  const dicebearUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(displayName)}`

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ songs: any[], playlists: any[] }>({ songs: [], playlists: [] })
  const [isSearching, setIsSearching] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const toggleDropdown = () => setIsOpen((prev) => !prev)
  const currentAvatar = avatarUrl || dicebearUrl

  // --- Search Logic ---
  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults({ songs: [], playlists: [] });
        return;
      }

      setIsSearching(true);
      try {
        const userId = user?.uid || user?.id;
        if (!userId) return;

        const pSnap = await getDocs(query(collection(db, 'playlists'), where('userId', '==', userId)));
        const playlists = pSnap.docs
          .map(doc => ({ id: doc.id, type: 'playlist', ...doc.data() }))
          .filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const sSnap = await getDocs(query(collection(db, 'users', userId, 'uploads')));
        const songs = sSnap.docs
          .map(doc => ({ id: doc.id, type: 'song', ...doc.data() }))
          .filter((s: any) => 
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.artist.toLowerCase().includes(searchQuery.toLowerCase())
          );

        setSearchResults({ songs, playlists });
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleResultClick = (item: any) => {
    if (item.type === 'song') {
      playSong(item);
    } else {
      if (onSelectPlaylist) {
        onSelectPlaylist(item.id);
      } else {
        navigate(`/dashboard?playlist=${item.id}`);
      }
    }
    setSearchQuery('');
  };

  const saveAvatarIfNeeded = async () => {
    if (!user?.uid) return
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists() && userSnap.data()?.avatarUrl) {
      setAvatarUrl(userSnap.data().avatarUrl)
      return
    }
    setAvatarUrl(googlePhotoUrl || dicebearUrl)
  }

  useEffect(() => {
    if (user?.uid) saveAvatarIfNeeded()
  }, [user?.uid])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchQuery('');
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/40">
      
      {/* --- ANIMATION STYLES --- */}
      <style>{`
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-header {
          animation: slideDownFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0; /* Start hidden */
        }
      `}</style>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none" />

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-6">
        
        {/* Left Section: Logo + Search Bar */}
        <div className="flex items-center gap-8 flex-1">
          {/* Logo Animation */}
          <div
            className="text-2xl md:text-3xl font-black text-white tracking-tight ml-12 md:ml-0 cursor-pointer hover:text-indigo-400 transition-colors duration-200 shrink-0 animate-header"
            style={{ fontFamily: 'Cabin, sans-serif', animationDelay: '0ms' }}
            onClick={() => {
              navigate('/dashboard');
              if (onSelectPlaylist) onSelectPlaylist(null);
            }}
          >
            <span className='flex mt-3'><img src={Logo} className='w-14 -mt-3' /> SoundWave</span>
          </div>

          {/* Search Bar Animation */}
          <div 
            className="w-full max-w-xl relative hidden md:block animate-header" 
            ref={searchRef}
            style={{ animationDelay: '100ms' }}
          >
            <div className="relative group ml-28 ">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs or playlists..."
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-md py-2.5 pl-11 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>

            {searchQuery.length >= 2 && (
              <div className="absolute top-full left-28 right-0  bg-black border border-white/20 rounded-b-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-zinc-500 text-xs animate-pulse font-bold uppercase tracking-widest">Searching...</div>
                ) : (searchResults.songs.length === 0 && searchResults.playlists.length === 0) ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">No results found</div>
                ) : (
                  <div className="p-2">
                    {searchResults.playlists.map(p => (
                      <div key={p.id} onClick={() => handleResultClick(p)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer group">
                        <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0 flex items-center justify-center">
                          {p.coverArtBase64 ? <img src={p.coverArtBase64} className="w-full h-full object-cover" /> : <ListMusic className="text-zinc-600" size={20} />}
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-indigo-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{p.name} (Playlist)</span>
                      </div>
                    ))}
                    {searchResults.songs.map(s => (
                      <div key={s.id} onClick={() => handleResultClick(s)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer group">
                        <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0 flex items-center justify-center">
                          {s.coverArtBase64 ? <img src={s.coverArtBase64} className="w-full h-full object-cover" /> : <Music className="text-zinc-600" size={20} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white group-hover:text-indigo-400 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.title}</span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter truncate">{s.artist}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Profile Animation */}
        <div 
          className="relative animate-header" 
          ref={dropdownRef}
          style={{ animationDelay: '200ms' }}
        >
          <button onClick={toggleDropdown} className="flex items-center gap-3 focus:outline-none group">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-white/90 truncate max-w-[160px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{displayName}</span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-tighter uppercase">soundwave user</span>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/30 bg-black transition-transform duration-200 group-hover:scale-105">
              <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-1 w-60 bg-black border border-white/20 rounded-xl shadow-xl overflow-hidden z-50 transition-all">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'Cabin, sans-serif' }}>{displayName}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{email}</p>
              </div>
              <div className="py-1">
                <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header