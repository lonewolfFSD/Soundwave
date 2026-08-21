import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { getAuth } from 'firebase/auth'
import AccountModal from './AccountModal' 
import { Search as SearchIcon, Music, ListMusic, X, Clock, Trash2, Palette, Check, Filter, Settings, Youtube, ListPlus, DownloadCloud, Loader2, ArrowUpRight, Radio } from 'lucide-react'
import { getSearchSuggestions } from '../utils/ytMusic';
import AddToPlaylistModal from './AddToPlaylistModal';
import { downloadSongForOffline } from '../utils/offlineStorage';

import Logo from '../images/logo.png';

interface HeaderProps {
  user: any
  onSelectPlaylist?: (id: string | null) => void 
}

// --- THEME DATA FOR MODAL ---
const AVAILABLE_THEMES = [
  { 
    id: 'default', name: 'Default Dark', category: 'Dark', 
    colors: { activeBorder: 'border-indigo-500', shadow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]', checkBg: 'bg-indigo-500', sidebar: 'bg-zinc-950', main: 'bg-black', accent: 'bg-indigo-500/50', glow: '' } 
  },
  { 
    id: 'sunset', name: 'Sunset Vibes', category: 'Warm', 
    colors: { activeBorder: 'border-orange-500', shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]', checkBg: 'bg-orange-500', sidebar: 'bg-[#1a0502]', main: 'bg-gradient-to-br from-[#450a0a] to-[#1a0502]', accent: 'bg-orange-500/50', glow: 'bg-orange-500/20' } 
  },
  { 
    id: 'valentine', name: 'Valentine', category: 'Warm', 
    colors: { activeBorder: 'border-pink-500', shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.2)]', checkBg: 'bg-pink-500', sidebar: 'bg-[#1f0610]', main: 'bg-gradient-to-br from-rose-950 to-pink-900', accent: 'bg-pink-500/50', glow: 'bg-pink-500/20' } 
  },
  { 
    id: 'jungle', name: 'Jungle Groove', category: 'Nature', 
    colors: { activeBorder: 'border-emerald-500', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]', checkBg: 'bg-emerald-500', sidebar: 'bg-[#03170b]', main: 'bg-gradient-to-br from-emerald-950 to-green-900', accent: 'bg-emerald-500/50', glow: 'bg-emerald-500/20' } 
  },
  { 
    id: 'ocean', name: 'Deep Ocean', category: 'Cool', 
    colors: { activeBorder: 'border-cyan-500', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]', checkBg: 'bg-cyan-500', sidebar: 'bg-[#04121c]', main: 'bg-gradient-to-br from-[#083344] to-[#04121c]', accent: 'bg-cyan-500/50', glow: 'bg-cyan-500/20' } 
  },
  { 
    id: 'cyberpunk', name: 'Cyberpunk', category: 'Dark', 
    colors: { activeBorder: 'border-fuchsia-500', shadow: 'shadow-[0_0_20px_rgba(217,70,239,0.2)]', checkBg: 'bg-fuchsia-500', sidebar: 'bg-[#120322]', main: 'bg-gradient-to-br from-[#3b0764] to-[#120322]', accent: 'bg-fuchsia-500/50', glow: 'bg-fuchsia-500/20' } 
  },
  { 
    id: 'midnight', name: 'Midnight Purple', category: 'Dark', 
    colors: { activeBorder: 'border-violet-500', shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]', checkBg: 'bg-violet-500', sidebar: 'bg-[#0f071c]', main: 'bg-gradient-to-br from-[#2e1065] to-[#0f071c]', accent: 'bg-violet-500/50', glow: 'bg-violet-500/20' } 
  },
  { 
    id: 'coffee', name: 'Mocha / Coffee', category: 'Warm', 
    colors: { activeBorder: 'border-amber-600', shadow: 'shadow-[0_0_20px_rgba(217,119,6,0.2)]', checkBg: 'bg-amber-600', sidebar: 'bg-[#140c06]', main: 'bg-gradient-to-br from-[#451a03] to-[#140c06]', accent: 'bg-amber-600/50', glow: 'bg-amber-600/20' } 
  },
]
const THEME_CATEGORIES = ['All', 'Dark', 'Warm', 'Nature']

// --- GRADIENT AVATAR GENERATOR ---
const getGradientAvatar = (name: string) => {
  const colors = ['#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#14b8a6'];
  const cleanName = name || 'User';
  const charCode = cleanName.charCodeAt(0) || 0;
  const color1 = colors[charCode % colors.length];
  const color2 = colors[(charCode + 3) % colors.length];
  const initials = cleanName.substring(0, 2).toUpperCase();

  const svg = `
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#grad)" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="75" font-weight="700">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const Header: React.FC<HeaderProps> = ({ user, onSelectPlaylist }) => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { playSong, setQueue } = usePlayer()
  
  const displayName = user?.displayName || 'User'
  const email = user?.email || 'No email'

  const [avatarUrl, setAvatarUrl] = useState<string>(user?.photoURL || getGradientAvatar(displayName))
  const [isOpen, setIsOpen] = useState(false)
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchResults, setSearchResults] = useState<{ songs: any[], playlists: any[], youtube: any[] }>({ songs: [], playlists: [], youtube: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [recentSearches, setRecentSearches] = useState<any[]>([])
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<any | null>(null)
  
  // Theme States
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => 
    localStorage.getItem('soundwave_theme') || 'default'
  );
  const [themeSearch, setThemeSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  
  // Account Modal State
  const [showAccountModal, setShowAccountModal] = useState(false)

  // --- THEME ENGINE FOR HEADER ---
  const themeConfig: Record<string, any> = {
    default: {
      headerBg: 'bg-black', headerBorder: 'border-white/10', modalBg: 'bg-zinc-950', dropdownBg: 'bg-black', mobileOverlay: 'bg-black/95', inputBg: 'bg-zinc-900/50', searchHover: 'hover:bg-white/5'
    },
    sunset: {
      headerBg: 'bg-[#1a0502]', headerBorder: 'border-orange-500/20', modalBg: 'bg-[#2a0808]', dropdownBg: 'bg-[#1a0502]', mobileOverlay: 'bg-[#1a0502]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-orange-500/10'
    },
    valentine: {
      headerBg: 'bg-[#1f0610]', headerBorder: 'border-pink-500/20', modalBg: 'bg-[#330a1a]', dropdownBg: 'bg-[#1f0610]', mobileOverlay: 'bg-[#1f0610]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-pink-500/10'
    },
    jungle: {
      headerBg: 'bg-[#03170b]', headerBorder: 'border-emerald-500/20', modalBg: 'bg-[#062414]', dropdownBg: 'bg-[#03170b]', mobileOverlay: 'bg-[#03170b]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-emerald-500/10'
    },
    ocean: {
      headerBg: 'bg-[#04121c]', headerBorder: 'border-cyan-500/20', modalBg: 'bg-[#061a29]', dropdownBg: 'bg-[#04121c]', mobileOverlay: 'bg-[#04121c]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-cyan-500/10'
    },
    cyberpunk: {
      headerBg: 'bg-[#120322]', headerBorder: 'border-fuchsia-500/20', modalBg: 'bg-[#22063b]', dropdownBg: 'bg-[#120322]', mobileOverlay: 'bg-[#120322]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-fuchsia-500/10'
    },
    midnight: {
      headerBg: 'bg-[#0f071c]', headerBorder: 'border-violet-500/20', modalBg: 'bg-[#1a0c30]', dropdownBg: 'bg-[#0f071c]', mobileOverlay: 'bg-[#0f071c]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-violet-500/10'
    },
    coffee: {
      headerBg: 'bg-[#140c06]', headerBorder: 'border-amber-600/20', modalBg: 'bg-[#26150a]', dropdownBg: 'bg-[#140c06]', mobileOverlay: 'bg-[#140c06]/95', inputBg: 'bg-black/40', searchHover: 'hover:bg-amber-600/10'
    }
  }

  const activeThemeObj = themeConfig[currentTheme] || themeConfig['default']
  const { headerBg, headerBorder, dropdownBg, mobileOverlay, inputBg, searchHover } = activeThemeObj

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const toggleDropdown = () => setIsOpen((prev) => !prev)

  // --- Filter Themes Logic ---
  const filteredThemes = AVAILABLE_THEMES.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(themeSearch.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // --- Load Recent Searches on Mount ---
  useEffect(() => {
    const saved = localStorage.getItem('soundwave_recent_searches')
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)) } catch (e) { console.error("Failed to parse history") }
    }
  }, [])

  // --- Focus Input on Mobile Open ---
  useEffect(() => {
    if (showMobileSearch && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [showMobileSearch])

  // --- Auto-suggest as user types ---
  useEffect(() => {
    const fetchSuggest = async () => {
      if (searchQuery.trim().length >= 1) {
        try {
          const sug = await getSearchSuggestions(searchQuery)
          setSuggestions(sug)
          setShowSuggestions(true)
        } catch {}
      } else {
        setSuggestions([])
      }
    }
    const timer = setTimeout(fetchSuggest, 120)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectQuery = (queryText: string) => {
    if (!queryText || !queryText.trim()) return
    const clean = queryText.trim()
    const updatedHistory = [clean, ...recentSearches.filter(i => (typeof i === 'string' ? i !== clean : i.title !== clean))].slice(0, 8)
    setRecentSearches(updatedHistory)
    localStorage.setItem('soundwave_recent_searches', JSON.stringify(updatedHistory))
    
    setShowSuggestions(false)
    setShowMobileSearch(false)
    setSearchQuery('')
    navigate(`/dashboard?q=${encodeURIComponent(clean)}`)
  }

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('soundwave_recent_searches');
  }

  // --- Avatar Synchronization Logic ---
  useEffect(() => {
    // Function to check Firebase Auth directly for the freshest data
    const refreshAvatar = () => {
      const authUser = getAuth().currentUser;
      const photo = authUser?.photoURL || user?.photoURL;
      const nameToUse = authUser?.displayName || displayName;
      
      if (photo) {
        setAvatarUrl(photo);
      } else {
        setAvatarUrl(getGradientAvatar(nameToUse));
      }
    };

    // Initial load
    refreshAvatar();

    // Listen for the custom event dispatched by AccountModal
    window.addEventListener('user-profile-updated', refreshAvatar);
    
    return () => {
      window.removeEventListener('user-profile-updated', refreshAvatar);
    };
  }, [user?.photoURL, displayName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
         if (!showMobileSearch) setSearchQuery(''); 
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileSearch])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // --- Theme Change Handler ---
  // --- Theme Change Handler ---
  const handleThemeChange = (selectedTheme: string) => {
    // Removed isNative check so web users can change themes too
    setCurrentTheme(selectedTheme);
    localStorage.setItem('soundwave_theme', selectedTheme);
    
    // Dispatch the event so other components (Sidebar, Dashboard, etc.) update
    window.dispatchEvent(new Event('theme-change'));
  }

  useEffect(() => {
    const handleThemeUpdate = () => {
      // This allows the header to update on both Web and Native instantly
      setCurrentTheme(localStorage.getItem('soundwave_theme') || 'default');
    };

    window.addEventListener('theme-change', handleThemeUpdate);
    window.addEventListener('sw-settings-updated', handleThemeUpdate);

    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate);
      window.removeEventListener('sw-settings-updated', handleThemeUpdate);
    };
  }, []);

  return (
    <>
    <AccountModal 
        isOpen={showAccountModal} 
        onClose={() => setShowAccountModal(false)} 
        user={user} 
      />

      {/* THEME PERSONALIZATION MODAL */}
      {showThemeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl md:p-4 animate-in fade-in duration-200">
          <div className="bg-black/80 border border-white/10 p-6 md:p-8 md:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-3xl w-full relative flex flex-col max-h-[100vh] md:max-h-[90vh]">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowThemeModal(false)} 
              className="absolute top-6 right-6 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20}/>
            </button>
            
            {/* Modal Header */}
            <div className="mb-6 pr-10 shrink-0">
              <h2 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Personalize Vibe
              </h2>
              <p className="text-zinc-400 text-sm mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Transform your workspace to match your mood.
              </p>
            </div>

            {/* Search & Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  type="text"
                  placeholder="Search themes..."
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />
                {themeSearch && (
                  <button onClick={() => setThemeSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0">
                <Filter size={16} className="text-zinc-500 hidden md:block ml-2 mr-1" />
                {THEME_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Scrollable Theme Grid */}
            <div className="overflow-y-auto p-2 scrollbar-hide flex-1 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredThemes.length > 0 ? (
                  filteredThemes.map((t, i) => {
                    const isActive = currentTheme === t.id;
                    return (
                      <div 
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)} 
                        className={`group relative p-2 cursor-pointer rounded-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                          isActive 
                            ? `border-2 ${t.colors.activeBorder} scale-[1.02] ${t.colors.shadow}` 
                            : 'border border-white/10 hover:border-white/30 hover:scale-[1.02]'
                        }`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        {/* Active Checkmark */}
                        {isActive && (
                          <div className={`absolute top-2 right-2 w-7 h-7 ${t.colors.checkBg} rounded-md flex items-center justify-center shadow-lg animate-in zoom-in duration-200 z-10`}>
                            <Check size={14} className="text-white" strokeWidth={3} />
                          </div>
                        )}

                        {/* Mini UI Preview */}
                        <div className={`h-28 rounded-t-xl overflow-hidden flex ${t.colors.main}`}>
                          {/* Mini Sidebar */}
                          <div className={`w-1/3 ${t.colors.sidebar} border-r border-white/5 p-3 flex flex-col gap-2`}>
                            <div className={`w-1/2 h-2 ${t.colors.accent} rounded-full mb-2`}></div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full"></div>
                            <div className="w-4/5 h-1.5 bg-white/10 rounded-full"></div>
                          </div>
                          {/* Mini Main Area */}
                          <div className="flex-1 p-3 flex flex-col gap-3 relative overflow-hidden">
                            <div className="w-full h-2 bg-white/10 rounded-full"></div>
                            <div className="flex gap-2">
                              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-md"></div>
                              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-md"></div>
                            </div>
                            {/* Theme Ambient Glow (if any) */}
                            {t.colors.glow && <div className={`absolute bottom-0 right-0 w-20 h-20 ${t.colors.glow} blur-2xl rounded-full`}></div>}
                          </div>
                        </div>

                        {/* Theme Name Footer */}
                        <div className={`p-4 rounded-b-xl border-t border-white/5 ${t.colors.sidebar}`}>
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.name}</p>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">{t.category}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-1 sm:col-span-2 py-12 flex flex-col items-center justify-center text-zinc-500">
                    <Palette size={30} className="mb-3 opacity-20" />
                    <p style={{ fontFamily: 'Space Grotesk, sans-serif' }}>No themes found for "{themeSearch}"</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      <header className={`fixed top-0 left-0 right-0 z-50 ${headerBg} border-b ${headerBorder} transition-colors duration-500`}>
        
        {/* --- ANIMATION STYLES --- */}
        <style>{`
          @keyframes slideDownFade {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-header {
            animation: slideDownFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0; 
          }
        `}</style>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none" />

        {/* --- MOBILE SEARCH OVERLAY (Google / YouTube Style) --- */}
        <div 
          className={`
            fixed inset-0 z-[100] ${mobileOverlay} backdrop-blur-xl flex flex-col
            transition-all duration-300 ease-in-out
            ${showMobileSearch ? 'translate-y-0' : '-translate-y-full'}
          `}
        >
          <div className={`flex items-center gap-4 p-4 border-b ${headerBorder}`}>
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-[20px] -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSelectQuery(searchQuery);
                  }
                }}
                placeholder="Search songs, artists, music..."
                className={`w-full ${inputBg} border ${headerBorder} text-sm rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-zinc-500 focus:outline-none transition-colors duration-300`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>
            <button onClick={() => setShowMobileSearch(false)} className="text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {searchQuery.trim().length >= 1 ? (
              <div className="space-y-1">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectQuery(sug)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SearchIcon size={16} className="text-zinc-500 shrink-0" />
                      <span className="text-sm font-medium text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {sug}
                      </span>
                    </div>
                    <ArrowUpRight size={14} className="text-zinc-500 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Recent Searches</span>
                  {recentSearches.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {recentSearches.map((item, idx) => {
                    const text = typeof item === 'string' ? item : (item.title || item.name || '');
                    if (!text) return null;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectQuery(text)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Clock size={15} className="text-zinc-500 shrink-0" />
                          <span className="text-sm font-medium text-zinc-300 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {text}
                          </span>
                        </div>
                        <ArrowUpRight size={14} className="text-zinc-500 shrink-0" />
                      </div>
                    );
                  })}
                  {recentSearches.length === 0 && (
                    <div className="text-center text-zinc-600 text-sm py-8 italic">No recent searches</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8 flex-1">
            <div
              className="text-2xl md:text-3xl font-black text-white tracking-tight cursor-pointer hover:opacity-80 transition-opacity duration-200 shrink-0 animate-header flex items-center"
              style={{ fontFamily: 'Cabin, sans-serif', animationDelay: '0ms' }}
              onClick={() => {
                navigate('/dashboard');
                if (onSelectPlaylist) onSelectPlaylist(null);
              }}
            >
              <span className="flex items-center gap-2 mt-3">
                <img src={Logo} className="w-14 -mt-3" alt="Logo" />
                <span className="hidden md:block md:opacity-0">SoundWave</span>
              </span>
            </div>

            <div className="flex items-center gap-1 md:hidden ml-auto -mr-2 animate-header" style={{ animationDelay: '100ms' }}>
              <button 
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all relative flex items-center justify-center"
                onClick={() => window.dispatchEvent(new Event('soundwave-open-listen-together'))}
                title="Listen Together"
              >
                <Radio size={20} className="text-violet-400" />
                <span className="w-2 h-2 rounded-full bg-violet-400 absolute top-1 right-1 animate-pulse" />
              </button>

              <button 
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setShowMobileSearch(true)}
                title="Search"
              >
                <SearchIcon size={20} />
              </button>
            </div>

            {/* --- DESKTOP SEARCH BAR WITH QUERY SUGGESTIONS ONLY --- */}
            <div 
              className="w-full max-w-xl relative hidden md:block animate-header" 
              ref={searchRef}
              style={{ animationDelay: '100ms' }}
            >
              <div className="relative group ml-28 right-14">
                <SearchIcon className="absolute left-4 top-[22px] -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSelectQuery(searchQuery);
                    }
                  }}
                  placeholder="Search songs, artists, albums..."
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  className={`w-full ${inputBg} border ${headerBorder} rounded-xl py-3 pl-11 pr-10 text-[13px] text-white focus:outline-none transition-colors duration-300`}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSuggestions([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN (Google / YouTube search engine style) */}
              {showSuggestions && (
                <div className={`absolute top-full left-14 right-14 ${dropdownBg} border ${headerBorder} rounded-b-2xl shadow-2xl overflow-hidden z-50 transition-all duration-200 divide-y divide-white/5`}>
                  {searchQuery.trim().length >= 1 ? (
                    suggestions.length > 0 ? (
                      suggestions.map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectQuery(sug)}
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer ${searchHover} transition-colors group`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <SearchIcon size={14} className="text-zinc-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
                            <span className="text-sm font-medium text-white/90 group-hover:text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {sug}
                            </span>
                          </div>
                          <ArrowUpRight size={14} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors" />
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={() => handleSelectQuery(searchQuery)}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer ${searchHover} transition-colors group`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SearchIcon size={14} className="text-zinc-500" />
                          <span className="text-sm font-medium text-white/90 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            Search for &ldquo;{searchQuery}&rdquo;
                          </span>
                        </div>
                        <ArrowUpRight size={14} className="text-zinc-600" />
                      </div>
                    )
                  ) : recentSearches.length > 0 ? (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-1.5 mb-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Recent Searches</span>
                        <button onClick={clearHistory} className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1">
                          <Trash2 size={11} /> Clear
                        </button>
                      </div>
                      {recentSearches.slice(0, 6).map((item, idx) => {
                        const text = typeof item === 'string' ? item : (item.title || item.name || '');
                        if (!text) return null;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectQuery(text)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${searchHover} transition-colors group`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Clock size={13} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                              <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {text}
                              </span>
                            </div>
                            <ArrowUpRight size={13} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div 
            className="relative animate-header" 
            ref={dropdownRef}
            style={{ animationDelay: '200ms' }}
          >
            <button onClick={toggleDropdown} className="flex items-center gap-3 focus:outline-none group">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[12px] mt-1 font-medium text-white/90 truncate max-w-[160px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{displayName}</span>
                <span className="text-[11px] text-zinc-500 font-bold tracking-tighter lowercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{email}</span>
              </div>
              <div className={`w-9 h-9 rounded-md overflow-hidden border ${headerBorder} bg-black transition-transform duration-200 group-hover:scale-105`}>
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </button>

            {isOpen && (
              <div className={`absolute right-0 top-full mt-1 w-60 ${dropdownBg} border ${headerBorder} rounded-xl shadow-xl overflow-hidden z-50 transition-colors duration-300`}>
                <div className={`px-4 py-3 border-b ${headerBorder}`}>
                  <h3 className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'Cabin, sans-serif' }}>{displayName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{email}</p>
                </div>
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      window.dispatchEvent(new Event('soundwave-open-listen-together'));
                    }} 
                    className={`w-full px-4 py-2.5 text-left text-[13px] text-zinc-300 hover:text-white ${searchHover} transition-colors flex items-center justify-between`} 
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <div className="flex items-center gap-3">
                      <Radio size={16} className="text-violet-400" /> Listen Together
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                      Live
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      window.dispatchEvent(new CustomEvent('soundwave-open-settings'));
                    }} 
                    className={`w-full px-4 py-2.5 text-left text-[13px] text-zinc-300 hover:text-white ${searchHover} transition-colors flex items-center gap-3`} 
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <Settings size={16} /> Account Settings
                  </button>
                  <div className={`h-px ${headerBorder} border-b my-1`} />
                  {/* SIGN OUT BUTTON */}
                  <button 
                    onClick={handleLogout} 
                    className="w-full px-4 py-2.5 text-left text-[12px] text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors flex items-center gap-3" 
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Add To Playlist Modal */}
      {selectedTrackForPlaylist && (
        <AddToPlaylistModal
          isOpen={!!selectedTrackForPlaylist}
          song={selectedTrackForPlaylist}
          onClose={() => setSelectedTrackForPlaylist(null)}
        />
      )}
    </>
  )
}

export default Header