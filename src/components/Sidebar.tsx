import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../utils/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { Plus, Music, X, Home, Import, Library, User, User2, Phone, Settings2, Mic, Radio } from 'lucide-react' 
import PlaylistManager from './PlaylistManager'
import Modal from './Modal'
import GlobalSongUpload from './GlobalSongUpload' 
import { useNavigate } from 'react-router-dom'
import Logo from '../images/logo.png';
import { usePlayer } from '../context/PlayerContext';
import { Capacitor } from '@capacitor/core';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import MobileSettings from './MobileSettings'
import DownloadModal from './DownloadModal';
import SoundieExplorer from './SoundieExplorer'
import SoundieTermsModal, { hasSoundieTermsAccepted } from './Soundietermsmodal'

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
  onShowLibrary: () => void
  onOpenSoundie?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedPlaylist,
  onSelectPlaylist,
  isOpen = true,
  onClose,
  onShowLibrary,
  onOpenSoundie,
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSoundieModal, setShowSoundieModal] = useState(false);
  const [showSoundieTerms, setShowSoundieTerms] = useState(false);

  const { currentSong } = usePlayer(); 
  
  // --- PREFERENCES & SETTINGS STATES ---
  const [theme, setTheme] = useState(() => {
    const isNative = Capacitor.isNativePlatform(); 
    return isNative ? (localStorage.getItem('soundwave_theme') || 'default') : 'default';
  });

  // Reduce motion active for all platforms
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true');

  // Soundie enabled — default true so Soundie is enabled out of the box
  const [soundieEnabled, setSoundieEnabled] = useState(localStorage.getItem('sw_soundie_enabled') !== 'false');

  // --- APPLE-STYLE DRAG & DROP NAV STATE ---
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const [dragHoverTab, setDragHoverTab] = useState<number | null>(null);
  const lastHoverTabRef = useRef<number>(0);
  const totalNavTabs = 6;

  const triggerNavHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    if (isHapticEnabled && Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }); } catch {}
    }
  };

  const getHoverTabFromTouch = (clientX: number): number => {
    if (!mobileNavRef.current) return 0;
    const rect = mobileNavRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const tabWidth = rect.width / totalNavTabs;
    return Math.min(totalNavTabs - 1, Math.max(0, Math.floor(relX / tabWidth)));
  };

  const handleNavTouchStart = (e: React.TouchEvent) => {
    setIsDraggingNav(true);
    const initialTab = getHoverTabFromTouch(e.touches[0].clientX);
    setDragHoverTab(initialTab);
    lastHoverTabRef.current = initialTab;
    triggerNavHaptic(ImpactStyle.Light);
  };

  const handleNavTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingNav) return;
    const currentTab = getHoverTabFromTouch(e.touches[0].clientX);
    if (currentTab !== lastHoverTabRef.current) {
      lastHoverTabRef.current = currentTab;
      setDragHoverTab(currentTab);
      triggerNavHaptic(ImpactStyle.Light);
    }
  };

  const handleNavTouchEnd = () => {
    setIsDraggingNav(false);
    const finalTab = lastHoverTabRef.current;
    setDragHoverTab(null);
    triggerNavHaptic(ImpactStyle.Medium);
    handleMobileNav(finalTab);
  };
  
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    const handleThemeUpdate = () => {
      // Removed the isNative check
      setTheme(localStorage.getItem('soundwave_theme') || 'default');
    };

    const handleSettingsUpdate = () => {
      // Allow reduce motion to update everywhere
      setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true');
      setSoundieEnabled(localStorage.getItem('sw_soundie_enabled') !== 'false');
    };

    handleThemeUpdate();
    handleSettingsUpdate();

    window.addEventListener('theme-change', handleThemeUpdate);
    window.addEventListener('sw-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate);
      window.removeEventListener('sw-settings-updated', handleSettingsUpdate);
    };
  }, []);
  
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    const playlistsRef = collection(db, 'playlists')
    const q = query(playlistsRef, where('userId', '==', user.id))
    const unsubscribe = onSnapshot(q, (snapshot) => {
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

const handleSelect = async (id: string | null) => {
  const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
  if (isHapticEnabled && Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
  }

  onSelectPlaylist(id);
  if (onClose) onClose();
};

// --- THEME ENGINE ---
const themeConfig: Record<string, any> = {
    default: {
      sidebarBgClass: 'bg-black border-r border-white/10',
      mobileNavBg: 'bg-black/80 border-white/10',
      activePill: 'bg-white/10',
      iconActive: 'text-white',
      iconInactive: 'text-white/40',
      logoText: 'text-white',
      navBtnClass: 'bg-white/5 hover:bg-white/10 text-white border border-transparent',
      headerBorder: 'border-white/10',
      logoHover: 'hover:text-indigo-400 text-white',
      sectionTitle: 'text-white/50',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-white/10 border-white/10' : 'hover:bg-white/5 hover:border-white/5 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-white' : 'text-white/70 group-hover:text-white',
      playlistIconBorder: 'border-white/10'
    },
    sunset: {
      sidebarBgClass: 'bg-gradient-to-b from-[#1a0502] to-black border-r border-orange-500/20',
      mobileNavBg: 'bg-[#1a0502]/90 border-orange-500/20',
      activePill: 'bg-orange-500/20',
      iconActive: 'text-orange-400',
      iconInactive: 'text-orange-200/40',
      logoText: 'text-orange-200',
      navBtnClass: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-100 border border-transparent hover:border-orange-500/30',
      headerBorder: 'border-orange-500/20',
      logoHover: 'hover:text-orange-400 text-orange-100',
      sectionTitle: 'text-orange-500/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-orange-500/20 border-orange-500/30' : 'hover:bg-orange-500/10 hover:border-orange-500/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-orange-100' : 'text-orange-200/70 group-hover:text-orange-100',
      playlistIconBorder: 'border-orange-500/30'
    },
    valentine: {
      sidebarBgClass: 'bg-gradient-to-b from-[#1f0610] to-black border-r border-pink-500/20',
      mobileNavBg: 'bg-[#1f0610]/90 border-pink-500/20',
      activePill: 'bg-pink-500/20',
      iconActive: 'text-pink-400',
      iconInactive: 'text-pink-200/40',
      logoText: 'text-pink-200',
      navBtnClass: 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-100 border border-transparent hover:border-pink-500/30',
      headerBorder: 'border-pink-500/20',
      logoHover: 'hover:text-pink-400 text-pink-100',
      sectionTitle: 'text-pink-500/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-pink-500/20 border-pink-500/30' : 'hover:bg-pink-500/10 hover:border-pink-500/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-pink-100' : 'text-pink-200/70 group-hover:text-pink-100',
      playlistIconBorder: 'border-pink-500/30'
    },
    jungle: {
      sidebarBgClass: 'bg-gradient-to-b from-[#03170b] to-black border-r border-emerald-500/20',
      mobileNavBg: 'bg-[#03170b]/90 border-emerald-500/20',
      activePill: 'bg-emerald-500/20',
      iconActive: 'text-emerald-400',
      iconInactive: 'text-emerald-200/40',
      logoText: 'text-emerald-200',
      navBtnClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 border border-transparent hover:border-emerald-500/30',
      headerBorder: 'border-emerald-500/20',
      logoHover: 'hover:text-emerald-400 text-emerald-100',
      sectionTitle: 'text-emerald-500/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-emerald-500/20 border-emerald-500/30' : 'hover:bg-emerald-500/10 hover:border-emerald-500/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-emerald-100' : 'text-emerald-200/70 group-hover:text-emerald-100',
      playlistIconBorder: 'border-emerald-500/30'
    },
    ocean: {
      sidebarBgClass: 'bg-gradient-to-b from-[#04121c] to-black border-r border-cyan-500/20',
      mobileNavBg: 'bg-[#04121c]/90 border-cyan-500/20',
      activePill: 'bg-cyan-500/20',
      iconActive: 'text-cyan-400',
      iconInactive: 'text-cyan-200/40',
      logoText: 'text-cyan-200',
      navBtnClass: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100 border border-transparent hover:border-cyan-500/30',
      headerBorder: 'border-cyan-500/20',
      logoHover: 'hover:text-cyan-400 text-cyan-100',
      sectionTitle: 'text-cyan-500/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-cyan-500/20 border-cyan-500/30' : 'hover:bg-cyan-500/10 hover:border-cyan-500/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-cyan-100' : 'text-cyan-200/70 group-hover:text-cyan-100',
      playlistIconBorder: 'border-cyan-500/30'
    },
    cyberpunk: {
      sidebarBgClass: 'bg-gradient-to-b from-[#120322] to-black border-r border-fuchsia-500/20',
      mobileNavBg: 'bg-[#120322]/90 border-fuchsia-500/20',
      activePill: 'bg-fuchsia-500/20',
      iconActive: 'text-fuchsia-400',
      iconInactive: 'text-fuchsia-200/40',
      logoText: 'text-fuchsia-200',
      navBtnClass: 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-100 border border-transparent hover:border-fuchsia-500/30',
      headerBorder: 'border-fuchsia-500/20',
      logoHover: 'hover:text-fuchsia-400 text-fuchsia-100',
      sectionTitle: 'text-fuchsia-500/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-fuchsia-500/20 border-fuchsia-500/30' : 'hover:bg-fuchsia-500/10 hover:border-fuchsia-500/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-fuchsia-100' : 'text-fuchsia-200/70 group-hover:text-fuchsia-100',
      playlistIconBorder: 'border-fuchsia-500/30'
    },
    midnight: {
      sidebarBgClass: 'bg-gradient-to-b from-[#0f071c] to-black border-r border-violet-500/20',
      mobileNavBg: 'bg-[#0f071c]/90 border-violet-500/20',
      activePill: 'bg-violet-500/20',
      iconActive: 'text-violet-400',
      iconInactive: 'text-violet-200/40',
      logoText: 'text-violet-200',
      navBtnClass: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-100 border border-transparent hover:border-violet-500/30',
      headerBorder: 'border-violet-500/20',
      logoHover: 'hover:text-violet-400 text-violet-100',
      sectionTitle: 'text-violet-500/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-violet-500/20 border-violet-500/30' : 'hover:bg-violet-500/10 hover:border-violet-500/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-violet-100' : 'text-violet-200/70 group-hover:text-violet-100',
      playlistIconBorder: 'border-violet-500/30'
    },
    coffee: {
      sidebarBgClass: 'bg-gradient-to-b from-[#140c06] to-black border-r border-amber-600/20',
      mobileNavBg: 'bg-[#140c06]/90 border-amber-600/20',
      activePill: 'bg-amber-600/20',
      iconActive: 'text-amber-400',
      iconInactive: 'text-amber-200/40',
      logoText: 'text-amber-200',
      navBtnClass: 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-100 border border-transparent hover:border-amber-600/30',
      headerBorder: 'border-amber-600/20',
      logoHover: 'hover:text-amber-400 text-amber-100',
      sectionTitle: 'text-amber-600/70',
      playlistClass: (isSelected: boolean) => isSelected ? 'bg-amber-600/20 border-amber-600/30' : 'hover:bg-amber-600/10 hover:border-amber-600/20 border-transparent',
      playlistText: (isSelected: boolean) => isSelected ? 'text-amber-100' : 'text-amber-200/70 group-hover:text-amber-100',
      playlistIconBorder: 'border-amber-600/30'
    }
  }
  
// --- MOBILE NAV LOGIC ---
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (showUploadModal) {
      setActiveTab(3);
    } else if (showNewPlaylistModal) {
      setActiveTab(2);
    } else if (location.pathname.includes('/library') || selectedPlaylist !== null) {
      setActiveTab(1);
    } else {
      if (isInitialMount.current) {
        const startupScreen = localStorage.getItem('sw_startup_screen');
        setActiveTab(startupScreen === 'library' ? 1 : 0);
        isInitialMount.current = false;
      }
    }
  }, [location.pathname, showUploadModal, showNewPlaylistModal, selectedPlaylist]);

  const handleMobileNav = async (index: number) => {
  const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
  const isNative = Capacitor.isNativePlatform();

  if (isHapticEnabled && isNative) {
    try {
      const style = (index === 2 || index === 3) ? ImpactStyle.Medium : ImpactStyle.Light;
      await Haptics.impact({ style });
    } catch (e) {}
  }

  // Handle Settings (Index 4)
  if (index === 4) {
    window.dispatchEvent(new CustomEvent('soundwave-open-settings'));
    return; 
  }

  // Handle Soundie (Index 5)
  if (index === 5) {
    if (isNative) {
      setShowUploadModal(false);
      setShowNewPlaylistModal(false);

      // Show terms modal first if not yet accepted
      if (!hasSoundieTermsAccepted()) {
        setShowSoundieTerms(true);
        return;
      }

      if (onOpenSoundie) onOpenSoundie();
    } else {
    navigate('/soundie');
    } 
    return;
  }

  setActiveTab(index);

  if (index === 0) {
    navigate('/', { replace: true });
    onSelectPlaylist(null);
    setShowUploadModal(false);
    setShowNewPlaylistModal(false);
    window.dispatchEvent(new Event('sw-go-home')); 
  }
  else if (index === 1) {
    onShowLibrary(); 
    setShowUploadModal(false);
    setShowNewPlaylistModal(false);
  } 
  else if (index === 2) {
    setShowNewPlaylistModal(true);
    setShowUploadModal(false);
  } 
  else if (index === 3) {
    setShowUploadModal(true);
    setShowNewPlaylistModal(false);
  }
};

  const activeTheme = themeConfig[theme] || themeConfig['default']
  const { 
    sidebarBgClass, navBtnClass, headerBorder, logoHover, 
    sectionTitle, playlistClass, playlistText, playlistIconBorder,
    mobileNavBg, activePill, iconActive, iconInactive
  } = activeTheme

  return (
    <>
      <style>{`
        ${!reduceMotion ? `
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-sidebar {
            animation: slideInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            opacity: 0; 
          }
        ` : `
          .animate-sidebar {
            opacity: 1;
            transform: none;
          }
        `}

        @keyframes soundie-nav-swirl {
          0%   { background-position: 0% 0%;    transform: scale(1) rotate(0deg); }
          50%  { background-position: 100% 100%; transform: scale(1.1) rotate(20deg); }
          100% { background-position: 0% 100%;  transform: scale(1) rotate(-15deg); }
        }
        .elevenlabs-mesh-nav {
          background:
            radial-gradient(circle at 70% 30%, rgba(249,115,22,1) 0%, transparent 60%),
            radial-gradient(circle at 20% 20%, rgba(139,92,246,1) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(236,72,153,1) 0%, transparent 60%),
            radial-gradient(circle at 10% 90%, rgba(14,165,233,1) 0%, transparent 60%);
          background-size: 160% 160%;
          animation: soundie-nav-swirl 5s ease-in-out infinite alternate;
          border-radius: 50%;
        }
        .soundie-nav-orb {
          box-shadow: 0 0 8px 1px rgba(139,92,246,0.55);
        }
      `}</style>

      {isOpen && onClose && (
        <div 
          className={`fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm ${reduceMotion ? '' : 'transition-opacity'}`}
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 flex flex-col overflow-hidden transform 
          ${reduceMotion ? '' : 'transition-all duration-500 ease-in-out'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${sidebarBgClass}
        `}
      >
        <div className="flex flex-col h-full">
          {onClose && (
            <div className="flex justify-between items-center md:hidden p-4 -mt-2">
              <div className="flex items-center gap-1 -ml-2">
                <img src={Logo} className="w-16 -mr-1" alt="SoundWave Logo" />
                <span className={`text-lg font-bold text-white`} style={{ fontFamily: 'Cabin, sans-serif' }}>
                  SoundWave
                </span>
              </div>
            </div>
          )}

          <div className={`p-4 border-b flex-shrink-0 ${headerBorder}`}>
            <div
              className={`text-2xl md:text-[26px] font-black text-center hidden md:block tracking-tight cursor-pointer ${reduceMotion ? '' : 'transition-colors duration-200'} animate-sidebar ${logoHover}`}
              style={{ fontFamily: 'Cabin, sans-serif', animationDelay: reduceMotion ? '0ms' : '0ms' }}
              onClick={() => {
                navigate('/dashboard');
                onSelectPlaylist(null);
                if (onClose) onClose();
              }}
            >
              <span className='flex mt-3'><img src={Logo} className='w-16 -mt-[16px] -mr-0.5' alt="Logo" /> SoundWave</span>
            </div>

            <button 
              onClick={() => { navigate('/'); onSelectPlaylist(null); if (onClose) onClose(); }}
              className={`w-full flex items-center justify-left gap-2 py-3.5 px-5 -mt-6 md:mt-1 text-sm rounded-t-md ${reduceMotion ? '' : 'transition-all duration-200'} animate-sidebar ${navBtnClass}`} 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: reduceMotion ? '0ms' : '100ms' }}
            >
              <Home size={22} /> <span className='text-[14px] mt-0.5 font-bold'>Home</span>
            </button>

            <button 
              onClick={() => { onShowLibrary(); if (onClose) onClose(); }}
              className={`w-full flex items-center justify-left gap-2 py-3.5 px-5 mt-0.5 text-sm ${reduceMotion ? '' : 'transition-all duration-200'} animate-sidebar ${navBtnClass}`} 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: reduceMotion ? '0ms' : '150ms' }}
            >
              <Library size={22} /> <span className='text-[14px] mt-0.5 font-bold'>Library</span>
            </button>

            <button 
              onClick={() => {
                window.dispatchEvent(new Event('soundwave-open-listen-together'))
                if (onClose) onClose()
              }}
              className={`w-full flex items-center justify-left gap-2 py-3.5 px-5 mt-0.5 text-sm ${reduceMotion ? '' : 'transition-all duration-200'} animate-sidebar ${navBtnClass}`} 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: reduceMotion ? '0ms' : '150ms' }}
            >
              <Radio size={22} className="text-violet-400" />
              <div className="flex items-center justify-between flex-1">
                <span className='text-[14px] mt-0.5 font-bold'>Listen Together</span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                  Live
                </span>
              </div>
            </button>

            <button 
              onClick={() => setShowNewPlaylistModal(true)}
              className={`w-full flex items-center justify-left gap-2 py-3.5 px-5 mt-0.5 text-sm ${reduceMotion ? '' : 'transition-all duration-200'} animate-sidebar ${navBtnClass}`} 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: reduceMotion ? '0ms' : '150ms' }}
            >
              <Plus size={22} /> <span className='text-[14px] mt-0.5 font-bold'>Create Playlist</span>
            </button>

            <button 
              onClick={() => setShowUploadModal(true)}
              className={`w-full flex items-center justify-left gap-2 py-3.5 px-5 mt-0.5 text-sm rounded-b-md ${reduceMotion ? '' : 'transition-all duration-200'} animate-sidebar ${navBtnClass}`} 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: reduceMotion ? '0ms' : '200ms' }}
            >
              <Import size={22} /> <span className='text-[14px] mt-0.5 font-bold'>Import Music</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <h3 
              className={`text-[11px] font-semibold uppercase tracking-wider mb-3 animate-sidebar ${sectionTitle}`} 
              style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: reduceMotion ? '0ms' : '250ms' }}
            >
              Quick Access
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-14 bg-white/5 rounded-xl ${reduceMotion ? '' : 'animate-pulse'}`} style={{ animationDelay: reduceMotion ? '0ms' : `${i * 100}ms` }} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {playlists.map((playlist, index) => {
                  const isSelected = selectedPlaylist === playlist.id
                  const delay = 300 + (index * 50) + 'ms';

                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handleSelect(playlist.id)}
                      className={`group w-full text-left px-4 py-3.5 rounded-md ${reduceMotion ? '' : 'transition-all'} border animate-sidebar ${playlistClass(isSelected)}`}
                      style={{ animationDelay: reduceMotion ? '0ms' : delay }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-black/50 border ${reduceMotion ? '' : 'transition-transform group-hover:scale-105'} ${playlistIconBorder}`}>
                          {playlist.coverArtBase64 ? (
                            <img src={playlist.coverArtBase64} alt={playlist.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
                              <Music className="w-5 h-5 text-zinc-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                          <p style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`font-medium text-sm truncate ${reduceMotion ? '' : 'transition-colors'} ${playlistText(isSelected)}`}>
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
        </div>
      </aside>

      {/* ========================================= */}
      {/* FLOATING MOBILE BOTTOM NAV (Apple-Style Drag & Drop Glassmorphic) */}
      {/* ========================================= */}
      <div 
        ref={mobileNavRef}
        onTouchStart={handleNavTouchStart}
        onTouchMove={handleNavTouchMove}
        onTouchEnd={handleNavTouchEnd}
        className={`
          md:hidden fixed bottom-6 left-4 right-4 z-[20] max-w-sm m-auto
          backdrop-blur-md border border-white/20 rounded-full shadow-2xl 
          transition-all ${reduceMotion ? 'duration-0' : 'duration-500'} ease-[cubic-bezier(0.23,1,0.32,1)] select-none touch-none
          ${mobileNavBg || 'bg-black/80'}
          ${currentSong ? '-translate-y-[80px]' : 'translate-y-0'} 
          ${isDraggingNav ? 'scale-[1.02] border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.15)]' : ''}
        `}
      >
        <div className="p-2">
          <div className="relative flex items-center h-[48px] w-full">
            
            {/* 🔥 THE APPLE SLIDING PILL (Fluid Touch-Drag & Drop Spring Animation) 🔥 */}
            <div 
              className={`absolute top-0 bottom-0 border border-white/10 rounded-full transition-transform ${isDraggingNav ? 'duration-75 scale-y-105' : (reduceMotion ? 'duration-0' : 'duration-300')} ease-[cubic-bezier(0.23,1,0.32,1)] z-0 ${activePill || 'bg-white/15'}`}
              style={{ 
                width: `${100 / totalNavTabs}%`,
                transform: `translateX(${dragHoverTab !== null ? dragHoverTab * 100 : activeTab * 100}%)` 
              }}
            />

            {/* BUTTON 0: HOME */}
            <button onClick={() => handleMobileNav(0)} className="relative z-10 flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-full bg-transparent">
              <Home size={20} strokeWidth={activeTab === 0 ? 3 : 2} className={`${reduceMotion ? '' : 'transition-colors duration-300'} ${activeTab === 0 ? (iconActive || 'text-white') : (iconInactive || 'text-white/50')}`} />
            </button>

            {/* BUTTON 1: LIBRARY */}
            <button onClick={() => handleMobileNav(1)} className="relative z-10 flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-full bg-transparent">
              <Library size={20} strokeWidth={activeTab === 1 ? 3 : 2} className={`${reduceMotion ? '' : 'transition-colors duration-300'} ${activeTab === 1 ? (iconActive || 'text-white') : (iconInactive || 'text-white/50')}`} />
            </button>

            {/* BUTTON 2: CREATE PLAYLIST */}
            <button onClick={() => handleMobileNav(2)} className="relative z-10 flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-full bg-transparent">
              <Plus size={20} strokeWidth={activeTab === 2 ? 3 : 2} className={`${reduceMotion ? '' : 'transition-colors duration-300'} ${activeTab === 2 ? (iconActive || 'text-white') : (iconInactive || 'text-white/50')}`} />
            </button>

            {/* BUTTON 3: UPLOAD */}
            <button onClick={() => handleMobileNav(3)} className="relative z-10 flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-full bg-transparent">
              <Import size={20} strokeWidth={activeTab === 3 ? 3 : 2} className={`${reduceMotion ? '' : 'transition-colors duration-300'} ${activeTab === 3 ? (iconActive || 'text-white') : (iconInactive || 'text-white/50')}`} />
            </button>

            {/* BUTTON 4: SETTINGS (Native & Mobile) */}
            <button 
              onClick={() => handleMobileNav(4)} 
              className={`relative z-10 flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-full bg-transparent ${reduceMotion ? '' : 'transition-opacity duration-300'}`}
            >
              <Settings2 
                size={20} 
                strokeWidth={activeTab === 4 ? 3 : 2} 
                className={`${reduceMotion ? '' : 'transition-colors duration-300'} ${activeTab === 4 ? (iconActive || 'text-white') : (iconInactive || 'text-white/50')}`} 
              />
            </button>

            {/* BUTTON 5: SOUNDIE AI ASSISTANT */}
            <button
              onClick={() => handleMobileNav(5)}
              className="relative z-10 flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-full bg-transparent"
            >
              <div className="absolute top-1.5 right-1.5 z-20">
                <div className="bg-white px-1 h-[14px] rounded-md shadow-lg scale-[0.75] flex items-center justify-center">
                  <span 
                    className="text-[8px] font-black text-black leading-none uppercase" 
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    AI
                  </span>
                </div>
              </div>

              <div className="relative w-6 h-6 rounded-full overflow-hidden soundie-nav-orb shadow-[0_0_12px_rgba(139,92,246,0.5)]">
                <div className="absolute inset-0 elevenlabs-mesh-nav" />
              </div>
            </button>

          </div>
        </div>
      </div>

      {showNewPlaylistModal && (
        <Modal isOpen={showNewPlaylistModal} onClose={() => setShowNewPlaylistModal(false)} title="Create New Playlist">
          <PlaylistManager onBack={() => setShowNewPlaylistModal(false)} />
        </Modal>
      )}

      {showUploadModal && (
        <GlobalSongUpload onClose={() => setShowUploadModal(false)} />
      )}

      {/* 🔥 THE MOBILE SETTINGS MODAL 🔥 */}
      <MobileSettings 
        isOpen={showMobileSettings} 
        onClose={() => setShowMobileSettings(false)} 
      />

      <DownloadModal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)} 
      />

      <SoundieTermsModal
        isOpen={showSoundieTerms}
        onAccept={() => {
          setShowSoundieTerms(false);
          if (onOpenSoundie) onOpenSoundie();
        }}
        onDecline={() => setShowSoundieTerms(false)}
      />
    </>
  )
}

export default Sidebar