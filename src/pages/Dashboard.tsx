import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { db } from '../utils/firebase'
import { doc, getDoc, getDocs } from 'firebase/firestore'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Player from '../components/Player'
import { Plus, Music, Music2, Play, Pause, Dices, ChevronLeft, ChevronRight, Sparkles, Youtube, ListPlus, ListMusic, DownloadCloud, Radio, Flame, Zap, Compass, Heart, Check } from 'lucide-react'
import PlaylistWindow from '@/components/PlaylistDetail'
import Library from '../components/Library.'
import SoundieAssistant from '../components/SoundAssistant';
import { getTrendingYouTubeMusic, getCategoryTracks } from '../utils/ytMusic';
import { 
  MUSIC_CATEGORIES, 
  generateSmartRecommendations,
  detectUserAffinities,
  generateSimilarToTrack,
  generateFeaturedMixes,
  type FeaturedMix 
} from '../utils/aiRecommender';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { downloadSongForOffline } from '../utils/offlineStorage';
import { CategoryIcon } from '../components/CategoryIcon';
import { SearchResultsView } from '../components/SearchResultsView';
import { DynamicPlaylistView } from '../components/DynamicPlaylistView';
import { ArtistProfileView } from '../components/ArtistProfileView';
import { AccountSettingsPage } from '../components/AccountSettingsPage';
import { ListenTogetherView } from '../components/ListenTogetherView';
import PlaylistManager from '../components/PlaylistManager';

import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core';

interface PlaylistPreview {
  id: string
  name: string
  coverArtBase64?: string | null
}

interface DashboardSongCardProps {
  song: any
  index: number
  isActive: boolean
  isPlaying: boolean
  cardWidth: string
  cardBg: string
  cardActive: string
  accentGlow: string
  emptyIconBg: string
  emptyIconColor: string
  textMain: string
  textMuted: string
  animClass: string
  reduceMotion: boolean
  isLiked?: boolean
  isInQueue?: boolean
  onPlay: (song: any) => void
  onPause: () => void
  onResume: () => void
  onQueue?: (e: React.MouseEvent, song: any) => void
  onLike?: (e: React.MouseEvent, song: any) => void
  onAddToPlaylist?: (song: any) => void
  onDownload?: (song: any) => void
  onOpenArtist: (artist: string) => void
}

