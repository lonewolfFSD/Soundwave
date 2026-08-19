import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { db } from '../utils/firebase'
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { 
  Play, 
  Pause, 
  Search, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Download, 
  Music, 
  Plus,
  X,
  Save,
  Image as ImageIcon,
  FileText,
  Loader2,
  Import,
  Youtube,
  Settings,
  PencilIcon,
  LayoutGrid,
  List,
  Check,
  ListPlus,
  DownloadCloud,
  CheckCircle2,
  HardDrive,
  Heart,
  Shuffle
} from 'lucide-react'
import GlobalSongUpload from './GlobalSongUpload'
import { getOfflineSongs, deleteOfflineSong } from '../utils/offlineStorage'

import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';

// --- 1. EDIT SONG MODAL ---
const EditSongModal = ({ song, onClose, activeTheme, reduceMotion }: { song: any, onClose: () => void, activeTheme: any, reduceMotion: boolean }) => {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [lyrics, setLyrics] = useState(song.lyrics || '');
  const [youtubeUrl, setYoutubeUrl] = useState(song.youtubeUrl || ''); 
  const [coverPreview, setCoverPreview] = useState(song.coverArtBase64);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const songRef = doc(db, 'users', user.id, 'uploads', song.id);
      await updateDoc(songRef, {
        title,
        artist,
        lyrics,
        youtubeUrl: youtubeUrl.trim(),
        coverArtBase64: coverPreview
      });
      onClose();
    } catch (error) {
      console.error("Error updating song:", error);
      alert("Failed to update song");
    } finally {
      setIsSaving(false);
    }
  };

  // --- HAPTIC TOGGLE HELPER ---
  const triggerHaptic = async (style: any = ImpactStyle.Light) => {
    // 1. Check if the user has haptics enabled in settings
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    
    // 2. Check if we are running on a real Android/iOS device
    const isNative = Capacitor.isNativePlatform();

    // 3. Only run if BOTH are true
    if (isHapticEnabled && isNative) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        // Silently ignore browser errors
      }
    }
  };
  return (
    
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity" onClick={onClose} />
      
      <div className={`${activeTheme.menuBg} w-full sm:max-w-2xl shadow-2xl relative z-50 flex flex-col max-h-[80vh] mb-20 lg:mb-auto lg:mt-28 sm:max-h-[60vh] md:ml-72 ${reduceMotion ? '' : 'animate-in fade-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 cubic-bezier(0.16, 1, 0.3, 1)'} border border-white/10 overflow-hidden`}>
        
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/20`}>
          <div>
            <h2 className={`text-xl font-black ${activeTheme.textMain} tracking-tight`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Edit Track</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Metadata & Details</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-md flex items-center justify-center bg-white/5 border border-white/10 ${activeTheme.textMuted} hover:${activeTheme.textMain} hover:bg-white/10 transition-all`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-hide bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="shrink-0 flex flex-col items-center md:items-start gap-3">
              <div className={`w-32 h-32 sm:w-36 sm:h-36 ${activeTheme.cardBg} rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group bg-black/50`}>
                {coverPreview ? (
                  <img src={coverPreview} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music size={32} className={activeTheme.emptyIconColor} /></div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"></div>
                <label className={`absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0`}>
                  <span className="px-3 py-1.5 bg-white/20 border border-white/30 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 backdrop-blur-md shadow-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <ImageIcon size={12}/> Replace
                  </span>
                  <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${activeTheme.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <PencilIcon size={12} className={activeTheme.activeText} /> Track Title
                </label>
                <input 
                  value={title} onChange={e => setTitle(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2.5 bg-black/40 text-sm ${activeTheme.textMain} focus:outline-none border border-white/10 focus:border-white/30 transition-colors font-medium shadow-inner`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${activeTheme.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Settings size={12} className={activeTheme.activeText} /> Artist
                </label>
                <input 
                  value={artist} onChange={e => setArtist(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2.5 bg-black/40 text-sm ${activeTheme.textMain} focus:outline-none border border-white/10 focus:border-white/30 transition-colors font-medium shadow-inner`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${activeTheme.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Youtube size={12} className={activeTheme.activeText} /> YouTube Video Link (Optional)
                </label>
                <input 
                  value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={`w-full rounded-lg px-3 py-2.5 bg-black/40 text-sm ${activeTheme.textMain} focus:outline-none border border-white/10 focus:border-white/30 transition-colors font-medium shadow-inner`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${activeTheme.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <FileText size={12} className={activeTheme.activeText} /> Synchronized Lyrics
                </label>
                <textarea 
                  value={lyrics} onChange={e => setLyrics(e.target.value)}
                  rows={4}
                  placeholder="Paste LRC format lyrics here: [00:12.34] Your lyric line"
                  className={`w-full rounded-lg p-3 bg-black/40 text-xs ${activeTheme.textMain} focus:outline-none border border-white/10 focus:border-white/30 transition-colors font-mono leading-relaxed resize-none shadow-inner`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`p-4 border-t border-white/5 bg-black/40 flex justify-end gap-3`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTheme.textMuted} hover:${activeTheme.textMain} transition-colors`}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 ${activeTheme.primaryBtn} disabled:opacity-50 transition-all`}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. MAIN LIBRARY COMPONENT ---
const Library = () => {
  const { user } = useAuth()
  const { playSong, pauseSong, isPlaying, currentSong, setQueue, addToQueue, upNextQueue, likedSongs, isSongLiked, toggleLikeSong } = usePlayer()
  const [songs, setSongs] = useState<any[]>([])
  const [offlineSongs, setOfflineSongs] = useState<any[]>([])
  const [libraryTab, setLibraryTab] = useState<'uploads' | 'liked' | 'offline'>('uploads')
  const [filteredSongs, setFilteredSongs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingSong, setEditingSong] = useState<any | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Layout Preference State
  const [viewMode, setViewMode] = useState<'grid' | 'stack'>(
    (localStorage.getItem('sw_lib_view') as 'grid' | 'stack') || 'grid'
  )

  const [theme, setTheme] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    return isNative ? (localStorage.getItem('soundwave_theme') || 'default') : 'default';
  });
  const [compactMode, setCompactMode] = useState(localStorage.getItem('sw_compact_mode') === 'true')
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true')

  // Load offline songs
  const loadOffline = async () => {
    const list = await getOfflineSongs()
    setOfflineSongs(list)
  }

  useEffect(() => {
    loadOffline()
    const handleOfflineEvent = () => loadOffline()
    window.addEventListener('soundwave-offline-updated', handleOfflineEvent)
    return () => window.removeEventListener('soundwave-offline-updated', handleOfflineEvent)
  }, [])

  useEffect(() => {
    localStorage.setItem('sw_lib_view', viewMode)
  }, [viewMode])

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    const handleThemeUpdate = () => {
      setTheme(localStorage.getItem('soundwave_theme') || 'default');
    };

    const handleSettingsUpdate = () => {
      if (isNative) {
        setCompactMode(localStorage.getItem('sw_compact_mode') === 'true');
        setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true');
      } else {
        setCompactMode(false);
        setReduceMotion(false);
      }
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

  // Standardized high-contrast base properties for the engine
  const themeConfig: Record<string, any> = {
    default: { textMain: 'text-slate-100', textMuted: 'text-zinc-400', primaryBtn: 'bg-slate-200 text-black shadow-white/10 hover:bg-white', activeText: 'text-slate-300', menuBg: 'bg-[#09090b] border-white/10', menuHover: 'hover:bg-white/10', hoverRow: 'hover:bg-white/5 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]', activeRow: 'bg-white/10 border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.1)]', cardBg: 'bg-black/40 border-white/5', spinner: 'text-slate-300', emptyIconColor: 'text-zinc-600', inputBg: 'bg-black/60 border-white/10 focus:border-slate-400 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)]', btnOutline: 'border-white/10 hover:border-white/30 text-zinc-300 hover:text-white' },
    sunset: { textMain: 'text-orange-50', textMuted: 'text-orange-200/60', primaryBtn: 'bg-orange-500 text-black shadow-orange-500/20 hover:bg-orange-400', activeText: 'text-orange-400', menuBg: 'bg-[#2a0808] border-orange-500/20', menuHover: 'hover:bg-orange-500/20', hoverRow: 'hover:bg-orange-500/10 hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)]', activeRow: 'bg-orange-500/20 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]', cardBg: 'bg-black/40 border-orange-500/10', spinner: 'text-orange-500', emptyIconColor: 'text-orange-500/50', inputBg: 'bg-black/60 border-orange-500/20 focus:border-orange-400', btnOutline: 'border-orange-500/20 hover:border-orange-500/40 text-orange-200 hover:text-orange-100' },
    valentine: { textMain: 'text-pink-50', textMuted: 'text-pink-200/60', primaryBtn: 'bg-pink-500 text-black shadow-pink-500/20 hover:bg-pink-400', activeText: 'text-pink-400', menuBg: 'bg-[#330a1a] border-pink-500/20', menuHover: 'hover:bg-pink-500/20', hoverRow: 'hover:bg-pink-500/10 hover:border-pink-500/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.1)]', activeRow: 'bg-pink-500/20 border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.2)]', cardBg: 'bg-black/40 border-pink-500/10', spinner: 'text-pink-500', emptyIconColor: 'text-pink-500/50', inputBg: 'bg-black/60 border-pink-500/20 focus:border-pink-400', btnOutline: 'border-pink-500/20 hover:border-pink-500/40 text-pink-200 hover:text-pink-100' },
    jungle: { textMain: 'text-emerald-50', textMuted: 'text-emerald-200/60', primaryBtn: 'bg-emerald-500 text-black shadow-emerald-500/20 hover:bg-emerald-400', activeText: 'text-emerald-400', menuBg: 'bg-[#062414] border-emerald-500/20', menuHover: 'hover:bg-emerald-500/20', hoverRow: 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]', activeRow: 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]', cardBg: 'bg-black/40 border-emerald-500/10', spinner: 'text-emerald-500', emptyIconColor: 'text-emerald-500/50', inputBg: 'bg-black/60 border-emerald-500/20 focus:border-emerald-400', btnOutline: 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-200 hover:text-emerald-100' },
    ocean: { textMain: 'text-cyan-50', textMuted: 'text-cyan-200/60', primaryBtn: 'bg-cyan-500 text-black shadow-cyan-500/20 hover:bg-cyan-400', activeText: 'text-cyan-400', menuBg: 'bg-[#061a29] border-cyan-500/20', menuHover: 'hover:bg-cyan-500/20', hoverRow: 'hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]', activeRow: 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.2)]', cardBg: 'bg-black/40 border-cyan-500/10', spinner: 'text-cyan-500', emptyIconColor: 'text-cyan-500/50', inputBg: 'bg-black/60 border-cyan-500/20 focus:border-cyan-400', btnOutline: 'border-cyan-500/20 hover:border-cyan-500/40 text-cyan-200 hover:text-cyan-100' },
    cyberpunk: { textMain: 'text-fuchsia-50', textMuted: 'text-fuchsia-200/60', primaryBtn: 'bg-fuchsia-500 text-black shadow-fuchsia-500/20 hover:bg-fuchsia-400', activeText: 'text-fuchsia-400', menuBg: 'bg-[#22063b] border-fuchsia-500/20', menuHover: 'hover:bg-fuchsia-500/20', hoverRow: 'hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 hover:shadow-[0_0_20px_rgba(217,70,239,0.1)]', activeRow: 'bg-fuchsia-500/20 border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.2)]', cardBg: 'bg-black/40 border-fuchsia-500/10', spinner: 'text-fuchsia-500', emptyIconColor: 'text-fuchsia-500/50', inputBg: 'bg-black/60 border-fuchsia-500/20 focus:border-fuchsia-400', btnOutline: 'border-fuchsia-500/20 hover:border-fuchsia-500/40 text-fuchsia-200 hover:text-fuchsia-100' },
    midnight: { textMain: 'text-violet-50', textMuted: 'text-violet-200/60', primaryBtn: 'bg-violet-500 text-black shadow-violet-500/20 hover:bg-violet-400', activeText: 'text-violet-400', menuBg: 'bg-[#1a0c30] border-violet-500/20', menuHover: 'hover:bg-violet-500/20', hoverRow: 'hover:bg-violet-500/10 hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]', activeRow: 'bg-violet-500/20 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.2)]', cardBg: 'bg-black/40 border-violet-500/10', spinner: 'text-violet-500', emptyIconColor: 'text-violet-500/50', inputBg: 'bg-black/60 border-violet-500/20 focus:border-violet-400', btnOutline: 'border-violet-500/20 hover:border-violet-500/40 text-violet-200 hover:text-violet-100' },
    coffee: { textMain: 'text-amber-50', textMuted: 'text-amber-200/60', primaryBtn: 'bg-amber-500 text-black shadow-amber-600/20 hover:bg-amber-400', activeText: 'text-amber-500', menuBg: 'bg-[#26150a] border-amber-600/20', menuHover: 'hover:bg-amber-600/20', hoverRow: 'hover:bg-amber-600/10 hover:border-amber-600/30 hover:shadow-[0_0_20px_rgba(217,119,6,0.1)]', activeRow: 'bg-amber-600/20 border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.2)]', cardBg: 'bg-black/40 border-amber-600/10', spinner: 'text-amber-500', emptyIconColor: 'text-amber-600/50', inputBg: 'bg-black/60 border-amber-600/20 focus:border-amber-600', btnOutline: 'border-amber-600/20 hover:border-amber-600/40 text-amber-200 hover:text-amber-100' }
  }

  const activeThemeObj = themeConfig[theme] || themeConfig['default']
  const { textMain, textMuted, primaryBtn, activeText, menuBg, menuHover, hoverRow, activeRow, cardBg, spinner, emptyIconColor, inputBg, btnOutline } = activeThemeObj

  const animClass = reduceMotion ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-500';
  
  // Dynamic Grid vs Stack Classes
  const isGrid = viewMode === 'grid';
  const gridGapClass = compactMode ? 'gap-3 ' : 'gap-5';
  const gridColsClass = isGrid 
    ? (compactMode ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6')
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'; // Stack view spans wider

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const q = query(collection(db, 'users', user.id, 'uploads'), orderBy('addedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSongs(fetched);
      setFilteredSongs(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.id]);

  // --- HAPTIC TOGGLE HELPER ---
  const triggerHaptic = async (style: any = ImpactStyle.Light) => {
    // 1. Check if the user has haptics enabled in settings
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    
    // 2. Check if we are running on a real Android/iOS device
    const isNative = Capacitor.isNativePlatform();

    // 3. Only run if BOTH are true
    if (isHapticEnabled && isNative) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        // Silently ignore browser errors
      }
    }
  };

  useEffect(() => {
    const targetList = libraryTab === 'uploads' ? songs : libraryTab === 'liked' ? likedSongs : offlineSongs;
    const lower = searchQuery.toLowerCase();
    const filtered = targetList.filter(s => 
      s.title?.toLowerCase().includes(lower) || 
      s.artist?.toLowerCase().includes(lower)
    );
    setFilteredSongs(filtered);
  }, [searchQuery, songs, offlineSongs, likedSongs, libraryTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async (song: any) => {
    if (libraryTab === 'offline') {
      if (!window.confirm(`Remove "${song.title}" from offline storage?`)) return;
      setActiveMenuId(null);
      await deleteOfflineSong(song.id);
      await loadOffline();
      return;
    }

    if (!window.confirm(`Delete "${song.title}"?`)) return;
    setActiveMenuId(null);
    try {
      if (song.url) await fetch('/api/deleteSong', { method: 'POST', body: JSON.stringify({ fileUrl: song.url, resourceType: 'video' }) });
      await deleteDoc(doc(db, 'users', user?.id, 'uploads', song.id));
    } catch (err) { console.error(err); }
  };

  const handleDownload = async (song: any) => {
  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const wifiOnly = localStorage.getItem('sw_wifi_only') !== 'false';
      if (wifiOnly) {
        const status = await Network.getStatus();
        if (status.connectionType !== 'wifi') {
          await Toast.show({ text: 'Connect to Wi-Fi to download (Data Saver Active)', duration: 'long' });
          return;
        }
      }

      // Use the direct native bridge for Downloads folder access
      if ((window as any).AndroidSettings?.downloadNative) {
        (window as any).AndroidSettings.downloadNative(song.url, song.title);
      } else {
        // Fallback to previous method if bridge is somehow missing
        await Toast.show({ text: `Downloading ${song.title}...`, duration: 'short', position: 'bottom' });
        const response = await fetch(song.url);
        const blob = await response.blob();
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const fileName = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data as string,
          directory: Directory.Cache,
        });
        await Share.share({
          title: `Save ${song.title}`,
          url: savedFile.uri,
          dialogTitle: 'Save Song Audio'
        });
      }
    } else {
      // WEB BROWSER FALLBACK
      const res = await fetch(song.url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

  } catch (error) {
    console.error("Download failed:", error);
    if (Capacitor.isNativePlatform()) {
      await Toast.show({ text: 'Download failed. Please try again.', duration: 'short' });
    } else {
      alert("Failed to download the file.");
    }
  }
};

  const handlePlay = (song: any) => {
    triggerHaptic(ImpactStyle.Light);

    if (currentSong?.id === song.id) {
        if (isPlaying) pauseSong();
        else playSong(song);
    } else {
        setQueue(filteredSongs); 
        playSong(song);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto scrollbar-hide bg-transparent relative pb-32 md:pb-40">
      
      {/* Ambient Spotlighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-white/[0.015] rounded-full blur-[120px] pointer-events-none"></div>
      
      <br /><br /><br /><br />
      
      {/* Library Header */}
      <div className={`px-6 md:px-10 pt-6 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-20 ${animClass}`}>
        <div>
          <h1 className={`text-3xl font-black ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Your Library</h1>
          
          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { triggerHaptic(); setLibraryTab('uploads'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                libraryTab === 'uploads'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              Uploads ({songs.length}/5)
            </button>
            <button
              onClick={() => { triggerHaptic(); setLibraryTab('liked'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                libraryTab === 'liked'
                  ? `${primaryBtn} shadow-lg`
                  : `bg-white/5 ${textMuted} hover:bg-white/10 hover:${textMain}`
              }`}
            >
              <Heart size={13} fill="currentColor" /> Liked Songs ({likedSongs.length})
            </button>
            <button
              onClick={() => { triggerHaptic(); setLibraryTab('offline'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                libraryTab === 'offline'
                  ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-emerald-400/80 hover:bg-white/10 hover:text-emerald-300'
              }`}
            >
              <DownloadCloud size={14} /> Offline Downloads ({offlineSongs.length})
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          
          {/* View Mode Toggle */}
          <div className={`flex items-center p-1 rounded-xl bg-black/40 border border-white/10 shrink-0 self-start sm:self-auto`}>
            <button 
              onClick={() => { triggerHaptic(); setViewMode('grid'); }}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/15 text-white shadow-inner' : textMuted}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => { triggerHaptic(); setViewMode('stack'); }}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'stack' ? 'bg-white/15 text-white shadow-inner' : textMuted}`}
              title="Stack View"
            >
              <List size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative group w-full sm:w-64">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted} group-focus-within:${textMain} transition-colors`} size={18} />
            <input 
              type="text" 
              style={{ fontFamily: 'Space Grotesk, sans-serif' }} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder={libraryTab === 'uploads' ? 'Search uploads...' : libraryTab === 'liked' ? 'Search liked songs...' : 'Search offline tracks...'} 
              className={`w-full border rounded-xl py-3 pl-12 pr-4 text-sm ${textMain} focus:outline-none transition-all ${inputBg}`} 
            />
          </div>

          {libraryTab === 'liked' && likedSongs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQueue(likedSongs);
                  playSong(likedSongs[0]);
                }}
                className={`py-3 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 bg-white text-black shadow-lg`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Play size={16} fill="currentColor" /> <span className="text-sm">Play All</span>
              </button>
              <button
                onClick={() => {
                  const shuffled = [...likedSongs].sort(() => 0.5 - Math.random());
                  setQueue(shuffled);
                  playSong(shuffled[0]);
                }}
                className={`p-3 rounded-xl font-bold flex items-center justify-center transition-transform hover:-translate-y-0.5 bg-white/10 text-white hover:bg-white/15 border border-white/10`}
                title="Shuffle Liked Songs"
              >
                <Shuffle size={16} />
              </button>
            </div>
          )}

          {libraryTab === 'uploads' && (
            <button 
              onClick={() => setShowUploadModal(true)} 
              className={`py-3 px-6 rounded-xl hidden sm:flex font-black flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 ${primaryBtn}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Import size={18} /> <span className="text-sm tracking-wide">Import Audio</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {/* Grid Content */}
      <div className="px-6 md:px-10 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className={`w-12 h-12 animate-spin ${spinner}`} />
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center opacity-70">
            <Music className={`w-16 h-16 mb-4 ${emptyIconColor}`} />
            <h3 className={`text-xl font-bold ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>No tracks found</h3>
            <p className={`text-sm ${textMuted} mt-1`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Try importing some audio files.</p>
          </div>
        ) : (
          <div className={`grid ${gridColsClass} ${gridGapClass}`}>
            {filteredSongs.map((song, index) => {
              const isActive = currentSong?.id === song.id;
              const isMenuOpen = activeMenuId === song.id;
              
              // NEW: CHECK IF ALREADY IN QUEUE
              const isInQueue = upNextQueue?.some(qSong => qSong.id === song.id);
              // --- UPDATED LONG PRESS LOGIC ---
              let pressTimer: NodeJS.Timeout;

              const handleTouchStart = () => {
                if (!Capacitor.isNativePlatform()) return;
                
                // Clear any existing accidental timers first
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

                longPressTimerRef.current = setTimeout(() => {
                  triggerHaptic(ImpactStyle.Medium);
                  setActiveMenuId(song.id); 
                }, 750); // 750ms is the Android native sweet spot
              };

              const cancelLongPress = () => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              };

              const handleTouchMove = () => {
                // 🔥 CRITICAL: If the finger moves (scrolling), cancel the long press
                clearTimeout(pressTimer);
              };

              const handleTouchEnd = () => {
                // Cancel if released early (a normal tap)
                clearTimeout(pressTimer);
              };
              
              return (
                <div 
                  key={song.id} 
                  onClick={() => handlePlay(song)}
                  onTouchStart={handleTouchStart} // 🔥 Detect start of press
                  onTouchMove={cancelLongPress}   // Cancels if finger wiggles
                  onTouchEnd={cancelLongPress}    // Cancels if lifted normally
                  onTouchCancel={cancelLongPress}
                  style={{
                    cursor: 'pointer'
                  }}
                  className={`group relative  flex p-3 rounded-2xl border backdrop-blur-sm transition-all duration-500 ease-out 
                    ${isActive ? activeRow : cardBg} ${hoverRow} 
                    ${isMenuOpen ? 'z-50' : 'z-0'}
                    ${reduceMotion ? '' : isGrid ? 'hover:-translate-y-1' : 'hover:scale-[1.01]'}
                    ${isGrid ? 'flex-col' : 'flex-row items-center gap-4'}
                  `}
                >
                  {/* Spotlight Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none"></div>

                  <div className={`relative overflow-hidden bg-black/60 border border-white/5 shadow-lg shrink-0 ${isGrid ? 'aspect-square rounded-xl mb-4' : 'w-14 h-14 rounded-lg'}`}>
                    {song.coverArtBase64 ? (
                      <img src={song.coverArtBase64} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={song.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music size={isGrid ? 40 : 20} className={emptyIconColor} /></div>
                    )}
                    
                    {/* Play Button Overlay */}
                    <div 
                      className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center transition-opacity cursor-pointer
                        ${isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                      `} 
                      
                    >
                      <div className={`bg-white/10 ${textMain} border border-white/20 backdrop-blur-md ${isGrid ? 'rounded-lg' : 'rounded-md'} shadow-2xl flex items-center justify-center transition-transform hover:scale-110 ${isGrid ? 'w-14 h-14' : 'w-8 h-8'}`}>
                        {isActive && isPlaying ? <Pause fill="currentColor" size={isGrid ? 30 : 18} /> : <Play fill="currentColor" size={isGrid ? 30 : 18} className="" />}
                      </div>
                    </div>
                  </div>
                  
                  {/* THIS WRAPPER NOW HAS min-w-0 */}
                  <div className={`flex justify-between gap-2 relative z-10 flex-1 min-w-0 ${isGrid ? 'items-start' : 'items-center'}`}>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h3 className={`font-bold truncate leading-tight ${isGrid ? 'text-sm' : 'text-sm'} ${isActive ? activeText : textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className={`text-xs truncate font-medium ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist || 'Unknown Artist'}</p>
                        {(song.isOffline || libraryTab === 'offline') && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold shrink-0">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative shrink-0 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic();
                          toggleLikeSong(song);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSongLiked(song)
                            ? `${activeText} drop-shadow-sm`
                            : `${textMuted} hover:${textMain} hover:bg-white/10`
                        }`}
                        title={isSongLiked(song) ? 'Liked' : 'Like'}
                      >
                        <Heart size={16} fill={isSongLiked(song) ? 'currentColor' : 'none'} />
                      </button>

                      {!Capacitor.isNativePlatform() && (
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerHaptic(); setActiveMenuId(isMenuOpen ? null : song.id); }} 
                          className={`p-1.5 ${textMuted} hover:${textMain} hover:bg-white/10 rounded-lg transition-colors ${isMenuOpen ? 'bg-white/10 text-white' : ''}`}
                        >
                          <MoreVertical size={18} />
                        </button>
                      )}
                      {isMenuOpen && (
                        <div 
                          ref={menuRef} 
                          className={`absolute right-0 top-full mt-2 w-48 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ${menuBg} backdrop-blur-xl ${reduceMotion ? '' : 'animate-in fade-in zoom-in-95 duration-200'}`} 
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {/* ADD TO QUEUE BUTTON */}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (!isInQueue) addToQueue(song);
                              setActiveMenuId(null); 
                            }} 
                            className={`w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-3 ${textMain} ${menuHover} transition-colors border-b border-white/5`}
                          >
                            {isInQueue ? <Check size={16} className={activeThemeObj.activeText} /> : <ListPlus size={16} className={textMuted} />} 
                            {isInQueue ? 'Added to Queue' : 'Add to Queue'}
                          </button>

                          {libraryTab === 'uploads' && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingSong(song); setActiveMenuId(null); }} 
                                className={`w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-3 ${textMain} ${menuHover} transition-colors border-b border-white/5`}
                              >
                                <Edit3 size={16} className={activeThemeObj.activeText} /> Edit Details
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDownload(song); setActiveMenuId(null); }} 
                                className={`w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-3 ${textMain} ${menuHover} transition-colors border-b border-white/5`}
                              >
                                <Download size={16} /> Download File
                              </button>
                            </>
                          )}

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(song); }} 
                            className="w-full text-left px-5 py-3 text-[13px] font-bold text-red-400 flex items-center gap-3 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={16} /> {libraryTab === 'offline' ? 'Remove Offline' : 'Delete Track'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUploadModal && <GlobalSongUpload onClose={() => setShowUploadModal(false)} />}
      {editingSong && <EditSongModal song={editingSong} onClose={() => setEditingSong(null)} activeTheme={activeThemeObj} reduceMotion={reduceMotion} />}
    </div>
  )
}

export default Library