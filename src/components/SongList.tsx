import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { db } from '../utils/firebase'
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  increment,
  orderBy,
} from 'firebase/firestore'
import { 
  Play, 
  Pause,
  Music, 
  MoreHorizontal, 
  Plus, 
  Download,
  XCircle,
  Edit3,
  Loader2,
  Trash2,
  Search,
  RefreshCw,
  Check,
  UploadCloud
} from 'lucide-react'
import type { Song } from '../context/PlayerContext'
import { searchYouTubeMusic, getTrendingYouTubeMusic } from '../utils/ytMusic'
import { fetchArtistProfile } from '../utils/artistService'

import SongUpload from './SongUpload'
import { Capacitor } from '@capacitor/core';

interface SongListProps {
  playlistId: string | null
}

interface PlaylistData {
  name: string
  description?: string
  coverArtBase64?: string | null
  userId?: string
}

const SongList: React.FC<SongListProps> = ({ playlistId }) => {
  const { user } = useAuth()
  const { playSong, pauseSong, setQueue, currentSong, isPlaying } = usePlayer()
  
  const [songs, setSongs] = useState<Song[]>([])
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false) 

  const [isEditing, setIsEditing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  const [activeSongMenu, setActiveSongMenu] = useState<string | null>(null);
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Spotify-style Playlist Recommendations & Search State
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [searching, setSearching] = useState(false)
  const [addingSongId, setAddingSongId] = useState<string | null>(null)
  const [addedSongIds, setAddedSongIds] = useState<Set<string>>(new Set())

  const menuRef = useRef<HTMLDivElement>(null)
  const songMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const recSectionRef = useRef<HTMLDivElement>(null)

  // --- PREFERENCES & THEME STATE ---
  const [theme, setTheme] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    // If native, use their preference; if web, force 'default'
    return isNative ? (localStorage.getItem('soundwave_theme') || 'default') : 'default';
  });
  
  const [compactMode, setCompactMode] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    return isNative ? (localStorage.getItem('sw_compact_mode') === 'true') : false;
  });

  // Reduce motion active for all platforms
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true')

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    const handleThemeUpdate = () => {
      // Removed the isNative check that was forcing 'default' on web
      setTheme(localStorage.getItem('soundwave_theme') || 'default');
    };

    const handleSettingsUpdate = () => {
      // Allow Reduce Motion to update on all platforms
      setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true');

      // 🔥 Lock Compact Mode to 'false' on the web
      if (isNative) {
        setCompactMode(localStorage.getItem('sw_compact_mode') === 'true');
      } else {
        setCompactMode(false);
      }
    };

    // Run immediately on mount to ensure the lock is active
    handleThemeUpdate();
    handleSettingsUpdate();

    window.addEventListener('theme-change', handleThemeUpdate);
    window.addEventListener('sw-settings-updated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate);
      window.removeEventListener('sw-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const themeConfig: Record<string, any> = {
    default: { textMain: 'text-white', textMuted: 'text-gray-400', primaryBtn: 'bg-indigo-500 text-white', activeText: 'text-green-500', menuBg: 'bg-zinc-900 border-white/10', menuHover: 'hover:bg-white/10', hoverRow: 'hover:bg-white/5', activeRow: 'bg-white/10', btnOutline: 'border-white/20 hover:border-white text-gray-300 hover:text-white', spinner: 'text-indigo-500', overlayFade: 'bg-black/20', stickyBg: 'bg-black/40 border-white/5', editBg: 'bg-black/40 border-white/10', emptyIconColor: 'text-zinc-600', inputBg: 'bg-white/10 border-white/20 focus:border-indigo-500' },
    sunset: { textMain: 'text-orange-50', textMuted: 'text-orange-200/60', primaryBtn: 'bg-orange-600 text-white', activeText: 'text-orange-400', menuBg: 'bg-[#2a0808] border-orange-500/20', menuHover: 'hover:bg-orange-500/20', hoverRow: 'hover:bg-orange-500/10', activeRow: 'bg-orange-500/20', btnOutline: 'border-orange-500/30 hover:border-orange-400 text-orange-200 hover:text-orange-100', spinner: 'text-orange-500', overlayFade: 'bg-[#1a0502]/40', stickyBg: 'bg-[#1a0502]/60 border-orange-500/20', editBg: 'bg-[#1a0502]/60 border-orange-500/20', emptyIconColor: 'text-orange-500/50', inputBg: 'bg-black/40 border-orange-500/30 focus:border-orange-400' },
    valentine: { textMain: 'text-pink-50', textMuted: 'text-pink-200/60', primaryBtn: 'bg-pink-600 text-white', activeText: 'text-pink-400', menuBg: 'bg-[#330a1a] border-pink-500/20', menuHover: 'hover:bg-pink-500/20', hoverRow: 'hover:bg-pink-500/10', activeRow: 'bg-pink-500/20', btnOutline: 'border-pink-500/30 hover:border-pink-400 text-pink-200 hover:text-pink-100', spinner: 'text-pink-500', overlayFade: 'bg-[#1f0610]/40', stickyBg: 'bg-[#1f0610]/60 border-pink-500/20', editBg: 'bg-[#1f0610]/60 border-pink-500/20', emptyIconColor: 'text-pink-500/50', inputBg: 'bg-black/40 border-pink-500/30 focus:border-pink-400' },
    jungle: { textMain: 'text-emerald-50', textMuted: 'text-emerald-200/60', primaryBtn: 'bg-emerald-600 text-white', activeText: 'text-emerald-400', menuBg: 'bg-[#062414] border-emerald-500/20', menuHover: 'hover:bg-emerald-500/20', hoverRow: 'hover:bg-emerald-500/10', activeRow: 'bg-emerald-500/20', btnOutline: 'border-emerald-500/30 hover:border-emerald-400 text-emerald-200 hover:text-emerald-100', spinner: 'text-emerald-500', overlayFade: 'bg-[#03170b]/40', stickyBg: 'bg-[#03170b]/60 border-emerald-500/20', editBg: 'bg-[#03170b]/60 border-emerald-500/20', emptyIconColor: 'text-emerald-500/50', inputBg: 'bg-black/40 border-emerald-500/30 focus:border-emerald-400' },
    ocean: { textMain: 'text-cyan-50', textMuted: 'text-cyan-200/60', primaryBtn: 'bg-cyan-600/90 text-white', activeText: 'text-cyan-400', menuBg: 'bg-[#061a29] border-cyan-500/20', menuHover: 'hover:bg-cyan-500/20', hoverRow: 'hover:bg-cyan-500/10', activeRow: 'bg-cyan-500/20', btnOutline: 'border-cyan-500/30 hover:border-cyan-400 text-cyan-200 hover:text-cyan-100', spinner: 'text-cyan-500', overlayFade: 'bg-[#04121c]/40', stickyBg: 'bg-[#04121c]/60 border-cyan-500/20', editBg: 'bg-[#04121c]/60 border-cyan-500/20', emptyIconColor: 'text-cyan-500/50', inputBg: 'bg-black/40 border-cyan-500/30 focus:border-cyan-400' },
    cyberpunk: { textMain: 'text-fuchsia-50', textMuted: 'text-fuchsia-200/60', primaryBtn: 'bg-fuchsia-600 text-white', activeText: 'text-fuchsia-400', menuBg: 'bg-[#22063b] border-fuchsia-500/20', menuHover: 'hover:bg-fuchsia-500/20', hoverRow: 'hover:bg-fuchsia-500/10', activeRow: 'bg-fuchsia-500/20', btnOutline: 'border-fuchsia-500/30 hover:border-fuchsia-400 text-fuchsia-200 hover:text-fuchsia-100', spinner: 'text-fuchsia-500', overlayFade: 'bg-[#120322]/40', stickyBg: 'bg-[#120322]/60 border-fuchsia-500/20', editBg: 'bg-[#120322]/60 border-fuchsia-500/20', emptyIconColor: 'text-fuchsia-500/50', inputBg: 'bg-black/40 border-fuchsia-500/30 focus:border-fuchsia-400' },
    midnight: { textMain: 'text-violet-50', textMuted: 'text-violet-200/60', primaryBtn: 'bg-violet-600 text-white', activeText: 'text-violet-400', menuBg: 'bg-[#1a0c30] border-violet-500/20', menuHover: 'hover:bg-violet-500/20', hoverRow: 'hover:bg-violet-500/10', activeRow: 'bg-violet-500/20', btnOutline: 'border-violet-500/30 hover:border-violet-400 text-violet-200 hover:text-violet-100', spinner: 'text-violet-500', overlayFade: 'bg-[#0f071c]/40', stickyBg: 'bg-[#0f071c]/60 border-violet-500/20', editBg: 'bg-[#0f071c]/60 border-violet-500/20', emptyIconColor: 'text-violet-500/50', inputBg: 'bg-black/40 border-violet-500/30 focus:border-violet-400' },
    coffee: { textMain: 'text-amber-50', textMuted: 'text-amber-200/60', primaryBtn: 'bg-amber-600 text-white', activeText: 'text-amber-400', menuBg: 'bg-[#26150a] border-amber-600/20', menuHover: 'hover:bg-amber-600/20', hoverRow: 'hover:bg-amber-600/10', activeRow: 'bg-amber-600/20', btnOutline: 'border-amber-600/30 hover:border-amber-500 text-amber-200 hover:text-amber-100', spinner: 'text-amber-500', overlayFade: 'bg-[#140c06]/40', stickyBg: 'bg-[#140c06]/60 border-amber-600/20', editBg: 'bg-[#140c06]/60 border-amber-600/20', emptyIconColor: 'text-amber-600/50', inputBg: 'bg-black/40 border-amber-600/30 focus:border-amber-600' }
  }

  const activeTheme = themeConfig[theme] || themeConfig['default']
  const { 
    textMain, textMuted, primaryBtn, activeText, menuBg, 
    menuHover, hoverRow, activeRow, btnOutline, spinner, 
    overlayFade, stickyBg, editBg, emptyIconColor, inputBg 
  } = activeTheme

  // Dynamic View Properties
  const animClass = reduceMotion ? '' : 'animate-enter';
  const getDelay = (delayStr: string) => reduceMotion ? '0ms' : delayStr;
  const headerPadding = compactMode ? 'p-6 pb-4 md:px-8' : 'p-8 pb-6';
  const coverSize = compactMode ? 'w-32 h-32 md:w-48 md:h-48' : 'w-48 h-48 md:w-60 md:h-60';
  const titleSize = compactMode ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl';
  const actionBarPadding = compactMode ? 'px-6 py-3' : 'px-8 py-5';
  const tableRowPadding = compactMode ? 'py-2' : 'py-3';
  const rowImageSize = compactMode ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12';

  // 1. Fetch Data
  useEffect(() => {
    if (!playlistId || !user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch Playlist Info
    const fetchPlaylistDetails = async () => {
      try {
        const docRef = doc(db, 'playlists', playlistId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data() as PlaylistData
          setPlaylist(data)
          setEditName(data.name)
          setEditDesc(data.description || '')
        }
      } catch (err) { console.error(err) }
    }

    // Fetch Songs
    const songsCollection = collection(db, 'playlists', playlistId, 'songs')
    const q = query(songsCollection, orderBy('addedAt', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Song[]

      fetchPlaylistDetails().then(() => {
        setSongs(songsData)
        setLoading(false)
      })
    })

    return () => unsubscribe()
  }, [playlistId, user?.id])

  // --- ACTIONS ---

  const handleSavePlaylist = async () => {
    if (!playlistId) return
    try {
      const docRef = doc(db, 'playlists', playlistId)
      await updateDoc(docRef, { name: editName, description: editDesc })
      setPlaylist(prev => prev ? { ...prev, name: editName, description: editDesc } : null)
      setIsEditing(false)
    } catch (err) { alert("Failed to update playlist") }
  }

  const handleDeletePlaylist = async () => {
    if (!playlistId) return
    if (window.confirm("Are you sure you want to delete this ENTIRE playlist?")) {
      try {
        await deleteDoc(doc(db, 'playlists', playlistId))
        window.location.reload() 
      } catch (err) { alert("Failed to delete playlist") }
    }
  }

  const handleDownload = async (song: Song) => {
    try {
      const response = await fetch(song.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { alert("Failed to download song") }
  };

  // --- REMOVE FROM PLAYLIST ---
  const handleRemoveFromPlaylist = async (songId: string) => {
  if (!playlistId || !songId) {
    console.error("Missing IDs:", { playlistId, songId });
    return;
  }

  console.log(`Attempting to delete: playlists/${playlistId}/songs/${songId}`);

  setActiveSongMenu(null);
  setProcessing(true);
  
  try {
    const songDocRef = doc(db, 'playlists', playlistId, 'songs', songId);
    await deleteDoc(songDocRef);
    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, { songCount: increment(-1) });
    console.log("Delete successful!");
  } catch (err: any) { 
    console.error("FIREBASE ERROR:", err.code, err.message);
    alert(`Error: ${err.message}`);
  } finally {
    setProcessing(false);
  }
}

  // --- STRICT SONG FILTER: Only genuine individual songs, NO playlists/mixes/compilations ---
  const isGenuineSong = (song: Song) => {
    if (!song || !song.title) return false;
    const title = (song.title || '').toLowerCase().trim();
    const artist = (song.artist || '').toLowerCase().trim();
    const fullText = `${title} ${artist}`;

    // Reject playlists, albums, mixes, compilations, long collections
    const blacklistRegex = /\b(playlist|full playlist|compilation|greatest hits full|full album|album mix|all songs|top \d+ songs|nonstop|non stop|dj mix|mega mix|party mix|lofi mix|chill mix|mix \d+|1 hour|2 hours|3 hours|10 hours|soundtrack full|ost full|discography|anthology|best of \d{4}|songs \d{4})\b/i;
    if (blacklistRegex.test(fullText)) return false;

    // Reject non-song video content
    const junkRegex = /\b(tutorial|how to|origami|sound effect|sfx|sleep sounds|rain sounds|white noise|guided meditation|documentary|podcast|audiobook|reaction|gameplay|walkthrough)\b/i;
    if (junkRegex.test(fullText)) return false;

    // Individual songs should be between 35 seconds and 600 seconds (10 mins)
    if (song.duration && (song.duration > 600 || song.duration < 35)) return false;

    return true;
  };

  // --- FETCH SPOTIFY-STYLE SMART PLAYLIST RECOMMENDATIONS ---
  const fetchRecommendations = async () => {
    if (!playlistId) return;
    setLoadingRecs(true);
    try {
      let candidatePool: Song[] = [];

      if (songs.length > 0) {
        const uniqueArtists = Array.from(new Set(songs.map(s => s.artist).filter(Boolean)));
        const shuffledArtists = [...uniqueArtists].sort(() => 0.5 - Math.random());
        const selectedArtists = shuffledArtists.slice(0, 3);

        // 1. Fetch official artist top songs concurrently
        const artistPromises = selectedArtists.map(async (artist) => {
          try {
            const profile = await fetchArtistProfile(artist);
            if (profile && profile.topSongs && profile.topSongs.length > 0) {
              return profile.topSongs;
            }
          } catch {}
          return searchYouTubeMusic(`${artist} official audio`);
        });

        // 2. Also search tracks related to a random song in the playlist
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        const songRelatedPromise = randomSong
          ? searchYouTubeMusic(`${randomSong.title} ${randomSong.artist || ''}`)
          : Promise.resolve([]);

        const results = await Promise.all([...artistPromises, songRelatedPromise]);
        candidatePool = results.flat();
      } else {
        // Empty playlist: Recommend global trending hits
        const trending = await getTrendingYouTubeMusic();
        candidatePool = trending;
      }

      // Existing playlist song signatures for strict deduplication
      const existingIds = new Set(songs.map(s => s.id));
      const existingTitles = new Set(
        songs.map(s => `${s.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${(s.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`)
      );

      const seenInBatch = new Set<string>();
      const filtered: Song[] = [];

      for (const r of candidatePool) {
        if (!isGenuineSong(r)) continue;
        if (existingIds.has(r.id)) continue;

        const normSig = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${(r.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        if (existingTitles.has(normSig) || seenInBatch.has(normSig)) continue;

        seenInBatch.add(normSig);
        filtered.push(r);
      }

      // Shuffle candidates and provide 10 top individual songs
      setRecommendedSongs(filtered.sort(() => 0.5 - Math.random()).slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Auto-fetch recommendations on mount / when playlist loads
  useEffect(() => {
    if (!loading && playlistId) {
      fetchRecommendations();
    }
  }, [playlistId, loading, songs.length === 0]);

  // --- LIVE YOUTUBE MUSIC SEARCH FOR PLAYLIST ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchYouTubeMusic(searchQuery);
        // Strict filter for genuine single songs only
        setSearchResults(results.filter(isGenuineSong));
      } catch (err) {
        console.error('Search error in playlist:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- ADD SONG TO PLAYLIST DIRECTLY ---
  const handleAddSongToPlaylist = async (song: Song) => {
    if (!playlistId || !user?.id) return;
    const songId = song.id || `yt_${Date.now()}`;
    setAddingSongId(songId);

    try {
      const songRef = doc(db, 'playlists', playlistId, 'songs', songId);
      await setDoc(songRef, {
        id: songId,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        duration: song.duration || 210,
        url: song.url || '',
        coverArtBase64: song.coverArtBase64 || '',
        lyrics: song.lyrics || '',
        youtubeUrl: (song as any).youtubeUrl || '',
        addedAt: new Date().toISOString()
      });

      const playlistRef = doc(db, 'playlists', playlistId);
      await updateDoc(playlistRef, {
        songCount: increment(1),
        ...(playlist?.coverArtBase64 ? {} : { coverArtBase64: song.coverArtBase64 || null })
      });

      setAddedSongIds(prev => new Set([...prev, songId]));
    } catch (err: any) {
      console.error('Failed to add song to playlist:', err);
      alert(`Could not add song: ${err?.message || err}`);
    } finally {
      setAddingSongId(null);
    }
  };

  const handleFocusAddSongs = () => {
    recSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  };

  const handleRowClick = (song: Song) => {
    if (currentSong?.id === song.id) {
        if (isPlaying) pauseSong()
        else playSong(song)
    } else {
        setQueue(songs);
        playSong(song)
    }
  }

  // Click Outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (songMenuRef.current && !songMenuRef.current.contains(event.target as Node)) {
        setActiveSongMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) return <div className={`p-10 ${textMain} ${reduceMotion ? '' : 'animate-pulse'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Loading...</div>
  if (!playlist) return <div className={`p-10 ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Playlist not found</div>

  return (
    <div className="relative flex flex-col h-full overflow-y-auto bg-transparent scrollbar-hide">
      
      {!reduceMotion && (
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-enter {
            animation: fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            opacity: 0; 
          }
        `}</style>
      )}

      {/* Global Processing Overlay */}
      {processing && (
        <div className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center ${reduceMotion ? '' : 'transition-opacity'}`}>
          <div className={`${menuBg} p-6 rounded-xl flex flex-col items-center gap-4 border shadow-2xl`}>
            <Loader2 className={`w-8 h-8 ${reduceMotion ? '' : 'animate-spin'} ${spinner}`} />
            <span className={`${textMain} font-bold ${reduceMotion ? '' : 'animate-pulse'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Removing...</span>
          </div>
        </div>
      )}

      {playlist.coverArtBase64 && (
        <div 
          className={`absolute inset-0 z-0 pointer-events-none ${animClass}`}
          style={{
            backgroundImage: `url(${playlist.coverArtBase64})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) brightness(0.35)',
            transform: 'scale(1.2)',
            animationDelay: getDelay('0ms')
          }}
        />
      )}

      <div className="relative z-10 flex flex-col min-h-full">
        
        {/* HEADER */}
        <div className={`flex flex-col md:flex-row items-center md:items-end gap-6 ${headerPadding} ${overlayFade} ${animClass} ${reduceMotion ? '' : 'transition-colors duration-500'}`} style={{ animationDelay: getDelay('100ms') }}>
          <div className="relative group shrink-0 shadow-2xl">
            <br /><br />
            <div className={`${coverSize} rounded-2xl overflow-hidden flex items-center justify-center border ${menuBg.split(' ')[1]}`}>
              {playlist.coverArtBase64 ? (
                <img src={playlist.coverArtBase64} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-black/20`}><Music className={`w-24 h-24 ${emptyIconColor}`} /></div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center md:text-left flex-1 min-w-0 w-full">
            <span className={`uppercase tracking-widest text-xs font-bold ${textMuted}`}>Playlist</span>
            {isEditing ? (
              <div className={`w-full max-w-lg space-y-3 p-4 rounded-xl border backdrop-blur-md ${editBg}`}>
                <input 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  className={`w-full rounded-lg px-4 py-2 text-xl font-bold ${textMain} focus:outline-none ${reduceMotion ? '' : 'transition-colors'} ${inputBg}`}
                  placeholder="Playlist Name"
                  autoFocus
                />
                <textarea 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  className={`w-full text-base rounded-lg px-4 py-2 ${textMain} focus:outline-none resize-none h-20 ${reduceMotion ? '' : 'transition-colors'} ${inputBg}`}
                  placeholder="Description"
                />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setIsEditing(false)} className={`px-4 py-2 rounded-lg text-sm ${reduceMotion ? '' : 'transition-colors'} ${textMuted} ${menuHover}`}>Cancel</button>
                  <button onClick={handleSavePlaylist} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${reduceMotion ? '' : 'transition-all hover:scale-105'} ${primaryBtn}`}> Save Details</button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`${titleSize} font-black tracking-tight leading-none mb-2 drop-shadow-lg ${textMain}`}>
                  {playlist.name}
                </h1>
                <p style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`text-base font-medium max-w-2xl line-clamp-2 mb-4 drop-shadow-md ${textMuted}`}>
                  {playlist.description || "No description provided."}
                </p>
                <div className={`flex items-center justify-center md:justify-start gap-2 text-sm font-medium ${textMuted}`}>
                  <span className={`font-bold ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{user?.displayName}</span>
                  <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                  <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{songs.length} songs</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ACTION BAR */}
        <div className={`${actionBarPadding} flex items-center justify-between sticky top-0 backdrop-blur-xl z-30 ${animClass} ${reduceMotion ? '' : 'transition-colors duration-500'} ${stickyBg}`} style={{ animationDelay: getDelay('200ms') }}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => songs.length > 0 && handleRowClick(songs[0])}
              disabled={songs.length === 0}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${reduceMotion ? '' : 'transition-all hover:scale-105'} ${primaryBtn}`}
            >
              {isPlaying && songs.some(s => s.id === currentSong?.id) ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            <button 
              onClick={handleFocusAddSongs}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wider ${reduceMotion ? '' : 'transition-colors'} ${btnOutline}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Plus size={18} /> Add Songs
            </button>

            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-xl ${reduceMotion ? '' : 'transition-colors'} ${textMuted} ${menuHover}`}>
                <MoreHorizontal className="w-6 h-6" />
              </button>
              {showMenu && (
                <div className={`absolute top-full -left-36 mt-2 w-48 rounded-lg shadow-2xl border overflow-hidden z-[100] ${menuBg}`}>
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`w-full text-left px-4 py-3 text-xs flex items-center gap-3 ${reduceMotion ? '' : 'transition-colors'} ${textMain} ${menuHover}`}>
                    <Edit3 size={14} /> Edit Details
                  </button>
                  <button onClick={() => { setShowUploadModal(true); setShowMenu(false); }} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`w-full text-left px-4 py-3 text-xs flex items-center gap-3 ${reduceMotion ? '' : 'transition-colors'} ${textMain} ${menuHover}`}>
                    <UploadCloud size={14} /> Upload Audio File
                  </button>
                  <button onClick={handleDeletePlaylist} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`w-full text-left px-4 py-3 text-xs text-red-400 flex items-center gap-3 border-t ${reduceMotion ? '' : 'transition-colors'} ${menuHover} ${editBg.split(' ')[1]}`}>
                    <Trash2 size={14} /> Delete Playlist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SONGS TABLE */}
        <div className={`flex-1 px-4 md:px-8 pb-32 ${animClass}`} style={{ animationDelay: getDelay('300ms') }}>
          {songs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 text-center opacity-80`}>
              <Music className={`w-16 h-16 mb-4 ${emptyIconColor}`} />
              <h3 className={`text-2xl font-bold mb-2 ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Your playlist is empty</h3>
              <p className={`text-sm max-w-sm ${textMuted} mb-6`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Search for songs on YouTube Music or check out the recommendations below to add tracks.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleFocusAddSongs} className={`px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 ${reduceMotion ? '' : 'transition-all hover:scale-105'} ${primaryBtn}`}>
                  <Search size={14} /> Find Songs
                </button>
                <button onClick={() => setShowUploadModal(true)} className={`px-5 py-2.5 rounded-full font-bold text-xs border border-white/20 hover:border-white text-white ${reduceMotion ? '' : 'transition-all'}`}>
                  <UploadCloud size={14} /> Upload MP3
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse mt-4">
              <thead className={`text-xs uppercase border-b sticky top-[89px] bg-black/0 z-20 ${textMuted} ${editBg.split(' ')[1]}`}>
                <tr>
                  <th className={`px-4 ${tableRowPadding} w-12 text-center`}>#</th>
                  <th className={`px-4 ${tableRowPadding}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Title</th>
                  <th className={`px-4 ${tableRowPadding} hidden md:table-cell`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Artist</th>
                  <th className={`px-4 ${tableRowPadding} w-10`}></th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song, index) => {
                  const isCurrent = currentSong?.id === song.id;
                  const isMenuOpen = activeSongMenu === song.id;
                  const delay = 350 + (index * 30) + 'ms'; 
                  
                  return (
                    <tr 
                      key={song.id} 
                      style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: getDelay(delay) }}
                      // FIX: Elevate z-index of the row conditionally when its menu is open so it stacks over below rows
                      className={`
                        group cursor-pointer border-b ${animClass} ${reduceMotion ? '' : 'transition-colors'}
                        ${isCurrent ? activeRow : 'bg-transparent'} ${hoverRow} ${editBg.split(' ')[1]}
                        ${isMenuOpen ? 'relative z-[50]' : 'relative z-0'}
                      `}
                      onClick={() => handleRowClick(song)}
                    >
                      <td className={`px-4 ${tableRowPadding} text-sm text-center w-12`}>
                        <span className={`font-medium ${isCurrent ? activeText : textMuted}`}>
                          {index + 1}
                        </span>
                      </td>

                      <td className={`px-4 ${tableRowPadding}`}>
                        <div className="flex items-center gap-4">
                          <div className={`relative ${rowImageSize} shrink-0 group/cover overflow-hidden shadow-sm rounded-md border ${menuBg.split(' ')[1]} bg-black/40`}>
                              {song.coverArtBase64 ? (
                                  <img src={song.coverArtBase64} className="w-full h-full object-cover" alt="" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                      <Music size={compactMode ? 14 : 16} className={emptyIconColor} />
                                  </div>
                              )}
                              <div 
                                  className={`absolute inset-0 bg-black/40 flex items-center justify-center ${reduceMotion ? '' : 'transition-opacity'}
                                      ${isCurrent ? 'opacity-100' : 'opacity-0 md:group-hover/cover:opacity-100'}
                                  `}
                              >
                                  {isCurrent && isPlaying ? <Pause size={compactMode ? 16 : 20} className="text-white fill-white" /> : <Play size={compactMode ? 16 : 20} className="text-white fill-white ml-0.5" />}
                              </div>
                          </div>
                          <div className="flex flex-col">
                              <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`font-medium ${compactMode ? 'text-sm' : 'text-base'} truncate max-w-[200px] md:max-w-md ${isCurrent ? activeText : textMain}`}>
                                  {song.title}
                              </span>
                              <span className={`text-xs md:hidden ${textMuted}`}>{song.artist || 'Unknown'}</span>
                          </div>
                        </div>
                      </td>

                      <td className={`px-4 ${tableRowPadding} text-sm hidden md:table-cell ${reduceMotion ? '' : 'transition-colors'} ${textMuted} group-hover:${textMain.split('-')[1] ? `text-${textMain.split('-')[1]}-${textMain.split('-')[2]}` : textMain}`}>
                          {song.artist || 'Unknown Artist'}
                      </td>

                      {/* FIX: Gave the parent td a static position but allowed the dropdown to spawn relative to it */}
                      <td className={`px-4 ${tableRowPadding} text-right relative`}>
                          <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveSongMenu(isMenuOpen ? null : song.id); 
                              }}
                              className={`
                                p-2 rounded-lg ${reduceMotion ? '' : 'transition-all'}
                                ${isMenuOpen ? `${textMain} ${activeRow}` : `${textMuted} ${menuHover} opacity-0 group-hover:opacity-100`}
                              `}
                          >
                              <MoreHorizontal size={20} />
                          </button>

                          {isMenuOpen && (
                            <div 
                              ref={songMenuRef}
                              // FIX: Updated top positioning and z-index to 100
                              className={`absolute right-10 top-10 mt-2 w-56 border rounded-lg shadow-2xl z-[100] py-1 overflow-hidden ${animClass} ${menuBg}`}
                              style={{ animationDelay: getDelay('0ms') }}
                              onClick={(e) => e.stopPropagation()} 
                              onMouseDown={(e) => e.stopPropagation()} 
                            >
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDownload(song); 
                                  setActiveSongMenu(null); 
                                }}
                                className={`w-full text-left px-4 py-3 text-xs flex items-center gap-3 ${reduceMotion ? '' : 'transition-colors'} ${textMain} ${menuHover}`}
                              >
                                <Download size={16} /> Download
                              </button>
                              
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleRemoveFromPlaylist(song.id); 
                                }}
                                className={`w-full text-left px-4 py-3 text-xs text-red-400 flex items-center gap-3 ${reduceMotion ? '' : 'transition-colors'} border-t hover:bg-red-500/10 ${editBg.split(' ')[1]}`}
                              >
                                <XCircle size={16} /> Remove from Playlist
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {/* ── SPOTIFY-STYLE RECOMMENDED & YOUTUBE SEARCH SECTION ── */}
          <div ref={recSectionRef} id="playlist-recommended-section" className="mt-12 pt-8 border-t border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {searchQuery.trim() ? 'Search Results' : 'Recommended'}
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {searchQuery.trim() 
                    ? `Searching YouTube Music for "${searchQuery}"`
                    : songs.length > 0 
                      ? "Based on what's in this playlist" 
                      : "Popular songs to get your playlist started"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!searchQuery.trim() && (
                  <button
                    onClick={fetchRecommendations}
                    disabled={loadingRecs}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <RefreshCw size={13} className={loadingRecs ? 'animate-spin' : ''} /> Refresh
                  </button>
                )}

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3.5 py-1.5 rounded-full border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <UploadCloud size={13} /> Upload File
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs or artists on YouTube Music..."
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/[0.06] border border-white/10 focus:border-white/30 text-white placeholder-zinc-500 text-sm outline-none transition-all"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>

            {/* Recommendations / Search Results List */}
            {searching || (loadingRecs && !searchQuery.trim()) ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-zinc-400" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {searching ? 'Searching music catalog...' : 'Finding recommendations...'}
                </span>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                {(searchQuery.trim() ? searchResults : recommendedSongs).length === 0 ? (
                  <div className="py-10 text-center text-xs text-zinc-500 font-medium">
                    {searchQuery.trim() ? 'No songs found. Try a different search.' : 'No recommendations available right now.'}
                  </div>
                ) : (
                  (searchQuery.trim() ? searchResults : recommendedSongs).slice(0, 10).map((item) => {
                    const isAdded = addedSongIds.has(item.id) || songs.some(s => s.id === item.id || (s.title.toLowerCase() === item.title.toLowerCase() && s.artist.toLowerCase() === item.artist.toLowerCase()))
                    const isAdding = addingSongId === item.id
                    const isPlayingThis = currentSong?.id === item.id && isPlaying

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 p-3 hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            onClick={() => handleRowClick(item)}
                            className="w-11 h-11 rounded-lg overflow-hidden bg-black/50 shrink-0 border border-white/10 relative cursor-pointer group/thumb"
                          >
                            {item.coverArtBase64 ? (
                              <img src={item.coverArtBase64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music size={16} className="text-zinc-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              {isPlayingThis ? (
                                <Pause size={14} className="text-white fill-white" />
                              ) : (
                                <Play size={14} className="text-white fill-white ml-0.5" />
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white/90 group-hover:text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {item.title}
                            </h4>
                            <p className="text-xs text-zinc-400 font-medium truncate mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {item.artist || 'Unknown Artist'}
                            </p>
                          </div>
                        </div>

                        {/* Add Button */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => !isAdded && handleAddSongToPlaylist(item)}
                            disabled={isAdded || isAdding}
                            className={`px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-white/10 text-zinc-400 cursor-default'
                                : 'bg-white text-black hover:scale-105 active:scale-95 shadow-md'
                            }`}
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                          >
                            {isAdding ? (
                              <>
                                <Loader2 size={12} className="animate-spin" /> Adding...
                              </>
                            ) : isAdded ? (
                              <>
                                <Check size={13} strokeWidth={3} className="text-green-400" /> Added
                              </>
                            ) : (
                              <>
                                <Plus size={13} strokeWidth={3} /> Add
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      <br /> <br /> <br />
      </div>


      {showUploadModal && playlistId && (
        <SongUpload playlistId={playlistId} onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  )
}

export default SongList