const DashboardSongCard: React.FC<DashboardSongCardProps> = React.memo(({
  song,
  index,
  isActive,
  isPlaying,
  cardWidth,
  cardBg,
  cardActive,
  accentGlow,
  emptyIconBg,
  emptyIconColor,
  textMain,
  textMuted,
  animClass,
  reduceMotion,
  isLiked,
  isInQueue,
  onPlay,
  onPause,
  onResume,
  onQueue,
  onLike,
  onAddToPlaylist,
  onDownload,
  onOpenArtist,
}) => {
  const delay = Math.min(index * 30, 240) + 'ms'

  return (
    <div
      className={`flex-shrink-0 ${cardWidth} snap-start cursor-pointer group sw-card-hover ${animClass}`}
      style={{ animationDelay: reduceMotion ? '0ms' : delay, contain: 'content' }}
      onClick={() => {
        if (isActive) {
          if (isPlaying) onPause()
          else onResume()
        } else {
          onPlay(song)
        }
      }}
    >
      <div
        className={`aspect-square relative rounded-2xl overflow-hidden mb-2.5 border sw-card-surface ${isActive ? `${cardActive} sw-active-sheen` : cardBg}`}
        style={isActive ? { boxShadow: `0 0 20px ${accentGlow}, 0 4px 16px rgba(0,0,0,0.3)` } : {}}
      >
        {song.coverArtBase64 ? (
          <img
            src={song.coverArtBase64}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${emptyIconBg}`}>
            <Music className={`w-9 h-9 ${emptyIconColor}`} />
          </div>
        )}
        <div className="sw-play-overlay absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 p-2 transition-opacity">
          <div className="w-11 h-11 rounded-xl bg-black/50 flex items-center justify-center border border-white/20 hover:scale-110 transition-transform shadow-lg">
            {isActive && isPlaying ? (
              <Pause className="w-6 h-6 text-white fill-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            )}
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {onLike && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onLike(e, song)
                }}
                title={isLiked ? 'Liked' : 'Like'}
                className={`p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/20 ${isLiked ? 'text-pink-500' : 'text-white'}`}
              >
                <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
            )}
            {onQueue && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onQueue(e, song)
                }}
                title="Add to Priority Queue (Play Next)"
                className={`p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/20 ${isInQueue ? 'text-indigo-400' : 'text-white'}`}
              >
                <Plus size={14} />
              </button>
            )}
            {onAddToPlaylist && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddToPlaylist(song)
                }}
                title="Add to Playlist"
                className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20"
              >
                <ListPlus size={14} />
              </button>
            )}
            {onDownload && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload(song)
                }}
                title="Download for Offline"
                className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20"
              >
                <DownloadCloud size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      <h4 className={`font-medium truncate text-[14px] sw-font-display ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {song.title}
      </h4>
      <p
        onClick={(e) => {
          e.stopPropagation()
          onOpenArtist(song.artist)
        }}
        className={`text-[12px] truncate sw-font-body ${textMuted} hover:text-white hover:underline cursor-pointer transition-colors`}
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {song.artist || 'Artist'}
      </p>
    </div>
  )
})

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQueryParam = searchParams.get('q') || ''
  const artistQueryParam = searchParams.get('artist') || ''
  const settingsQueryParam = searchParams.get('settings') || ''
  const jamQueryParam = searchParams.get('jam') || ''
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, setQueue, playedHistory, likedSongs, isSongLiked, toggleLikeSong, addToQueue, upNextQueue } = usePlayer()
  const [queueToast, setQueueToast] = useState<string | null>(null)

  const handleQueueSong = (e: React.MouseEvent, song: any) => {
    e.stopPropagation()
    if (addToQueue && song) {
      addToQueue(song)
      setQueueToast(`Added "${song.title}" to Up Next (Priority Queue)`)
      setTimeout(() => setQueueToast(null), 2500)
    }
  }

  const [activeArtistName, setActiveArtistName] = useState<string | null>(artistQueryParam || null)
  const [showSettings, setShowSettings] = useState(settingsQueryParam === 'true')
  const [showListenTogether, setShowListenTogether] = useState(jamQueryParam === 'true')

  useEffect(() => {
    if (artistQueryParam) {
      setActiveArtistName(artistQueryParam)
    } else {
      setActiveArtistName(null)
    }
  }, [artistQueryParam])

  useEffect(() => {
    if (settingsQueryParam === 'true') {
      setShowSettings(true)
    }
  }, [settingsQueryParam])

  useEffect(() => {
    if (jamQueryParam === 'true') {
      setShowListenTogether(true)
    }
  }, [jamQueryParam])

  useEffect(() => {
    const handleOpenArtist = (e: any) => {
      if (e.detail) openArtistProfile(e.detail)
    }
    const handleOpenSettings = () => {
      setShowSettings(true)
      setShowListenTogether(false)
      setShowPlaylistManager(false)
    }
    const handleOpenListenTogether = () => {
      setShowListenTogether(true)
      setShowSettings(false)
      setShowLibrary(false)
      setShowPlaylistManager(false)
      setSelectedPlaylist(null)
    }
    const handleOpenCreatePlaylist = () => {
      setShowPlaylistManager(true)
      setShowSettings(false)
      setShowListenTogether(false)
      setShowLibrary(false)
      setSelectedPlaylist(null)
      setActiveArtistName(null)
      setActiveDynamicPlaylist(null)
    }
    const handleOpenSoundie = () => {
      if (Capacitor.isNativePlatform() && localStorage.getItem('sw_soundie_enabled') !== 'false') {
        setSoundieOpen(true)
      }
    }
    window.addEventListener('soundwave-open-artist', handleOpenArtist)
    window.addEventListener('soundwave-open-settings', handleOpenSettings)
    window.addEventListener('soundwave-open-listen-together', handleOpenListenTogether)
    window.addEventListener('soundwave-open-create-playlist', handleOpenCreatePlaylist)
    window.addEventListener('open-soundie', handleOpenSoundie)
    window.addEventListener('soundwave-open-soundie', handleOpenSoundie)
    return () => {
      window.removeEventListener('soundwave-open-artist', handleOpenArtist)
      window.removeEventListener('soundwave-open-settings', handleOpenSettings)
      window.removeEventListener('soundwave-open-listen-together', handleOpenListenTogether)
      window.removeEventListener('soundwave-open-create-playlist', handleOpenCreatePlaylist)
      window.removeEventListener('open-soundie', handleOpenSoundie)
      window.removeEventListener('soundwave-open-soundie', handleOpenSoundie)
    }
  }, [])

  const openArtistProfile = (name: string) => {
    if (!name || name === 'Unknown' || name === 'Unknown Artist') return
    setActiveArtistName(name)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('artist', name)
    setSearchParams(nextParams)
  }

  const closeArtistProfile = () => {
    setActiveArtistName(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('artist')
    setSearchParams(nextParams)
  }

  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [activeDynamicPlaylist, setActiveDynamicPlaylist] = useState<FeaturedMix | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const [showPlaylistManager, setShowPlaylistManager] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [soundieOpen, setSoundieOpen] = useState(false)

  const [loadingPlaylist, setLoadingPlaylist] = useState(false)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)

  const [playlistsPreview, setPlaylistsPreview] = useState<PlaylistPreview[]>([])
  const [quickPicks, setQuickPicks] = useState<any[]>([])
  const [trendingTracks, setTrendingTracks] = useState<any[]>([])
  const [fullLibrary, setFullLibrary] = useState<any[]>([])
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<any | null>(null)

  // Categories & Smart Mixes
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categoryTracksMap, setCategoryTracksMap] = useState<Record<string, any[]>>({})
  const [loadingCategory, setLoadingCategory] = useState(false)

  const displayName = user?.displayName || 'User'
  const dicebearUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(displayName)}`
  const [avatarUrl, setAvatarUrl] = useState<string>(dicebearUrl)
  const [bgImage, setBgImage] = useState<string | null>(null)

  useEffect(() => {
    if (user?.photoURL) setAvatarUrl(user.photoURL)
    else setAvatarUrl(dicebearUrl)
  }, [user, dicebearUrl])

  const handleAvatarError = () => {
    if (avatarUrl !== dicebearUrl) setAvatarUrl(dicebearUrl)
  }

  const [theme, setTheme] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    return isNative ? (localStorage.getItem('soundwave_theme') || 'default') : 'default';
  });

  const [compactMode, setCompactMode] = useState(() => {
    return localStorage.getItem('sw_compact_mode') === 'true';
  });

  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true')

  useEffect(() => {
    const handleThemeUpdate = () => setTheme(localStorage.getItem('soundwave_theme') || 'default');
    const handleSettingsUpdate = () => {
      setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true');
      setCompactMode(localStorage.getItem('sw_compact_mode') === 'true');
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

  const animClass = reduceMotion ? '' : 'sw-animate-enter';
  const getDelay = (delayStr: string) => reduceMotion ? '0ms' : delayStr;
  const cardWidth = compactMode ? 'w-32 sm:w-36 md:w-40' : 'w-36 sm:w-40 md:w-48';
  const gridGap = compactMode ? 'gap-2.5 sm:gap-3' : 'gap-3 sm:gap-4';

  // --- THEME ENGINE ---
  const themeConfig: Record<string, any> = {
    default: {
      mainBg: 'bg-[#080808]',
      gradientOrb1: '#ffffff08',
      gradientOrb2: '#ffffff04',
      accentColor: '#e2e2e2',
      accentGlow: 'rgba(255,255,255,0.15)',
      sectionTitle: 'text-white/40',
      textMain: 'text-white',
      textMuted: 'text-white/40',
      cardBg: 'bg-white/[0.04] border-white/[0.06]',
      cardActive: 'border-white/60 border',
      btnNav: 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08]',
      emptyIconBg: 'bg-white/[0.03]',
      emptyIconColor: 'text-white/20',
      createBtn: 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] text-white/30 hover:text-white/70',
      blurBrightness: '0.15',
      blurFade: 'from-[#080808] via-[#080808]/80',
      luckyGrad: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
      luckyGlow: 'rgba(231,60,126,0.4)',
      pillBg: 'bg-white/[0.06] border-white/[0.08]',
      waveColor: '#ffffff',
    },
    sunset: {
      mainBg: 'bg-[#0c0502]',
      gradientOrb1: '#ff6b0010',
      gradientOrb2: '#f9d42308',
      accentColor: '#ff8c42',
      accentGlow: 'rgba(255,100,0,0.2)',
      sectionTitle: 'text-orange-200/50',
      textMain: 'text-orange-50',
      textMuted: 'text-orange-200/40',
      cardBg: 'bg-orange-900/[0.12] border-orange-500/[0.1]',
      cardActive: 'border-orange-400 border',
      btnNav: 'bg-orange-500/[0.08] hover:bg-orange-500/[0.18] text-orange-100 border border-orange-500/[0.12]',
      emptyIconBg: 'bg-orange-900/20',
      emptyIconColor: 'text-orange-500/30',
      createBtn: 'bg-orange-500/[0.04] border-orange-500/15 hover:bg-orange-500/[0.1] text-orange-300/50 hover:text-orange-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#0c0502] via-[#0c0502]/80',
      luckyGrad: 'linear-gradient(-45deg, #ff4e50, #f9d423)',
      luckyGlow: 'rgba(249,212,35,0.25)',
      pillBg: 'bg-orange-500/[0.08] border-orange-500/[0.1]',
      waveColor: '#ff8c42',
    },
    valentine: {
      mainBg: 'bg-[#0e0308]',
      gradientOrb1: '#ff006620',
      gradientOrb2: '#ff006608',
      accentColor: '#ff4d8b',
      accentGlow: 'rgba(255,0,100,0.25)',
      sectionTitle: 'text-pink-200/50',
      textMain: 'text-pink-50',
      textMuted: 'text-pink-200/40',
      cardBg: 'bg-pink-900/[0.12] border-pink-500/[0.1]',
      cardActive: 'border-pink-400 border',
      btnNav: 'bg-pink-500/[0.08] hover:bg-pink-500/[0.18] text-pink-100 border border-pink-500/[0.12]',
      emptyIconBg: 'bg-pink-900/20',
      emptyIconColor: 'text-pink-500/30',
      createBtn: 'bg-pink-500/[0.04] border-pink-500/15 hover:bg-pink-500/[0.1] text-pink-300/50 hover:text-pink-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#0e0308] via-[#0e0308]/80',
      luckyGrad: 'linear-gradient(-45deg, #ff0844, #ffb199)',
      luckyGlow: 'rgba(255,80,140,0.4)',
      pillBg: 'bg-pink-500/[0.08] border-pink-500/[0.1]',
      waveColor: '#ff4d8b',
    },
    jungle: {
      mainBg: 'bg-[#030e07]',
      gradientOrb1: '#00ff6615',
      gradientOrb2: '#00ff6606',
      accentColor: '#34d399',
      accentGlow: 'rgba(0,200,100,0.2)',
      sectionTitle: 'text-emerald-200/50',
      textMain: 'text-emerald-50',
      textMuted: 'text-emerald-200/40',
      cardBg: 'bg-emerald-900/[0.12] border-emerald-500/[0.1]',
      cardActive: 'border-emerald-400 border',
      btnNav: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.18] text-emerald-100 border border-emerald-500/[0.12]',
      emptyIconBg: 'bg-emerald-900/20',
      emptyIconColor: 'text-emerald-500/30',
      createBtn: 'bg-emerald-500/[0.04] border-emerald-500/15 hover:bg-emerald-500/[0.1] text-emerald-300/50 hover:text-emerald-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#030e07] via-[#030e07]/80',
      luckyGrad: 'linear-gradient(-45deg, #0ba360, #3cba92, #00c96e, #3cba92)',
      luckyGlow: 'rgba(52,211,153,0.4)',
      pillBg: 'bg-emerald-500/[0.08] border-emerald-500/[0.1]',
      waveColor: '#34d399',
    },
    ocean: {
      mainBg: 'bg-[#020c14]',
      gradientOrb1: '#0088ff15',
      gradientOrb2: '#00d4ff08',
      accentColor: '#38bdf8',
      accentGlow: 'rgba(0,150,255,0.2)',
      sectionTitle: 'text-cyan-200/50',
      textMain: 'text-cyan-50',
      textMuted: 'text-cyan-200/40',
      cardBg: 'bg-cyan-900/[0.12] border-cyan-500/[0.1]',
      cardActive: 'border-cyan-400 border',
      btnNav: 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.18] text-cyan-100 border border-cyan-500/[0.12]',
      emptyIconBg: 'bg-cyan-900/20',
      emptyIconColor: 'text-cyan-500/30',
      createBtn: 'bg-cyan-500/[0.04] border-cyan-500/15 hover:bg-cyan-500/[0.1] text-cyan-300/50 hover:text-cyan-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#020c14] via-[#020c14]/80',
      luckyGrad: 'linear-gradient(-45deg, #0284c7, #06b6d4, #0ea5e9, #06b6d4)',
      luckyGlow: 'rgba(56,189,248,0.4)',
      pillBg: 'bg-cyan-500/[0.08] border-cyan-500/[0.1]',
      waveColor: '#38bdf8',
    },
    cyberpunk: {
      mainBg: 'bg-[#0a0214]',
      gradientOrb1: '#c026d320',
      gradientOrb2: '#9333ea10',
      accentColor: '#e879f9',
      accentGlow: 'rgba(192,38,211,0.3)',
      sectionTitle: 'text-fuchsia-200/50',
      textMain: 'text-fuchsia-50',
      textMuted: 'text-fuchsia-200/40',
      cardBg: 'bg-fuchsia-900/[0.12] border-fuchsia-500/[0.1]',
      cardActive: 'border-fuchsia-400 border',
      btnNav: 'bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.18] text-fuchsia-100 border border-fuchsia-500/[0.12]',
      emptyIconBg: 'bg-fuchsia-900/20',
      emptyIconColor: 'text-fuchsia-500/30',
      createBtn: 'bg-fuchsia-500/[0.04] border-fuchsia-500/15 hover:bg-fuchsia-500/[0.1] text-fuchsia-300/50 hover:text-fuchsia-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#0a0214] via-[#0a0214]/80',
      luckyGrad: 'linear-gradient(-45deg, #c026d3, #9333ea, #e879f9, #9333ea)',
      luckyGlow: 'rgba(232,121,249,0.4)',
      pillBg: 'bg-fuchsia-500/[0.08] border-fuchsia-500/[0.1]',
      waveColor: '#e879f9',
    },
    midnight: {
      mainBg: 'bg-[#080514]',
      gradientOrb1: '#4c1d9520',
      gradientOrb2: '#312e8110',
      accentColor: '#a78bfa',
      accentGlow: 'rgba(124,58,237,0.25)',
      sectionTitle: 'text-violet-200/50',
      textMain: 'text-violet-50',
      textMuted: 'text-violet-200/40',
      cardBg: 'bg-violet-900/[0.12] border-violet-500/[0.1]',
      cardActive: 'border-violet-400 border',
      btnNav: 'bg-violet-500/[0.08] hover:bg-violet-500/[0.18] text-violet-100 border border-violet-500/[0.12]',
      emptyIconBg: 'bg-violet-900/20',
      emptyIconColor: 'text-violet-500/30',
      createBtn: 'bg-violet-500/[0.04] border-violet-500/15 hover:bg-violet-500/[0.1] text-violet-300/50 hover:text-violet-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#080514] via-[#080514]/80',
      luckyGrad: 'linear-gradient(-45deg, #4c1d95, #7c3aed, #a78bfa, #7c3aed)',
      luckyGlow: 'rgba(167,139,250,0.4)',
      pillBg: 'bg-violet-500/[0.08] border-violet-500/[0.1]',
      waveColor: '#a78bfa',
    },
    coffee: {
      mainBg: 'bg-[#0e0804]',
      gradientOrb1: '#92400e18',
      gradientOrb2: '#b4530908',
      accentColor: '#f59e0b',
      accentGlow: 'rgba(180,83,9,0.2)',
      sectionTitle: 'text-amber-200/50',
      textMain: 'text-amber-50',
      textMuted: 'text-amber-200/40',
      cardBg: 'bg-amber-900/[0.12] border-amber-600/[0.1]',
      cardActive: 'border-amber-400 border',
      btnNav: 'bg-amber-600/[0.08] hover:bg-amber-600/[0.18] text-amber-100 border border-amber-600/[0.12]',
      emptyIconBg: 'bg-amber-900/20',
      emptyIconColor: 'text-amber-600/30',
      createBtn: 'bg-amber-600/[0.04] border-amber-600/15 hover:bg-amber-600/[0.1] text-amber-300/50 hover:text-amber-200',
      blurBrightness: '0.25',
      blurFade: 'from-[#0e0804] via-[#0e0804]/80',
      luckyGrad: 'linear-gradient(-45deg, #92400e, #b45309, #f59e0b, #b45309)',
      luckyGlow: 'rgba(245,158,11,0.2)',
      pillBg: 'bg-amber-600/[0.08] border-amber-600/[0.1]',
      waveColor: '#f59e0b',
    },
  }

  const activeTheme = themeConfig[theme] || themeConfig['default']
  const {
    mainBg, textMain, textMuted, cardBg, cardActive, btnNav,
    emptyIconBg, emptyIconColor, createBtn, blurBrightness, sectionTitle,
    blurFade, luckyGrad, luckyGlow, accentColor, accentGlow,
    gradientOrb1, gradientOrb2, pillBg, waveColor
  } = activeTheme

  const quickPicksRef = useRef<HTMLDivElement>(null)
  const playlistsRef = useRef<HTMLDivElement>(null)
  const trendingRef = useRef<HTMLDivElement>(null)
  const listenAgainRef = useRef<HTMLDivElement>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const similarArtistRef = useRef<HTMLDivElement>(null)
  const similarTrackRef = useRef<HTMLDivElement>(null)
  const featuredMixesRef = useRef<HTMLDivElement>(null)
  const likedSongsScrollRef = useRef<HTMLDivElement>(null)

  const [showQPArrows, setShowQPArrows] = useState({ left: false, right: false })
  const [showPLArrows, setShowPLArrows] = useState({ left: false, right: false })
  const [showTrendingArrows, setShowTrendingArrows] = useState({ left: false, right: false })
  const [showListenArrows, setShowListenArrows] = useState({ left: false, right: false })
  const [showCatArrows, setShowCatArrows] = useState({ left: false, right: false })
  const [showSimArtistArrows, setShowSimArtistArrows] = useState({ left: false, right: false })
  const [showSimTrackArrows, setShowSimTrackArrows] = useState({ left: false, right: false })
  const [showMixArrows, setShowMixArrows] = useState({ left: false, right: false })
  const [showLikedArrows, setShowLikedArrows] = useState({ left: false, right: false })

  const [similarArtistTracks, setSimilarArtistTracks] = useState<any[]>([])
  const [similarTrackSongs, setSimilarTrackSongs] = useState<any[]>([])
  const [featuredMixes, setFeaturedMixes] = useState<FeaturedMix[]>([])

  const scrollCategory = async (catId: string, direction: 'left' | 'right') => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    const el = categoryRefs.current[catId]
    if (el) {
      el.scrollBy({
        left: direction === 'left' ? -500 : 500,
        behavior: reduceMotion ? 'auto' : 'smooth'
      })
    }
  }

  // Listen Again Tracks (History + Searches)
  const listenAgain = React.useMemo(() => {
    const map = new Map<string, any>()
    if (Array.isArray(playedHistory)) {
      playedHistory.forEach(s => {
        if (s && (s.id || s.title)) map.set(s.id || s.title, s)
      })
    }
    try {
      const recents = JSON.parse(localStorage.getItem('soundwave_recent_searches') || '[]')
      recents.forEach((r: any) => {
        if (r.type === 'song' && !map.has(r.id || r.title)) {
          map.set(r.id || r.title, r)
        }
      })
    } catch {}
    return Array.from(map.values()).slice(0, 15)
  }, [playedHistory])

  // Machine Learning User Affinity & Taste Profiler
  const tasteProfile = React.useMemo(() => {
    const recents = (() => {
      try {
        return JSON.parse(localStorage.getItem('soundwave_recent_searches') || '[]')
      } catch {
        return []
      }
    })()
    return detectUserAffinities(playedHistory, fullLibrary, recents, likedSongs)
  }, [playedHistory, fullLibrary, likedSongs])

  const lastAnalyzedKeyRef = useRef('')
  const fetchingCategoriesRef = useRef(new Set<string>())

  // Compute ML Similar Artists, Similar Tracks, and Featured Mixes
  useEffect(() => {
    const analysisKey = `${tasteProfile.topArtist}_${tasteProfile.topTrack?.id || ''}_${fullLibrary.length}_${trendingTracks.length}_${likedSongs.length}_${playedHistory.length}`
    if (analysisKey === lastAnalyzedKeyRef.current && analysisKey !== '__0_0_0_0') return
    lastAnalyzedKeyRef.current = analysisKey

    const allPool = Array.from(
      new Map([
        ...likedSongs,
        ...fullLibrary,
        ...trendingTracks,
        ...(categoryTracksMap['pop'] || []),
        ...(categoryTracksMap['chill'] || []),
        ...(categoryTracksMap['bollywood'] || []),
        ...(categoryTracksMap[selectedCategory] || [])
      ].map(s => [s.id || s.title, s])).values()
    )

    if (allPool.length === 0) return

    // 1. Featured Mixes
    const mixes = generateFeaturedMixes(tasteProfile, allPool, playedHistory, likedSongs)
    setFeaturedMixes(mixes)

    // 2. Similar to Artist
    if (tasteProfile.topArtist) {
      const poolArtist = allPool.filter(s => (s.artist || '').toLowerCase().includes(tasteProfile.topArtist.toLowerCase()))
      if (poolArtist.length >= 6) {
        setSimilarArtistTracks(poolArtist)
      } else {
        const queryKey = `${tasteProfile.topArtist}_artist_similar`
        if (!fetchingCategoriesRef.current.has(queryKey)) {
          fetchingCategoriesRef.current.add(queryKey)
          getCategoryTracks(`${tasteProfile.topArtist} songs hits`, 16).then(fetched => {
            if (fetched && fetched.length > 0) {
              const combined = Array.from(new Map([...poolArtist, ...fetched].map(s => [s.id || s.title, s])).values())
              setSimilarArtistTracks(combined)
            } else {
              setSimilarArtistTracks(poolArtist)
            }
          })
        }
      }
    }

    // 3. Similar to Top Track
    if (tasteProfile.topTrack) {
      const similar = generateSimilarToTrack(tasteProfile.topTrack, allPool, 16)
      if (similar.length >= 4) {
        setSimilarTrackSongs(similar)
      } else {
        const queryKey = `${tasteProfile.topTrack.title}_track_similar`
        if (!fetchingCategoriesRef.current.has(queryKey)) {
          fetchingCategoriesRef.current.add(queryKey)
          getCategoryTracks(`${tasteProfile.topTrack.title} ${tasteProfile.topTrack.artist || ''}`, 16).then(fetched => {
            if (fetched && fetched.length > 0) {
              setSimilarTrackSongs(fetched)
            } else {
              setSimilarTrackSongs(similar)
            }
          })
        }
      }
    }
  }, [tasteProfile.topArtist, tasteProfile.topTrack?.id, fullLibrary.length, trendingTracks.length, likedSongs.length])

  // Category Tracks Loader (Guarded against duplicate simultaneous fetches)
  useEffect(() => {
    if (selectedCategory === 'all') {
      ['chill', 'pop', 'bollywood'].forEach(catId => {
        const cat = MUSIC_CATEGORIES.find(c => c.id === catId)
        if (cat && !categoryTracksMap[catId] && !fetchingCategoriesRef.current.has(catId)) {
          fetchingCategoriesRef.current.add(catId)
          getCategoryTracks(cat.searchQuery, 15).then(tracks => {
            if (tracks && tracks.length > 0) {
              setCategoryTracksMap(prev => ({ ...prev, [catId]: tracks }))
            }
          })
        }
      })
      return
    }

    const cat = MUSIC_CATEGORIES.find(c => c.id === selectedCategory)
    if (!cat) return

    if (!categoryTracksMap[selectedCategory] && !fetchingCategoriesRef.current.has(selectedCategory)) {
      fetchingCategoriesRef.current.add(selectedCategory)
      setLoadingCategory(true)
      getCategoryTracks(cat.searchQuery, 25)
        .then(tracks => {
          if (tracks && tracks.length > 0) {
            setCategoryTracksMap(prev => ({ ...prev, [selectedCategory]: tracks }))
          }
        })
        .finally(() => setLoadingCategory(false))
    }
  }, [selectedCategory])

  // Start AI Smart Radio based on listener taste & mood
  const handleStartSmartRadio = async () => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}
    }
    const candidatePool = [
      ...fullLibrary,
      ...trendingTracks,
      ...(categoryTracksMap[selectedCategory] || []),
      ...(categoryTracksMap['pop'] || []),
      ...(categoryTracksMap['chill'] || [])
    ]
    const smartMix = generateSmartRecommendations(listenAgain, candidatePool, 25)
    if (smartMix.length > 0) {
      if (setQueue) setQueue(smartMix)
      playSong(smartMix[0])
    }
  }

  const handleShowLibrary = async () => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    setShowLibrary(true)
    setSelectedPlaylist(null)
    setShowPlaylistManager(false)
    setSidebarOpen(false)
  }

  const handleSelectPlaylist = async (id: string | null) => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    setSelectedPlaylist(id)
    if (id) {
      setShowLibrary(false)
      setShowPlaylistManager(false)
    }
  }

  const handleOpenPlaylistManager = async () => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    setShowPlaylistManager(true)
    setShowLibrary(false)
  }

  useEffect(() => {
    if (currentSong?.coverArtBase64) setBgImage(currentSong.coverArtBase64)
  }, [currentSong])

  useEffect(() => {
    const startupPrefs = localStorage.getItem('sw_startup_screen');
    if (startupPrefs === 'library') {
      setShowLibrary(true);
      setSidebarOpen(false);
    }
  }, []);

  const checkScroll = (element: HTMLDivElement | null, setArrows: React.Dispatch<React.SetStateAction<{ left: boolean, right: boolean }>>) => {
    if (!element) return
    const { scrollLeft, scrollWidth, clientWidth } = element
    const left = scrollLeft > 10
    const right = scrollLeft < (scrollWidth - clientWidth - 10)
    setArrows(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  const scrollContainer = async (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === 'left' ? -600 : 600,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      checkScroll(quickPicksRef.current, setShowQPArrows)
      checkScroll(playlistsRef.current, setShowPLArrows)
      checkScroll(trendingRef.current, setShowTrendingArrows)
      checkScroll(listenAgainRef.current, setShowListenArrows)
      checkScroll(categoryScrollRef.current, setShowCatArrows)
    }
    const timer = setTimeout(handleResize, 100)
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer) }
  }, [quickPicks, playlistsPreview, trendingTracks, listenAgain, categoryTracksMap])

  // Fetch Trending YouTube Music
  useEffect(() => {
    const loadTrending = async () => {
      try {
        const trending = await getTrendingYouTubeMusic();
        setTrendingTracks(trending);
      } catch (err) {
        console.error("Failed to load trending music:", err);
      }
    };
    loadTrending();
  }, []);

  useEffect(() => {
    const loadPlaylistName = async () => {
      if (!selectedPlaylist) { setPlaylistName(''); setLoadingPlaylist(false); return }
      setLoadingPlaylist(true)
      try {
        const playlistDoc = await getDoc(doc(db, 'playlists', selectedPlaylist))
        if (playlistDoc.exists()) setPlaylistName(playlistDoc.data().name || 'Untitled Playlist')
      } catch (error) {
        console.error('Error loading playlist:', error)
      } finally {
        setLoadingPlaylist(false)
      }
    }
    loadPlaylistName()
  }, [selectedPlaylist])

  useEffect(() => {
    if (!user?.id) return
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
  }, [user?.id])

  useEffect(() => {
    const fetchQuickPicks = async () => {
      if (!user?.id) return
      try {
        const globalUploadsRef = collection(db, 'users', user.id, 'uploads');
        const globalSnap = await getDocs(globalUploadsRef);
        const globalSongs = globalSnap.docs.map(doc => ({ id: doc.id, playlistId: 'global', ...doc.data() }));

        const playlistsSnap = await getDocs(query(collection(db, 'playlists'), where('userId', '==', user.id)))
        const songPromises = playlistsSnap.docs.map(async (pDoc) => {
          const songsSnap = await getDocs(collection(db, 'playlists', pDoc.id, 'songs'))
          return songsSnap.docs.map(sDoc => ({ id: sDoc.id, playlistId: pDoc.id, ...sDoc.data() }))
        })

        const playlistResults = await Promise.all(songPromises)
        const playlistSongs = playlistResults.flat()

        const uniqueSongsMap = new Map();
        [...globalSongs, ...playlistSongs].forEach(song => {
          if (song.url && !uniqueSongsMap.has(song.url)) uniqueSongsMap.set(song.url, song);
        });

        const combinedLibrary = Array.from(uniqueSongsMap.values());
        setFullLibrary(combinedLibrary);

        if (combinedLibrary.length > 0) {
          const shuffled = [...combinedLibrary].sort(() => 0.5 - Math.random())
          setQuickPicks(shuffled.slice(0, 10))
        } else if (trendingTracks.length > 0) {
          const shuffled = [...trendingTracks].sort(() => 0.5 - Math.random())
          setQuickPicks(shuffled.slice(0, 10))
        } else {
          setQuickPicks([])
        }
      } catch (err) {
        console.error("Error fetching quick picks:", err)
      }
    }
    fetchQuickPicks()
  }, [user?.id, selectedPlaylist, trendingTracks])

  const handleQuickPickClick = async (song: any) => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    const isThisSong = currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist);
    if (isThisSong) {
      if (isPlaying) pauseSong();
      else resumeSong();
    } else {
      const activeQueue = fullLibrary.length > 0 ? fullLibrary : (trendingTracks.length > 0 ? trendingTracks : [song]);
      if (setQueue) setQueue(activeQueue);
      playSong(song);
    }
  };

  const handleTryYourLuck = async () => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
    }
    const pool = fullLibrary.length > 0 ? fullLibrary : trendingTracks;
    if (pool.length > 0) {
      if (setQueue) setQueue(pool);
      const randomIndex = Math.floor(Math.random() * pool.length);
      playSong(pool[randomIndex]);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div className={`flex h-screen flex-col text-white overflow-hidden relative ${mainBg}`}>
      <Header user={user} />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { -webkit-font-smoothing: antialiased; }

        .sw-font-display { font-family: 'Syne', sans-serif; }
        .sw-font-body   { font-family: 'DM Sans', sans-serif; }

        ${!reduceMotion ? `
        @keyframes sw-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sw-luckyShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes sw-orb-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33%  { transform: translate3d(15px, -10px, 0) scale(1.03); }
          66%  { transform: translate3d(-10px, 8px, 0) scale(0.98); }
        }
        @keyframes sw-waveform {
          0%, 100% { transform: scaleY(0.3); }
          50%       { transform: scaleY(1); }
        }
        .sw-animate-enter {
          animation: sw-fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .sw-lucky-anim {
          background-size: 300% 300%;
          animation: sw-luckyShift 4s ease infinite;
        }
        .sw-orb { animation: sw-orb-float 10s ease-in-out infinite; will-change: transform; transform: translateZ(0); }
        .sw-orb-2 { animation: sw-orb-float 14s ease-in-out infinite reverse; will-change: transform; transform: translateZ(0); }
        .sw-card-hover {
          transition: transform 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        .sw-card-hover:hover {
          transform: translateY(-3px);
        }
        .sw-btn-hover {
          transition: transform 0.15s cubic-bezier(0.22,1,0.36,1);
        }
        .sw-btn-hover:hover { transform: scale(1.03); }
        .sw-btn-hover:active { transform: scale(0.97); }
        .sw-play-overlay {
          transition: opacity 0.15s ease;
        }
        .sw-waveform-bar {
          animation: sw-waveform 1s ease-in-out infinite;
          transform-origin: bottom;
        }
        ` : `
        .sw-animate-enter { opacity: 1; }
        .sw-lucky-anim { background-size: 300% 300%; }
        .sw-card-hover {}
        .sw-btn-hover {}
        .sw-play-overlay {}
        `}

        /* scrollbar */
        .sw-scroll::-webkit-scrollbar { display: none; }
        .sw-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* Hardware accelerated, lightweight card surface */
        .sw-card-surface {
          background-color: rgba(255, 255, 255, 0.035);
          transform: translateZ(0);
        }

        /* Glass container */
        .sw-glass {
          background-color: rgba(255, 255, 255, 0.035);
          transform: translateZ(0);
        }

        /* Section layout containment for smooth 60fps scrolling */
        .sw-section-contain {
          content-visibility: auto;
          contain-intrinsic-size: 260px;
          contain: content;
        }

        /* Sheen shimmer on active card */
        .sw-active-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
          pointer-events: none;
          border-radius: inherit;
        }
      `}</style>

      {/* Mobile sidebar toggle */}
      <button
        className={`hidden fixed top-[12px] left-3 z-50 p-3 rounded-xl sw-glass sw-btn-hover ${btnNav}`}
        onClick={() => setSidebarOpen(true)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          selectedPlaylist={selectedPlaylist}
          onSelectPlaylist={handleSelectPlaylist}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onShowLibrary={handleShowLibrary}
          onOpenSoundie={() => setSoundieOpen(true)}
          onOpenCreatePlaylist={handleOpenPlaylistManager}
        />

        <main className={`flex-1 flex flex-col overflow-hidden relative ${mainBg}`}>

          {/* ── AMBIENT BACKGROUND ── */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Album art blur blob */}
            <div
              key={bgImage}
              className={`absolute -top-20 -left-20 w-[140%] h-[70%] ${reduceMotion ? '' : 'transition-opacity duration-[800ms]'}`}
              style={{
                backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: `blur(40px) brightness(${blurBrightness}) saturate(160%)`,
                transform: 'scale(1.2) translateZ(0)',
                opacity: bgImage ? 0.8 : 0,
                contain: 'strict',
                willChange: 'opacity',
              }}
            />

            <div
  className="absolute inset-x-0 bottom-0 h-[50%] pointer-events-none"
  style={{
    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center bottom',
    filter: 'blur(4px) saturate(180%)',
    opacity: bgImage ? 0.3 : 0,
    transform: 'scale(1.3) translateY(-100px)',
    maskImage: `
      linear-gradient(
        to top,
        rgba(0,0,0,1) 0%,
        rgba(0,0,0,.65) 45%,
        rgba(0,0,0,0) 100%
      )
    `,
    WebkitMaskImage: `
      linear-gradient(
        to top,
        rgba(0,0,0,1) 0%,
        rgba(0,0,0,.65) 45%,
        rgba(0,0,0,0) 100%
      )
    `
  }}
/>
            
            <div className={`absolute inset-0 bg-gradient-to-b ${blurFade} to-transparent`} />

            {/* Decorative orbs (Hardware accelerated with translateZ) */}
            <div
              className="sw-orb absolute rounded-full pointer-events-none"
              style={{
                width: 420, height: 420,
                top: '-10%', right: '5%',
                background: `radial-gradient(circle, ${gradientOrb1} 0%, transparent 70%)`,
                filter: 'blur(40px)',
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            />
            <div
              className="sw-orb-2 absolute rounded-full pointer-events-none"
              style={{
                width: 300, height: 300,
                bottom: '20%', left: '-5%',
                background: `radial-gradient(circle, ${gradientOrb2} 0%, transparent 70%)`,
                filter: 'blur(50px)',
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            />

            {/* Subtle grid lines */}
            <div
  className={`absolute top-0 left-0 right-0 h-[80%] pointer-events-none ${reduceMotion ? '' : 'sw-grid-animated'}`}
  style={{
    opacity: 0.4,
    backgroundImage: `
      linear-gradient(${accentColor}22 1px, transparent 1px),
      linear-gradient(90deg, ${accentColor}22 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    maskImage: `
      linear-gradient(
        to bottom,
        rgba(0,0,0,1) 0%,
        rgba(0,0,0,.55) 60%,
        rgba(0,0,0,0) 100%
      )
    `,
    WebkitMaskImage: `
      linear-gradient(
        to bottom,
        rgba(0,0,0,1) 0%,
        rgba(0,0,0,.55) 60%,
        rgba(0,0,0,0) 100%
      )
    `
  }}
/>
          </div>

          {/* ── CONTENT ── */}
          <div className="relative z-10 flex flex-col h-full overflow-hidden">
            {showPlaylistManager ? (
              <div className="flex-1 flex flex-col mt-20 overflow-hidden">
                <PlaylistManager onBack={() => setShowPlaylistManager(false)} />
              </div>
            ) : showSettings ? (
              <div className="flex-1 flex flex-col mt-20 overflow-hidden">
                <AccountSettingsPage
                  user={user}
                  onBack={() => setShowSettings(false)}
                />
              </div>
            ) : showListenTogether ? (
              <div className="flex-1 flex flex-col mt-20 overflow-hidden">
                <ListenTogetherView
                  user={user}
                  onBack={() => setShowListenTogether(false)}
                />
              </div>
            ) : showLibrary ? (
              <Library />
            ) : selectedPlaylist ? (
              <div className="flex flex-col h-full overflow-hidden">
                <PlaylistWindow playlistId={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />
              </div>
            ) : activeArtistName ? (
              <div className="flex-1 flex flex-col mt-20 overflow-hidden">
                <ArtistProfileView
                  artistName={activeArtistName}
                  onBack={closeArtistProfile}
                  onSelectArtist={openArtistProfile}
                />
              </div>
            ) : activeDynamicPlaylist ? (
              <div className="flex-1 flex flex-col mt-20 overflow-hidden">
                <DynamicPlaylistView
                  playlist={activeDynamicPlaylist}
                  onBack={() => setActiveDynamicPlaylist(null)}
                  onSelectArtist={openArtistProfile}
                />
              </div>
            ) : searchQueryParam ? (
              <div className={`flex-1 flex flex-col mt-20 ${compactMode ? 'px-4 pt-6 md:px-6' : 'px-6 pt-8 md:px-10'} overflow-y-auto overflow-x-hidden sw-scroll`}>
                <SearchResultsView
                  queryText={searchQueryParam}
                  user={user}
                  onBack={() => setSearchParams({})}
                  onSelectArtist={openArtistProfile}
                  activeTheme={activeTheme}
                />
              </div>
            ) : (
              <div className={`flex-1 flex flex-col mt-20 ${compactMode ? 'px-4 pt-6 md:px-6' : 'px-6 pt-8 md:px-10'} overflow-y-auto overflow-x-hidden sw-scroll`}>
                {loadingPlaylists ? (
                  <div className="flex items-center justify-center mt-[85%] md:mt-[23%]  gap-3">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="sw-waveform-bar w-1.5 h-8 rounded-full"
                        style={{
                          background: accentColor,
                          animationDelay: `${i * 0.15}s`,
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full max-w-[1600px] mx-auto pb-28 space-y-10">

                    {/* ── GREETING & CATEGORY PILLS ── */}
                    <div className={`${animClass} sw-font-display space-y-4`} style={{ animationDelay: getDelay('0ms') }}>
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                          <p className={`text-[12px] uppercase tracking-[0.2em] mb-1 mt-4 font-bold ${sectionTitle} sw-font-body`}>
                            {getGreeting()}
                          </p>
                          <h1 className={`text-4xl md:text-3xl font-bold ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {user?.displayName || 'Stranger'}
                          </h1>
                        </div>

                        {currentSong && (
                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border sw-glass sw-font-body text-xs ${pillBg}`}
                            style={{ color: accentColor }}
                          >
                            {isPlaying ? (
                              <span className="flex gap-0.5 items-end h-3">
                                {[0, 1, 2, 3].map(i => (
                                  <span
                                    key={i}
                                    className="sw-waveform-bar inline-block w-0.5 rounded-full"
                                    style={{ background: accentColor, height: '100%', animationDelay: `${i * 0.12}s` }}
                                  />
                                ))}
                              </span>
                            ) : (
                              <Music size={12} />
                            )}
                            <span className="truncate max-w-[200px] font-bold">{currentSong.title} — {currentSong.artist}</span>
                          </div>
                        )}
                      </div>

                      {/* ── CATEGORY PILLS (Clean Icons, No Emojis) ── */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-2 sw-scroll scrollbar-hide">
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                            selectedCategory === 'all'
                              ? 'bg-white text-black shadow-lg scale-105'
                              : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                          }`}
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          <Sparkles size={14} />
                          <span>All Vibes</span>
                        </button>
                        {MUSIC_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                              selectedCategory === cat.id
                                ? 'bg-white text-black shadow-lg scale-105'
                                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                            }`}
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                          >
                            <CategoryIcon name={cat.iconName} size={14} />
                            <span>{cat.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── INSTANT VIBE STATION BANNER (Soundwave Dark Aesthetic) ── */}
                    {selectedCategory === 'all' && (
                      <section className={`${animClass}`} style={{ animationDelay: getDelay('60ms') }}>
                        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-xl group hover:border-white/20 transition-colors">
                          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-xl">
                              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                Instant Vibe Radio
                              </h2>
                              <p className="text-sm text-zinc-400 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                Algorithmic radio clustered by acoustic similarity, tempo, and your recent listening taste.
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={handleStartSmartRadio}
                                className="px-6 py-3.5 rounded-2xl bg-white text-black font-extrabold text-sm flex items-center gap-2.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                              >
                                <Play size={16} fill="currentColor" />
                                <span>Start Station</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* ── LISTEN AGAIN (Spotify / YouTube Music History) ── */}
                    {selectedCategory === 'all' && listenAgain.length > 0 && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('100ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Listen Again</h2>
                            <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Jump back into your recent tracks</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            {[
                              { dir: 'left' as const, show: showListenArrows.left, ref: listenAgainRef },
                              { dir: 'right' as const, show: showListenArrows.right, ref: listenAgainRef },
                            ].map(({ dir, show, ref }) => (
                              <button
                                key={dir}
                                onClick={() => scrollContainer(ref, dir)}
                                disabled={!show}
                                className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover
                                  ${!show ? 'opacity-20 cursor-default' : `${btnNav} cursor-pointer`}
                                `}
                              >
                                {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div
                          ref={listenAgainRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                          onScroll={() => checkScroll(listenAgainRef.current, setShowListenArrows)}
                        >
                          {listenAgain.map((song, index) => (
                            <DashboardSongCard
                              key={`listen_${song.id || index}`}
                              song={song}
                              index={index}
                              isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                              isPlaying={isPlaying}
                              cardWidth={cardWidth}
                              cardBg={cardBg}
                              cardActive={cardActive}
                              accentGlow={accentGlow}
                              emptyIconBg={emptyIconBg}
                              emptyIconColor={emptyIconColor}
                              textMain={textMain}
                              textMuted={textMuted}
                              animClass={animClass}
                              reduceMotion={reduceMotion}
                              onPlay={(s) => {
                                if (setQueue) setQueue(listenAgain)
                                playSong(s)
                              }}
                              onPause={pauseSong}
                              onResume={resumeSong}
                              onQueue={handleQueueSong}
                              onOpenArtist={openArtistProfile}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── QUICK PICKS ── */}
                    {selectedCategory === 'all' && quickPicks.length > 0 && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('140ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Quick Picks</h2>
                            <p className={`text-[12px] sm:text-[13px] mt-1 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Curated mix of your tracks</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            {[
                              { dir: 'left' as const, show: showQPArrows.left, ref: quickPicksRef },
                              { dir: 'right' as const, show: showQPArrows.right, ref: quickPicksRef },
                            ].map(({ dir, show, ref }) => (
                              <button
                                key={dir}
                                onClick={() => scrollContainer(ref, dir)}
                                disabled={!show}
                                className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover
                                  ${!show ? 'opacity-20 cursor-default' : `${btnNav} cursor-pointer`}
                                `}
                              >
                                {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div
                          ref={quickPicksRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                          onScroll={() => checkScroll(quickPicksRef.current, setShowQPArrows)}
                        >
                          {/* Try Your Luck */}
                          <div
                            className={`flex-shrink-0 ${cardWidth} snap-start cursor-pointer group sw-card-hover ${animClass}`}
                            style={{ animationDelay: getDelay('160ms'), contain: 'content' }}
                            onClick={handleTryYourLuck}
                          >
                            <div
                              className="aspect-square relative rounded-2xl overflow-hidden mb-2.5 sw-lucky-anim"
                              style={{ background: luckyGrad, boxShadow: `0 8px 32px ${luckyGlow}` }}
                            >
                              <div className={`aspect-square relative rounded-xl md:rounded-2xl overflow-hidden mb-3 flex flex-col items-center justify-center text-center p-4 `}>
                                <Dices className={`w-28 h-28 opacity-40 mb-2 drop-shadow-lg`} />
                                <div className={`absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 ${reduceMotion ? '' : 'transition-opacity'} flex items-center justify-center`}>
                                  <Play className="w-10 h-10 text-white fill-white" />
                                </div>
                              </div>
                            </div>
                            <h4 className={`font-semibold text-[14px] truncate sw-font-display ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Shuffle All</h4>
                            <p className={`text-[12px] truncate sw-font-body ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Surprise selection</p>
                          </div>

                          {/* Quick Pick Songs */}
                          {quickPicks.map((song, index) => (
                            <DashboardSongCard
                              key={song.id}
                              song={song}
                              index={index}
                              isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                              isPlaying={isPlaying}
                              cardWidth={cardWidth}
                              cardBg={cardBg}
                              cardActive={cardActive}
                              accentGlow={accentGlow}
                              emptyIconBg={emptyIconBg}
                              emptyIconColor={emptyIconColor}
                              textMain={textMain}
                              textMuted={textMuted}
                              animClass={animClass}
                              reduceMotion={reduceMotion}
                              isLiked={isSongLiked(song)}
                              isInQueue={upNextQueue?.some(s => s.id === song.id)}
                              onPlay={handleQuickPickClick}
                              onPause={pauseSong}
                              onResume={resumeSong}
                              onLike={(_e, s) => toggleLikeSong(s)}
                              onQueue={handleQueueSong}
                              onAddToPlaylist={setSelectedSongForPlaylist}
                              onDownload={async (s) => {
                                try {
                                  await downloadSongForOffline(s)
                                  alert(`Downloaded "${s.title}" for offline playback!`)
                                } catch {
                                  alert('Failed to download track.')
                                }
                              }}
                              onOpenArtist={openArtistProfile}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── SONGS YOU LOVE (Liked Songs Carousel) ── */}
                    {selectedCategory === 'all' && likedSongs.length > 0 && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('170ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                              <Heart size={18} className={`${accentColor} fill-current shrink-0`} />
                              <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate max-w-[calc(100vw-120px)] sm:max-w-none ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                Songs You Love
                              </h2>
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-white/10 text-white/90 border border-white/15">
                                {likedSongs.length} Liked
                              </span>
                            </div>
                            <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              Your favorite saved tracks and heart picks
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => scrollContainer(likedSongsScrollRef, 'left')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={() => scrollContainer(likedSongsScrollRef, 'right')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={likedSongsScrollRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                        >
                          {likedSongs.map((song, index) => (
                            <DashboardSongCard
                              key={`liked-${song.id}-${index}`}
                              song={song}
                              index={index}
                              isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                              isPlaying={isPlaying}
                              cardWidth={cardWidth}
                              cardBg={cardBg}
                              cardActive={cardActive}
                              accentGlow={accentGlow}
                              emptyIconBg={emptyIconBg}
                              emptyIconColor={emptyIconColor}
                              textMain={textMain}
                              textMuted={textMuted}
                              animClass={animClass}
                              reduceMotion={reduceMotion}
                              isLiked={true}
                              isInQueue={upNextQueue?.some(s => s.id === song.id)}
                              onPlay={(s) => {
                                if (setQueue) setQueue(likedSongs)
                                playSong(s)
                              }}
                              onPause={pauseSong}
                              onResume={resumeSong}
                              onLike={(_e, s) => toggleLikeSong(s)}
                              onQueue={handleQueueSong}
                              onAddToPlaylist={setSelectedSongForPlaylist}
                              onDownload={async (s) => {
                                try {
                                  await downloadSongForOffline(s)
                                  alert(`Downloaded "${s.title}" for offline playback!`)
                                } catch {
                                  alert('Failed to download track.')
                                }
                              }}
                              onOpenArtist={openArtistProfile}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── FEATURED FOR YOU (ML Curated Mixes) ── */}
                    {selectedCategory === 'all' && featuredMixes.length > 0 && (
                      <section className={`${animClass}`} style={{ animationDelay: getDelay('180ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              Featured For You
                            </h2>
                            <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              Personalized mixes tailored to your listening taste
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => scrollContainer(featuredMixesRef, 'left')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={() => scrollContainer(featuredMixesRef, 'right')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={featuredMixesRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                        >
                          {featuredMixes.map((mix, mIdx) => (
                            <div
                              key={mix.id}
                              className={`flex-shrink-0 ${cardWidth} snap-start cursor-pointer group sw-card-hover ${animClass}`}
                              style={{ animationDelay: getDelay(`${200 + mIdx * 40}ms`) }}
                              onClick={() => {
                                setActiveDynamicPlaylist(mix);
                              }}
                            >
                              <div
                                className="aspect-square relative rounded-2xl overflow-hidden mb-2.5 border border-white/10 bg-white/[0.04] sw-glass group-hover:border-white/20 transition-all"
                              >
                                {mix.sampleCovers.length >= 4 ? (
                                  <div className="grid grid-cols-2 w-full h-full">
                                    {mix.sampleCovers.slice(0, 4).map((c, i) => (
                                      <img key={i} src={c} alt="" className="w-full h-full object-cover" />
                                    ))}
                                  </div>
                                ) : mix.sampleCovers.length > 0 ? (
                                  <img src={mix.sampleCovers[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                                    <Music className="w-10 h-10 text-white/30" />
                                  </div>
                                )}

                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white/90 border border-white/15">
                                    {mix.badge}
                                  </span>
                                  <span className="text-[10px] font-mono text-white/70 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                                    {mix.songs.length}
                                  </span>
                                </div>

                                <div className="sw-play-overlay absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (mix.songs.length > 0) {
                                        if (setQueue) setQueue(mix.songs);
                                        playSong(mix.songs[0]);
                                      }
                                    }}
                                    className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
                                  >
                                    <Play size={18} fill="currentColor" className="ml-0.5" />
                                  </button>
                                </div>
                              </div>

                              <h4 className={`font-bold truncate text-[14px] sw-font-display ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {mix.title}
                              </h4>
                              <p className={`text-[12px] truncate sw-font-body ${textMuted} mt-0.5`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {mix.subtitle}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── SIMILAR TO TOP ARTIST ── */}
                    {selectedCategory === 'all' && tasteProfile.topArtist && similarArtistTracks.length > 0 && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('220ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                              <Music2 size={18} className="text-indigo-400 shrink-0" />
                              <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate max-w-[calc(100vw-120px)] sm:max-w-none ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                Similar to{' '}
                                <span
                                  onClick={() => openArtistProfile(tasteProfile.topArtist)}
                                  className="hover:underline hover:text-white cursor-pointer transition-colors"
                                >
                                  {tasteProfile.topArtist}
                                </span>
                              </h2>
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                ML Match
                              </span>
                            </div>
                            <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              Artists and tracks matching your interest in {tasteProfile.topArtist}
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => scrollContainer(similarArtistRef, 'left')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={() => scrollContainer(similarArtistRef, 'right')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={similarArtistRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                        >
                          {similarArtistTracks.map((song, index) => (
                            <DashboardSongCard
                              key={`sim_art_${song.id || index}`}
                              song={song}
                              index={index}
                              isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                              isPlaying={isPlaying}
                              cardWidth={cardWidth}
                              cardBg={cardBg}
                              cardActive={cardActive}
                              accentGlow={accentGlow}
                              emptyIconBg={emptyIconBg}
                              emptyIconColor={emptyIconColor}
                              textMain={textMain}
                              textMuted={textMuted}
                              animClass={animClass}
                              reduceMotion={reduceMotion}
                              isLiked={isSongLiked(song)}
                              isInQueue={upNextQueue?.some(s => s.id === song.id)}
                              onPlay={(s) => {
                                if (setQueue) setQueue(similarArtistTracks)
                                playSong(s)
                              }}
                              onPause={pauseSong}
                              onResume={resumeSong}
                              onLike={(_e, s) => toggleLikeSong(s)}
                              onQueue={handleQueueSong}
                              onAddToPlaylist={setSelectedSongForPlaylist}
                              onDownload={async (s) => {
                                try {
                                  await downloadSongForOffline(s)
                                  alert(`Downloaded "${s.title}" for offline playback!`)
                                } catch {
                                  alert('Failed to download track.')
                                }
                              }}
                              onOpenArtist={openArtistProfile}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── SIMILAR TO TOP TRACK ── */}
                    {selectedCategory === 'all' && tasteProfile.topTrack && similarTrackSongs.length > 0 && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('240ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                              <Radio size={18} className="text-purple-400 shrink-0" />
                              <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate max-w-[calc(100vw-120px)] sm:max-w-none ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                Similar to {tasteProfile.topTrack.title}
                              </h2>
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Acoustic Vector
                              </span>
                            </div>
                            <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              Mood and tempo continuations from your top played song
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => scrollContainer(similarTrackRef, 'left')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={() => scrollContainer(similarTrackRef, 'right')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={similarTrackRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                        >
                          {similarTrackSongs.map((song, index) => (
                            <DashboardSongCard
                              key={`sim_trk_${song.id || index}`}
                              song={song}
                              index={index}
                              isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                              isPlaying={isPlaying}
                              cardWidth={cardWidth}
                              cardBg={cardBg}
                              cardActive={cardActive}
                              accentGlow={accentGlow}
                              emptyIconBg={emptyIconBg}
                              emptyIconColor={emptyIconColor}
                              textMain={textMain}
                              textMuted={textMuted}
                              animClass={animClass}
                              reduceMotion={reduceMotion}
                              isLiked={isSongLiked(song)}
                              isInQueue={upNextQueue?.some(s => s.id === song.id)}
                              onPlay={(s) => {
                                if (setQueue) setQueue(similarTrackSongs)
                                playSong(s)
                              }}
                              onPause={pauseSong}
                              onResume={resumeSong}
                              onLike={(_e, s) => toggleLikeSong(s)}
                              onQueue={handleQueueSong}
                              onAddToPlaylist={setSelectedSongForPlaylist}
                              onDownload={async (s) => {
                                try {
                                  await downloadSongForOffline(s)
                                  alert(`Downloaded "${s.title}" for offline playback!`)
                                } catch {
                                  alert('Failed to download track.')
                                }
                              }}
                              onOpenArtist={openArtistProfile}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── PLAYLISTS ── */}
                    {selectedCategory === 'all' && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('200ms') }}>
                        <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                          <div className="min-w-0 flex-1">
                            <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Your Playlists</h2>
                            <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{playlistsPreview.length} collection{playlistsPreview.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            {[
                              { dir: 'left' as const, show: showPLArrows.left },
                              { dir: 'right' as const, show: showPLArrows.right },
                            ].map(({ dir, show }) => (
                              <button
                                key={dir}
                                onClick={() => scrollContainer(playlistsRef, dir)}
                                disabled={!show}
                                className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover
                                  ${!show ? 'opacity-20 cursor-default' : `${btnNav} cursor-pointer`}
                                `}
                              >
                                {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div
                          ref={playlistsRef}
                          className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                          onScroll={() => checkScroll(playlistsRef.current, setShowPLArrows)}
                        >
                          {playlistsPreview.map((playlist, index) => {
                            const delay = 220 + (index * 40) + 'ms';
                            const isActive = selectedPlaylist === playlist.id;
                            return (
                              <div
                                key={playlist.id}
                                className={`flex-shrink-0 ${cardWidth} snap-start cursor-pointer group sw-card-hover ${animClass}`}
                                style={{ animationDelay: getDelay(delay), contain: 'content' }}
                                onClick={() => handleSelectPlaylist(playlist.id)}
                              >
                                <div
                                  className={`aspect-square relative rounded-2xl overflow-hidden mb-2.5 border sw-card-surface ${isActive ? `${cardActive} sw-active-sheen` : cardBg}`}
                                  style={isActive ? { boxShadow: `0 0 20px ${accentGlow}, 0 4px 16px rgba(0,0,0,0.3)` } : {}}
                                >
                                  {playlist.coverArtBase64 ? (
                                    <img src={playlist.coverArtBase64} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${emptyIconBg}`}>
                                      <Music className={`w-10 h-10 ${emptyIconColor}`} />
                                    </div>
                                  )}
                                  <div className="sw-play-overlay absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <div className="w-11 h-11 rounded-xl bg-black/30 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                                    </div>
                                  </div>
                                </div>
                                <h3 className={`font-semibold truncate text-[14px] sw-font-display ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{playlist.name}</h3>
                                <p className={`text-[12px] sw-font-body ${textMuted}`}>Playlist</p>
                              </div>
                            );
                          })}

                          {/* Create Playlist */}
                          <button
                            onClick={handleOpenPlaylistManager}
                            className={`flex-shrink-0 ${cardWidth} rounded-2xl snap-start aspect-square border border-dashed flex flex-col items-center justify-center group sw-card-hover sw-card-surface ${createBtn} ${animClass}`}
                            style={{ animationDelay: getDelay(`${220 + (playlistsPreview.length * 40)}ms`), contain: 'content' }}
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border border-dashed border-current opacity-40 group-hover:opacity-70 transition-opacity">
                              <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-[12px] font-medium sw-font-display opacity-60 group-hover:opacity-90 transition-opacity" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>New Playlist</span>
                          </button>
                        </div>
                      </section>
                    )}

                    {/* ── DYNAMIC CATEGORY VIEW (When a single category is active) ── */}
                    {selectedCategory !== 'all' && (
                      <section className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay('100ms') }}>
                        {(() => {
                          const currentCat = MUSIC_CATEGORIES.find(c => c.id === selectedCategory);
                          const tracks = categoryTracksMap[selectedCategory] || [];
                          return (
                            <div className="space-y-6">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/[0.03] border border-white/10">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-white/10 text-white flex items-center justify-center">
                                      <CategoryIcon name={currentCat?.iconName || 'compass'} size={20} />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                      {currentCat?.title}
                                    </h2>
                                  </div>
                                  <p className="text-sm text-zinc-400 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                    {currentCat?.subtitle}
                                  </p>
                                </div>
                                {tracks.length > 0 && (
                                  <button
                                    onClick={() => {
                                      if (setQueue) setQueue(tracks);
                                      playSong(tracks[0]);
                                    }}
                                    className="px-6 py-3 rounded-2xl bg-white text-black font-extrabold text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-transform cursor-pointer"
                                  >
                                    <Play size={16} fill="currentColor" /> Play Category Station
                                  </button>
                                )}
                              </div>

                              {loadingCategory ? (
                                <div className="p-12 text-center text-zinc-500 font-bold uppercase tracking-widest animate-pulse text-xs">
                                  Curating {currentCat?.title} tracks...
                                </div>
                              ) : tracks.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {tracks.map((song, index) => (
                                    <DashboardSongCard
                                      key={song.id || index}
                                      song={song}
                                      index={index}
                                      isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                                      isPlaying={isPlaying}
                                      cardWidth="w-full"
                                      cardBg={cardBg}
                                      cardActive={cardActive}
                                      accentGlow={accentGlow}
                                      emptyIconBg={emptyIconBg}
                                      emptyIconColor={emptyIconColor}
                                      textMain={textMain}
                                      textMuted={textMuted}
                                      animClass={animClass}
                                      reduceMotion={reduceMotion}
                                      isLiked={isSongLiked(song)}
                                      isInQueue={upNextQueue?.some(s => s.id === song.id)}
                                      onPlay={(s) => {
                                        if (setQueue) setQueue(tracks)
                                        playSong(s)
                                      }}
                                      onPause={pauseSong}
                                      onResume={resumeSong}
                                      onLike={(_e, s) => toggleLikeSong(s)}
                                      onQueue={handleQueueSong}
                                      onAddToPlaylist={setSelectedSongForPlaylist}
                                      onDownload={async (s) => {
                                        try {
                                          await downloadSongForOffline(s)
                                          alert(`Downloaded "${s.title}" for offline playback!`)
                                        } catch {
                                          alert('Failed to download track.')
                                        }
                                      }}
                                      onOpenArtist={openArtistProfile}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="p-12 text-center text-zinc-500 text-sm">No tracks found for this category.</div>
                              )}
                            </div>
                          );
                        })()}
                      </section>
                    )}

                    {/* ── HOME MOOD & GENRE CAROUSELS (When "All" is active) ── */}
                    {selectedCategory === 'all' && (
                      <div className="space-y-10">
                        {['chill', 'pop', 'bollywood'].map((catId, catIdx) => {
                          const cat = MUSIC_CATEGORIES.find(c => c.id === catId);
                          const tracks = categoryTracksMap[catId] || [];
                          if (!cat || tracks.length === 0) return null;
                          return (
                            <section key={catId} className={`sw-section-contain ${animClass}`} style={{ animationDelay: getDelay(`${260 + catIdx * 40}ms`) }}>
                              <div className={`flex items-center justify-between gap-3 ${compactMode ? 'mb-3' : 'mb-4 md:mb-5'}`}>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                    <CategoryIcon name={cat.iconName} size={18} className="text-indigo-400 shrink-0" />
                                    <h2 className={`text-lg sm:text-xl md:text-[22px] font-bold sw-font-display truncate max-w-[calc(100vw-120px)] sm:max-w-none ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                      {cat.title}
                                    </h2>
                                  </div>
                                  <p className={`text-[12px] sm:text-[13px] mt-0.5 sw-font-body truncate ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                    {cat.subtitle}
                                  </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => scrollCategory(catId, 'left')}
                                    title="Previous"
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                  <button
                                    onClick={() => scrollCategory(catId, 'right')}
                                    title="Next"
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center sw-glass sw-btn-hover ${btnNav} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </div>
                              </div>

                              <div
                                ref={(el) => { categoryRefs.current[catId] = el; }}
                                className={`flex ${gridGap} overflow-x-auto pb-4 sw-scroll sw-scroll-row snap-x ${!reduceMotion ? 'scroll-smooth' : ''}`}
                              >
                                {tracks.map((song, index) => (
                                  <DashboardSongCard
                                    key={song.id || index}
                                    song={song}
                                    index={index}
                                    isActive={currentSong?.id === song.id || (currentSong?.title === song.title && currentSong?.artist === song.artist)}
                                    isPlaying={isPlaying}
                                    cardWidth={cardWidth}
                                    cardBg={cardBg}
                                    cardActive={cardActive}
                                    accentGlow={accentGlow}
                                    emptyIconBg={emptyIconBg}
                                    emptyIconColor={emptyIconColor}
                                    textMain={textMain}
                                    textMuted={textMuted}
                                    animClass={animClass}
                                    reduceMotion={reduceMotion}
                                    isLiked={isSongLiked(song)}
                                    isInQueue={upNextQueue?.some(s => s.id === song.id)}
                                    onPlay={(s) => {
                                      if (setQueue) setQueue(tracks)
                                      playSong(s)
                                    }}
                                    onPause={pauseSong}
                                    onResume={resumeSong}
                                    onLike={(_e, s) => toggleLikeSong(s)}
                                    onQueue={handleQueueSong}
                                    onAddToPlaylist={setSelectedSongForPlaylist}
                                    onDownload={async (s) => {
                                      try {
                                        await downloadSongForOffline(s)
                                        alert(`Downloaded "${s.title}" for offline playback!`)
                                      } catch {
                                        alert('Failed to download track.')
                                      }
                                    }}
                                    onOpenArtist={openArtistProfile}
                                  />
                                ))}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    )}

                    {/* ── FOOTER WORDMARK ── */}
                    <div className={`pt-6 pb-2 ${animClass}`} style={{ animationDelay: getDelay('400ms') }}>
                      <p className="sw-font-display font-extrabold text-[45px] lg:text-[50px] leading-none opacity-10" style={{ color: `${accentColor}`, fontFamily: 'Cabin, sans-serif' }}>
                        Soundwave
                      </p>
                      <p className="sw-font-body text-[20px] font-extrabold opacity-10" style={{ color: `${accentColor}`, fontFamily: 'Space Grotesk, sans-serif' }}>
                        by LonewolfFSD
                      </p>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {currentSong && <Player />}
      <SoundieAssistant isOpen={soundieOpen} onClose={() => setSoundieOpen(false)} />
      
      {/* Add To Playlist Modal */}
      {selectedSongForPlaylist && (
        <AddToPlaylistModal
          isOpen={!!selectedSongForPlaylist}
          song={selectedSongForPlaylist}
          onClose={() => setSelectedSongForPlaylist(null)}
        />
      )}

      {/* Floating Queue Toast Feedback */}
      {queueToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-indigo-500/40 text-white px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
            <Check size={12} strokeWidth={3} />
          </div>
          <span className="text-xs font-bold truncate max-w-xs sm:max-w-md" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {queueToast}
          </span>
        </div>
      )}
    </div>
  )
}

export default Dashboard