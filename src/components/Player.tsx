import React, { useRef, useEffect, useState, useMemo } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Volume1,
  VolumeX,
  Music,
  Repeat,
  Shuffle,
  ExternalLink,
  ChevronDown,
  Mic2,
  X,
  Headphones, 
  Minimize2,
  Video,
  ListMusic,
  Music2,
  FileMusic,
  Plus,
  Check,
  Download,
  DownloadCloud,
  CheckCircle2,
  ListPlus,
  Loader2,
  Sparkles,
  RotateCcw,
  Heart,
  Radio
} from 'lucide-react'
import { MediaSession } from '@capgo/capacitor-media-session';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { parseLrc } from '../utils/lyrics';
import { downloadSongForOffline, isSongOffline, deleteOfflineSong } from '../utils/offlineStorage';
import { findYouTubeVideoId } from '../utils/ytMusic';
import { updateJamPlayback } from '../utils/jamRoomService';
import AddToPlaylistModal from './AddToPlaylistModal';
import { AppleLyricsLine } from './AppleLyricsLine';
import { SyncedVideoPlayer } from './SyncedVideoPlayer';

// --- HELPER: Parse LRC Lyrics ---
const parseLyrics = (lyrics: string) => {
  return parseLrc(lyrics);
};

// --- HELPER: Extract YouTube ID ---
const extractYouTubeId = (song: any): string | null => {
  if (!song) return null;
  if (song.youtubeUrl) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = song.youtubeUrl.match(regExp);
    if (match && match[2].length === 11) return match[2];
  }
  if (song.url && typeof song.url === 'string' && song.url.includes('yt-stream')) {
    const match = song.url.match(/id=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }
  const cleanId = (song.id || '').replace('yt_', '').trim();
  if (cleanId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
    return cleanId;
  }
  return null;
};

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const Player: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    pauseSong,
    resumeSong,
    setCurrentTime,
    setVolume,
    isShuffle, 
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    queue,
    playSong,
    isDragging,
    setIsDragging,
    audioRef, 
    upNextQueue,
    addToQueue,
    removeFromQueue,
    audioQuality,
    setAudioQuality,
    likedSongs,
    isSongLiked,
    toggleLikeSong,
    isInJam,
    activeJamRoom
  } = usePlayer()

  const handlePlayPause = async () => {
    triggerHaptic(ImpactStyle.Medium);
    if (isInJam && activeJamRoom?.id) {
      const nextState = !isPlaying;
      if (nextState) resumeSong();
      else pauseSong();
      await updateJamPlayback(activeJamRoom.id, {
        isPlaying: nextState,
        position: currentTime
      });
    } else {
      isPlaying ? pauseSong() : resumeSong();
    }
  };

  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileLyricsContainerRef = useRef<HTMLDivElement>(null);
  const desktopModalLyricsContainerRef = useRef<HTMLDivElement>(null);
  const desktopSidebarLyricsContainerRef = useRef<HTMLDivElement>(null);

  const isProgrammaticScrollMobileRef = useRef(false);
  const isProgrammaticScrollDesktopRef = useRef(false);

  const [isUserScrolledMobile, setIsUserScrolledMobile] = useState(false);
  const [isUserScrolledDesktop, setIsUserScrolledDesktop] = useState(false);
  
  const [playedHistory, setPlayedHistory] = useState<any[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDesktopFullScreen, setIsDesktopFullScreen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isDesktopLyricsOpen, setIsDesktopLyricsOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [isOfflineDownloaded, setIsOfflineDownloaded] = useState(false);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [offlineDownloadProgress, setOfflineDownloadProgress] = useState(0);

  const [desktopMainView, setDesktopMainView] = useState<'lyrics' | 'disc' | 'video'>('lyrics');

  useEffect(() => {
    setIsUserScrolledMobile(false);
    setIsUserScrolledDesktop(false);
  }, [currentSong?.id, currentSong?.title]);

  const handleMobileLyricsScroll = () => {
    if (!isProgrammaticScrollMobileRef.current) {
      setIsUserScrolledMobile(true);
    }
  };

  const resyncMobileLyrics = () => {
    setIsUserScrolledMobile(false);
    if (activeLineIndex !== -1) {
      const el = document.getElementById(`mobile-lyric-line-${activeLineIndex}`);
      if (el) {
        isProgrammaticScrollMobileRef.current = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          isProgrammaticScrollMobileRef.current = false;
        }, 800);
      }
    }
  };

  const handleDesktopLyricsScroll = () => {
    if (!isProgrammaticScrollDesktopRef.current) {
      setIsUserScrolledDesktop(true);
    }
  };

  const resyncDesktopLyrics = () => {
    setIsUserScrolledDesktop(false);
    if (activeLineIndex !== -1) {
      const elModal = document.getElementById(`desktop-modal-lyric-line-${activeLineIndex}`);
      const elSidebar = document.getElementById(`desktop-sidebar-lyric-line-${activeLineIndex}`);
      isProgrammaticScrollDesktopRef.current = true;
      if (elModal) elModal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (elSidebar) elSidebar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        isProgrammaticScrollDesktopRef.current = false;
      }, 800);
    }
  };

  // --- Offline Status Sync ---
  useEffect(() => {
    if (!currentSong?.id) {
      setIsOfflineDownloaded(false);
      return;
    }
    isSongOffline(currentSong.id).then(setIsOfflineDownloaded);

    const handleOfflineUpdate = (e: any) => {
      if (e.detail?.songId === currentSong.id) {
        setIsOfflineDownloaded(e.detail.action === 'added');
      }
    };
    window.addEventListener('soundwave-offline-updated', handleOfflineUpdate);
    return () => window.removeEventListener('soundwave-offline-updated', handleOfflineUpdate);
  }, [currentSong?.id]);

  const handleToggleOffline = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentSong) return;

    if (isOfflineDownloaded) {
      await deleteOfflineSong(currentSong.id);
      setIsOfflineDownloaded(false);
    } else {
      try {
        setIsDownloadingOffline(true);
        setOfflineDownloadProgress(10);
        await downloadSongForOffline(currentSong, (p) => setOfflineDownloadProgress(p));
        setIsOfflineDownloaded(true);
      } catch (err) {
        console.error('Download offline failed:', err);
        alert('Failed to download track for offline listening.');
      } finally {
        setIsDownloadingOffline(false);
        setOfflineDownloadProgress(0);
      }
    }
  };

  // --- 8D AUDIO STATE & REFS ---
  const [is8DMode, setIs8DMode] = useState(false);
  const [monoAudio, setMonoAudio] = useState(localStorage.getItem('sw_mono_audio') === 'true');
  const [lyricsFontSize, setLyricsFontSize] = useState(Number(localStorage.getItem('sw_lyrics_size') || 18));
  const [lyricsOffset, setLyricsOffset] = useState<number>(() => Number(localStorage.getItem('sw_lyrics_offset') || 0));
  const [sleepTimer, setSleepTimer] = useState(Number(localStorage.getItem('sw_sleep_timer') || 0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const panAnimationRef = useRef<number | null>(null);
  
  const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(() => extractYouTubeId(currentSong));

  useEffect(() => {
    if (!currentSong) {
      setResolvedVideoId(null);
      return;
    }

    const immediateId = extractYouTubeId(currentSong);
    if (immediateId) {
      setResolvedVideoId(immediateId);
      return;
    }

    let isCancelled = false;
    findYouTubeVideoId(currentSong.title, currentSong.artist || '').then((id) => {
      if (!isCancelled && id) {
        setResolvedVideoId(id);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentSong?.id, currentSong?.title, currentSong?.youtubeUrl, currentSong?.url]);

  const youtubeId = resolvedVideoId;
  

  const triggerHaptic = async (style: any = ImpactStyle.Light) => {
  const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
  const isNative = Capacitor.isNativePlatform(); // 🔥 Added native check

  

  // Only proceed if haptics are enabled AND we are on a native device
  if (isHapticEnabled && isNative) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Silently fail
    }
  }
};

// 1. Initialize the Player properly


  // --- THEME STATE & ENGINE ---
  const [theme, setTheme] = useState(() => {
  const isNative = Capacitor.isNativePlatform();
  // Force 'default' on web; allow preference on native
  return isNative ? (localStorage.getItem('soundwave_theme') || 'default') : 'default';
});

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    const handleSettingsUpdate = () => {
    // Removed the isNative block that was forcing 'default'
    setTheme(localStorage.getItem('soundwave_theme') || 'default');
    setMonoAudio(localStorage.getItem('sw_mono_audio') === 'true');
    setLyricsFontSize(Number(localStorage.getItem('sw_lyrics_size') || 18));
    setSleepTimer(Number(localStorage.getItem('sw_sleep_timer') || 0));
  };

    // Run once on mount to enforce the lock immediately
    handleSettingsUpdate();

    window.addEventListener('theme-change', handleSettingsUpdate);
    window.addEventListener('sw-settings-updated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('theme-change', handleSettingsUpdate);
      window.removeEventListener('sw-settings-updated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
}, []);

const updateMetadata = async () => {
  if (currentSong) {
    await MediaSession.setMetadata({
      title: currentSong.title,
      artist: currentSong.artist || 'Unknown Artist',
      album: 'SoundWave',
      // Ensure this is a valid Base64 string or URL
      artwork: currentSong.coverArtBase64 ? [{ src: currentSong.coverArtBase64 }] : []
    });

    await MediaSession.setPlaybackState({
      playbackState: isPlaying ? 'playing' : 'paused'
    });
  }
};

const syncTimeline = async () => {
  if (currentSong && audioRef.current) {
    const duration = audioRef.current.duration;
    const position = audioRef.current.currentTime;

    if (!isNaN(duration) && duration > 0) {
      // 🟢 Most reliable way: Send EVERYTHING in one object
      await MediaSession.setPlaybackState({
        playbackState: isPlaying ? 'playing' : 'paused',
        duration: duration, // 👈 Required for the right-side timestamp
        position: position, // 👈 Required for the left-side timestamp
        playbackRate: 1.0
      });
      
      // Some versions specifically need this for the "drag" to stick
      await MediaSession.setPositionState({
        duration: duration,
        position: position,
        playbackRate: 1.0
      });
    }
  }
};



// Sync every 1 second while playing
useEffect(() => {
  let interval: any;
  if (isPlaying) {
    interval = setInterval(syncTimeline, 1000);
  }
  syncTimeline(); // Run once immediately
  return () => clearInterval(interval);
}, [currentSong, isPlaying]);

useEffect(() => {
  const syncMetadata = async () => {
    if (currentSong) {
      // 🟢 This sends the Title and Artist to the Android Notification
      await MediaSession.setMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Unknown Artist',
        album: 'SoundWave',
        artwork: currentSong.coverArtBase64 ? [{ src: currentSong.coverArtBase64 }] : []
      });

      // 🟢 This tells Android if the button should show "Play" or "Pause"
      await MediaSession.setPlaybackState({
        playbackState: isPlaying ? 'playing' : 'paused'
      });
    }
  };

  syncMetadata(); // 👈 CALLING IT HERE makes it work!
}, [currentSong, isPlaying]);

useEffect(() => {
  // 🟢 You MUST set these handlers or the buttons won't appear
  MediaSession.setActionHandler({ action: 'play' }, () => {
    resumeSong(); // Call your play function
  });

  MediaSession.setActionHandler({ action: 'pause' }, () => {
    pauseSong(); // Call your pause function
  });

  MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
    handleNext(); // Call your skip function
  });

  return () => {
    // Clean up if needed
    MediaSession.removeAllListeners();
  };
}, []);

useEffect(() => {
  MediaSession.setActionHandler({ action: 'seekto' }, (data: any) => {
    // 🟢 The payload usually comes as 'position' in the Capgo plugin
    const newTime = data.position || data.seekTime;
    
    if (newTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = newTime;
      // Force a sync so the numbers update immediately on the notification
      syncTimeline();
    }
  });
}, []);

  const themeConfig: Record<string, any> = {
    default: {
      barBg: 'bg-black/95 border-white/10',
      activeColor: 'text-indigo-500',
      activeHover: 'group-hover:bg-indigo-500',
      lyricsSidebar: 'bg-black/95 border-white/10',
      mobileFullBg: 'bg-black',
      emptyIcon: 'text-zinc-500 bg-zinc-800 border-white/5',
      textMain: 'text-white',
      textMuted: 'text-gray-400',
      lyricsActive: 'text-white',
      lyricsMuted: 'text-white/40'
    },
    sunset: {
      barBg: 'bg-[#1a0502]/95 border-orange-500/20',
      activeColor: 'text-orange-500',
      activeHover: 'group-hover:bg-orange-500',
      lyricsSidebar: 'bg-[#1a0502]/95 border-orange-500/20',
      mobileFullBg: 'bg-[#0f0604]',
      emptyIcon: 'text-orange-500/50 bg-[#2a0808] border-orange-500/20',
      textMain: 'text-orange-50',
      textMuted: 'text-orange-200/60',
      lyricsActive: 'text-orange-200',
      lyricsMuted: 'text-orange-500/40'
    },
    valentine: {
      barBg: 'bg-[#1f0610]/95 border-pink-500/20',
      activeColor: 'text-pink-500',
      activeHover: 'group-hover:bg-pink-500',
      lyricsSidebar: 'bg-[#1f0610]/95 border-pink-500/20',
      mobileFullBg: 'bg-[#14050a]',
      emptyIcon: 'text-pink-500/50 bg-[#330a1a] border-pink-500/20',
      textMain: 'text-pink-50',
      textMuted: 'text-pink-200/60',
      lyricsActive: 'text-pink-200',
      lyricsMuted: 'text-pink-500/40'
    },
    jungle: {
      barBg: 'bg-[#03170b]/95 border-emerald-500/20',
      activeColor: 'text-emerald-500',
      activeHover: 'group-hover:bg-emerald-500',
      lyricsSidebar: 'bg-[#03170b]/95 border-emerald-500/20',
      mobileFullBg: 'bg-[#021008]',
      emptyIcon: 'text-emerald-500/50 bg-[#062414] border-emerald-500/20',
      textMain: 'text-emerald-50',
      textMuted: 'text-emerald-200/60',
      lyricsActive: 'text-emerald-200',
      lyricsMuted: 'text-emerald-500/40'
    },
    ocean: {
      barBg: 'bg-[#04121c]/95 border-cyan-500/20',
      activeColor: 'text-cyan-500',
      activeHover: 'group-hover:bg-cyan-500',
      lyricsSidebar: 'bg-[#04121c]/95 border-cyan-500/20',
      mobileFullBg: 'bg-[#02090e]',
      emptyIcon: 'text-cyan-500/50 bg-[#061a29] border-cyan-500/20',
      textMain: 'text-cyan-50',
      textMuted: 'text-cyan-200/60',
      lyricsActive: 'text-cyan-200',
      lyricsMuted: 'text-cyan-500/40'
    },
    cyberpunk: {
      barBg: 'bg-[#120322]/95 border-fuchsia-500/20',
      activeColor: 'text-fuchsia-500',
      activeHover: 'group-hover:bg-fuchsia-500',
      lyricsSidebar: 'bg-[#120322]/95 border-fuchsia-500/20',
      mobileFullBg: 'bg-[#090111]',
      emptyIcon: 'text-fuchsia-500/50 bg-[#22063b] border-fuchsia-500/20',
      textMain: 'text-fuchsia-50',
      textMuted: 'text-fuchsia-200/60',
      lyricsActive: 'text-fuchsia-200',
      lyricsMuted: 'text-fuchsia-500/40'
    },
    midnight: {
      barBg: 'bg-[#0f071c]/95 border-violet-500/20',
      activeColor: 'text-violet-500',
      activeHover: 'group-hover:bg-violet-500',
      lyricsSidebar: 'bg-[#0f071c]/95 border-violet-500/20',
      mobileFullBg: 'bg-[#07030e]',
      emptyIcon: 'text-violet-500/50 bg-[#1a0c30] border-violet-500/20',
      textMain: 'text-violet-50',
      textMuted: 'text-violet-200/60',
      lyricsActive: 'text-violet-200',
      lyricsMuted: 'text-violet-500/40'
    },
    coffee: {
      barBg: 'bg-[#140c06]/95 border-amber-600/20',
      activeColor: 'text-amber-500',
      activeHover: 'group-hover:bg-amber-500',
      lyricsSidebar: 'bg-[#140c06]/95 border-amber-600/20',
      mobileFullBg: 'bg-[#0a0603]',
      emptyIcon: 'text-amber-600/50 bg-[#26150a] border-amber-600/20',
      textMain: 'text-amber-50',
      textMuted: 'text-amber-200/60',
      lyricsActive: 'text-amber-200',
      lyricsMuted: 'text-amber-600/40'
    }
  }

  const activeTheme = themeConfig[theme] || themeConfig['default']
  const { 
    barBg, activeColor, activeHover, lyricsSidebar, 
    mobileFullBg, emptyIcon, textMain, textMuted, 
    lyricsActive, lyricsMuted 
  } = activeTheme

  // Master Audio Engine is centrally managed in PlayerContext.tsx
  // Sleep Timer and UI controls handled below

  // --- SLEEP TIMER LOGIC ---
  useEffect(() => {
    if (sleepTimer === 0) return;
    
    const ms = sleepTimer * 60 * 1000;
    const timerId = setTimeout(() => {
      fadeTransition(() => pauseSong());
      // Reset the timer so it doesn't loop forever
      setSleepTimer(0);
      localStorage.setItem('sw_sleep_timer', '0');
      window.dispatchEvent(new Event('sw-settings-updated'));
    }, ms);

    return () => clearTimeout(timerId);
  }, [sleepTimer]);

  // --- VOICE COMMANDS ---

  const fadeTransition = (callback: () => void) => {
    if (!audioRef.current) {
      callback();
      return;
    }

    const fadeTime = 1000;
    const steps = 20;
    const stepTime = fadeTime / steps;
    const currentVol = volume || 1;
    let tempVol = currentVol;
    const volStep = currentVol / steps;

    const fadeOut = setInterval(() => {
      tempVol = Math.max(0, tempVol - volStep);
      if (audioRef.current) audioRef.current.volume = tempVol;

      if (tempVol <= 0) {
        clearInterval(fadeOut);
        
        callback(); 

        let fadeInVol = 0;
        const fadeIn = setInterval(() => {
          fadeInVol = Math.min(currentVol, fadeInVol + volStep);
          if (audioRef.current) audioRef.current.volume = fadeInVol;

          if (fadeInVol >= currentVol) {
            clearInterval(fadeIn);
          }
        }, stepTime);
      }
    }, stepTime);
  };

  // --- KEYBOARD CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) pauseSong();
        else if (currentSong) resumeSong();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, pauseSong, resumeSong, currentSong]);

  useEffect(() => {
    if (!isDragging) {
      setSliderValue(currentTime);
    }
  }, [currentTime, isDragging]);

  // --- LYRICS ---
  const parsedLyrics = useMemo(() => {
    return currentSong?.lyrics ? parseLyrics(currentSong.lyrics) : [];
  }, [currentSong]);

  const activeLineIndex = useMemo(() => {
    if (parsedLyrics.length === 0 || parsedLyrics[0].time === -1) return -1;
    // 450ms compensation for YouTube player buffer delay + natural vocal onset anticipation + manual offset
    const leadTime = currentTime + lyricsOffset + 0.45;
    const index = parsedLyrics.findIndex((line, i) => {
      const nextLine = parsedLyrics[i + 1];
      return line.time <= leadTime && (!nextLine || nextLine.time > leadTime);
    });
    return index;
  }, [currentTime, parsedLyrics, lyricsOffset]);

  // Mobile Fullscreen Lyrics Auto-Scroll
  useEffect(() => {
    if (showLyrics && activeLineIndex !== -1 && !isUserScrolledMobile) {
      const activeElement = document.getElementById(`mobile-lyric-line-${activeLineIndex}`);
      if (activeElement) {
        isProgrammaticScrollMobileRef.current = true;
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          isProgrammaticScrollMobileRef.current = false;
        }, 800);
      }
    }
  }, [activeLineIndex, showLyrics, isUserScrolledMobile]);

  // Desktop Sidebar Lyrics Auto-Scroll
  useEffect(() => {
    if (isDesktopLyricsOpen && activeLineIndex !== -1 && !isUserScrolledDesktop) {
      const activeElement = document.getElementById(`desktop-sidebar-lyric-line-${activeLineIndex}`);
      if (activeElement) {
        isProgrammaticScrollDesktopRef.current = true;
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          isProgrammaticScrollDesktopRef.current = false;
        }, 800);
      }
    }
  }, [activeLineIndex, isDesktopLyricsOpen, isUserScrolledDesktop]);

  // Desktop FullScreen Modal Lyrics Auto-Scroll
  useEffect(() => {
    if (isDesktopFullScreen && desktopMainView === 'lyrics' && activeLineIndex !== -1 && !isUserScrolledDesktop) {
      const activeElement = document.getElementById(`desktop-modal-lyric-line-${activeLineIndex}`);
      if (activeElement) {
        isProgrammaticScrollDesktopRef.current = true;
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          isProgrammaticScrollDesktopRef.current = false;
        }, 800);
      }
    }
  }, [activeLineIndex, isDesktopFullScreen, desktopMainView, isUserScrolledDesktop]);

  const adjustLyricsOffset = (delta: number) => {
    setLyricsOffset((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      localStorage.setItem('sw_lyrics_offset', next.toString());
      return next;
    });
  };

  // --- NAVIGATION LOGIC ---
  const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
  const hasNext = isShuffle || currentIndex < queue.length - 1 || repeatMode === 'all';
  const hasPrev = playedHistory.length > 0 || currentIndex > 0 || currentTime > 3;

  const handleNext = () => {
    if (queue.length === 0 || !currentSong) return;
    setPlayedHistory(prev => [...prev, currentSong]);

    fadeTransition(() => {
      // 1. PRIORITY: Play from the custom Up Next queue first
      if (upNextQueue && upNextQueue.length > 0) {
        const nextSong = upNextQueue[0];
        removeFromQueue(0); // Remove it from the queue since it's playing
        playSong(nextSong);
        return;
      }

      // 2. FALLBACK: Standard Shuffle or Sequential Logic
      if (isShuffle) {
        let randomIndex = Math.floor(Math.random() * queue.length);
        if (queue.length > 1 && queue[randomIndex].id === currentSong.id) {
           randomIndex = (randomIndex + 1) % queue.length;
        }
        playSong(queue[randomIndex]);
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
          playSong(queue[nextIndex]);
        } else if (repeatMode === 'all') {
          playSong(queue[0]); 
        } else {
          pauseSong();
          setCurrentTime(0);
        }
      }
    });
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      if (!isPlaying) resumeSong();
      return;
    }
    
    // If there is history, go back to the literal last song played
    if (playedHistory.length > 0) {
      const previous = playedHistory[playedHistory.length - 1];
      const newHistory = playedHistory.slice(0, -1);
      setPlayedHistory(newHistory);
      
      fadeTransition(() => {
        playSong(previous);
      });
      return;
    } 
    
    // If no history but we aren't at the start of the queue, go to previous sequential track
    if (currentIndex > 0) {
       fadeTransition(() => {
         playSong(queue[currentIndex - 1]);
       });
       return;
    }
    
    // Fallback
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  // --- BROWSER TITLE & MEDIA SESSION ---
  useEffect(() => {
    if (!currentSong) {
      document.title = 'SoundWave';
      return;
    }

    document.title = isPlaying 
      ? `${currentSong.title} | Soundwave` 
      : `Soundwave Music`;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Unknown Artist',
        album: 'SoundWave',
        artwork: currentSong.coverArtBase64 ? [
          { src: currentSong.coverArtBase64, sizes: '96x96', type: 'image/png' },
          { src: currentSong.coverArtBase64, sizes: '512x512', type: 'image/png' },
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', resumeSong);
      navigator.mediaSession.setActionHandler('pause', pauseSong);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  }, [currentSong, isPlaying]); 

  // --- ADD THIS TO Player.tsx ---
useEffect(() => {
  // Expose these functions to the window object so native listeners can call them
  (window as any).musicPlayer = {
    play: () => {
      if (currentSong) resumeSong();
    },
    pause: () => {
      pauseSong();
    },
    shuffle: () => {
      toggleShuffle();
      // Optional: Add logic to play the next shuffled song immediately
      handleNext();
    },
    setVolume: (val: number) => {
      setVolume(val);
    }
  };

  // Cleanup on unmount
  return () => {
    delete (window as any).musicPlayer;
  };
}, [currentSong, resumeSong, pauseSong, toggleShuffle, handleNext, setVolume]);

// --- NATIVE EVENT LISTENERS ---
  useEffect(() => {
    // 1. Shake to Shuffle
    const handleShake = () => {
      // Check the boolean preference (defaults to true)
      const isShakeEnabled = localStorage.getItem('sw_shake_shuffle') !== 'false';
      
      // If the user turned it off, exit immediately
      if (!isShakeEnabled) return; 

      console.log("Shake detected! Shuffling...");
      if (isShuffle || !isShuffle) toggleShuffle(); // Triggers your context shuffle
      handleNext(); // Skips to the new shuffled song
    };

    // 2. Headset Unplugged (Always keep this one active for safety/UX)
    const handleRemotePause = () => {
      console.log("Headset removed. Pausing...");
      pauseSong();
    };

    // 4. Audio Focus (Ducking/Notifications)
    const handleAudioFocus = (event: any) => {
      // Check the boolean preference
      const isDuckingEnabled = localStorage.getItem('sw_ducking') !== 'false';
      const { type } = event.detail || {}; 
      
      if (type === 'pause') {
        pauseSong();
      } else if (type === 'duck') {
        // Only lower the volume if the user has Ducking turned ON
        if (isDuckingEnabled) setVolume(0.2);
      } else if (type === 'restore') {
        setVolume(1.0);
        resumeSong();
      }
    };

    // Attach to window
    window.addEventListener('onShakeShuffle', handleShake);
    window.addEventListener('onAudioPauseRequired', handleRemotePause);
    window.addEventListener('onAudioFocusChange', handleAudioFocus);

    // Cleanup when component unmounts
    return () => {
      window.removeEventListener('onShakeShuffle', handleShake);
      window.removeEventListener('onAudioPauseRequired', handleRemotePause);
      window.removeEventListener('onAudioFocusChange', handleAudioFocus);
    };
  }, [toggleShuffle, handleNext, pauseSong, resumeSong, setVolume, isShuffle]);

  // --- AUTO ADVANCE ON END ---
  useEffect(() => {
    if (currentTime >= duration - 1 && duration > 0) {
      if (repeatMode === 'one') {
        setCurrentTime(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          resumeSong();
        }
      } else {
        handleNext();
      }
    }
  }, [currentTime, duration, repeatMode]);

  // --- PiP Logic ---
  const updateCanvas = async () => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = 640; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (currentSong?.coverArtBase64) {
      const img = new Image();
      img.src = currentSong.coverArtBase64;
      await new Promise((res) => (img.onload = res));
      ctx.drawImage(img, 0, 0, 640, 640);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 480, 640, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(currentSong?.title || '', 30, 540);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '24px sans-serif';
    ctx.fillText(currentSong?.artist || 'Unknown Artist', 30, 580);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Monospace';
    ctx.fillText(`${formatTime(currentTime)} / ${formatTime(duration)}`, 30, 620);
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) { 
        await document.exitPictureInPicture(); 
      } else {
        await updateCanvas();
        if (hiddenVideoRef.current && canvasRef.current) {
          const stream = canvasRef.current.captureStream(10); 
          hiddenVideoRef.current.srcObject = stream;
          await hiddenVideoRef.current.play();
          await hiddenVideoRef.current.requestPictureInPicture();
        }
      }
    } catch (error) { console.error("PiP error:", error); }
  };

  useEffect(() => { 
    if (document.pictureInPictureElement) updateCanvas(); 
  }, [currentTime]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = duration ? ((isDragging ? sliderValue : currentTime) / duration) * 100 : 0

  if (!currentSong) return null;

  return (
    <>
    {/* DESKTOP FULL SCREEN PLAYER */}
      <div className={`
        hidden md:flex fixed inset-0 z-[60] flex-col transition-all duration-700 ease-in-out
        ${mobileFullBg} ${isDesktopFullScreen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}>
        {/* Background Blur */}
        {currentSong.coverArtBase64 && (
          <div className="absolute inset-0 z-0 opacity-80 pointer-events-none transition-opacity duration-1000">
            <img src={currentSong.coverArtBase64} className="w-full h-full object-cover blur-3xl scale-110" alt="" />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}

        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-[350px] z-20 p-8 flex justify-between items-center shrink-0 pointer-events-none">

                    <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => setIsDesktopFullScreen(false)} 
              className={`p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${textMain} backdrop-blur-md border border-white/10`}
            >
              <Minimize2 size={22} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 backdrop-blur-md bg-black/40 p-1.5 rounded-2xl border border-white/10 pointer-events-auto shadow-2xl">
            {/* LYRICS BUTTON (Spotify Style) */}
            <button 
              onClick={() => { triggerHaptic(); setDesktopMainView('lyrics'); }} 
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${desktopMainView === 'lyrics' ? `${activeColor} bg-white/15 shadow-lg` : `${textMuted} hover:${textMain} hover:bg-white/5`}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Mic2 size={16} />
              Lyrics
            </button>

            {/* DISC / MUSIC BUTTON */}
            <button 
              onClick={() => { triggerHaptic(); setDesktopMainView('disc'); }} 
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${desktopMainView === 'disc' ? `${activeColor} bg-white/15 shadow-lg` : `${textMuted} hover:${textMain} hover:bg-white/5`}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Music size={16} />
              Disc
            </button>

            {/* VIDEO BUTTON */}
            {youtubeId && (
              <button 
                onClick={() => { triggerHaptic(); setDesktopMainView('video'); }}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold ${desktopMainView === 'video' ? `${activeColor} bg-white/15 shadow-lg` : `${textMuted} hover:${textMain} hover:bg-white/5`}`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Video size={16} />
                Video
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 flex flex-row w-full h-full overflow-hidden">
          
          {/* LEFT/CENTER AREA: Main Stage (Spotify-Style Lyrics / Vinyl Disc / Video) */}
          <div className="flex-1 flex flex-col items-center justify-center h-full pb-[100px] relative overflow-hidden">
            {desktopMainView === 'lyrics' ? (
              // ── SPOTIFY-STYLE FULL-CANVAS LYRICS ──
              <div className="w-full max-w-[850px] h-full flex flex-col justify-center px-10 relative">
                {/* Top Sync Calibration Pill */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center bg-black/50 backdrop-blur-xl rounded-full px-3.5 py-1 text-xs gap-2.5 border border-white/15 shadow-xl">
                  <button onClick={() => adjustLyricsOffset(-0.1)} className="text-white/80 hover:text-white px-1.5 font-bold hover:scale-110 active:scale-95 transition-transform" title="Advance lyrics earlier (-0.1s)">-0.1s</button>
                  <span className="text-white font-mono font-bold text-xs tracking-wide">Sync: {lyricsOffset >= 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}</span>
                  <button onClick={() => adjustLyricsOffset(0.1)} className="text-white/80 hover:text-white px-1.5 font-bold hover:scale-110 active:scale-95 transition-transform" title="Delay lyrics later (+0.1s)">+0.1s</button>
                </div>

                <div 
                  ref={desktopModalLyricsContainerRef}
                  onScroll={handleDesktopLyricsScroll}
                  className="flex-1 w-full pt-[22vh] pb-[40vh] overflow-y-auto scrollbar-hide space-y-8 text-left"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
                  }}
                >
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics[0].time !== -1 ? (
                      <div className="space-y-5 px-6">
                        {parsedLyrics.map((line, i) => (
                          <AppleLyricsLine
                            key={i}
                            elementId={`desktop-modal-lyric-line-${i}`}
                            line={line}
                            index={i}
                            activeLineIndex={activeLineIndex}
                            currentTime={currentTime}
                            nextLineTime={parsedLyrics[i + 1]?.time}
                            lyricsOffset={lyricsOffset}
                            fontSize={30}
                            onClick={(t) => { if (t !== -1) setCurrentTime(t); }}
                            align="left"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className={`text-2xl font-bold leading-relaxed whitespace-pre-wrap font-sans ${lyricsActive} pt-12 pb-24 px-6`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {currentSong.lyrics}
                      </p>
                    )
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-full gap-4 ${lyricsMuted}`}>
                      <Mic2 size={48} className="opacity-40" />
                      <p className="text-lg font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>No lyrics found.</p>
                    </div>
                  )}
                </div>

                {isUserScrolledDesktop && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resyncDesktopLyrics();
                    }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-xl border border-white/30 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-wider animate-bounce"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <RotateCcw size={14} />
                    <span>Re-sync Lyrics</span>
                  </button>
                )}
              </div>
            ) : desktopMainView === 'video' && youtubeId ? (
              // ── VIDEO VIEW ──
              <div className="w-full max-w-[750px] aspect-video rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/15 bg-black flex items-center justify-center relative">
                <SyncedVideoPlayer
                  videoId={youtubeId}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  coverArt={currentSong.coverArtBase64}
                  title={currentSong.title}
                  onTogglePlay={() => (isPlaying ? pauseSong() : resumeSong())}
                />
              </div>
            ) : (
              // ── CD / VINYL DISC VIEW ──
              <div className="w-full max-w-[750px] flex flex-col items-center gap-8">
                <div className={`relative w-[400px] aspect-square rounded-full shadow-2xl transition-all duration-700 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black border-[12px] border-zinc-900/80 ${isPlaying ? 'scale-100 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'scale-90 opacity-80'}`}>
                  {/* Subtle CD/Vinyl Grooves */}
                  <div className="absolute inset-0 rounded-full border border-white/5 m-4 pointer-events-none mix-blend-overlay"></div>
                  <div className="absolute inset-0 rounded-full border border-white/10 m-12 pointer-events-none mix-blend-overlay"></div>
                  <div className="absolute inset-0 rounded-full border border-white/5 m-24 pointer-events-none mix-blend-overlay"></div>
                  
                  {/* Light Reflection / Gloss */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none rotate-45"></div>

                  {/* Rotating Label & Cover Art Container */}
                  <div 
                    className={`relative flex items-center justify-center w-[160px] h-[160px] rounded-full overflow-hidden border-[4px] border-zinc-900 bg-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-[spin_10s_linear_infinite]`}
                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                  >
                    {currentSong.coverArtBase64 ? (
                      <img 
                        src={currentSong.coverArtBase64} 
                        alt={currentSong.title} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${emptyIcon.split(' ')[1]} ${emptyIcon.split(' ')[2]}`}>
                        <Music size={40} className={emptyIcon.split(' ')[0]} />
                      </div>
                    )}
                    
                    {/* Spindle Hole */}
                    <div className="absolute w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/10 shadow-inner"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT AREA: Dedicated Queue List Sidebar */}
          <div className="w-[350px] shrink-0 h-full bg-black/60 backdrop-blur-3xl border-l border-white/10 flex flex-col pb-[100px]">
            
            {/* QUEUE HEADER */}
            <div className="py-5 px-6 border-b border-white/10 flex items-center justify-between shrink-0 mt-8">
              <div className="flex items-center gap-2.5">
                <ListMusic size={18} className={activeColor} />
                <h3 className={`text-sm font-bold uppercase tracking-wider ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Queue List
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-white/80 border border-white/15">
                {(upNextQueue?.length || 0) + queue.length} tracks
              </span>
            </div>
            
            {/* QUEUE CONTENT */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-3 flex flex-col gap-4">
              {/* SECTION 1: UP NEXT (Custom Queue) */}
              {upNextQueue && upNextQueue.length > 0 && (
                <div className="flex flex-col gap-1">
                  <h4 className={`text-xs uppercase tracking-wider font-bold px-2 py-1 ${textMuted}`}>Up Next</h4>
                  {upNextQueue.map((song, idx) => (
                    <div 
                      key={`up-next-${song.id}-${idx}`}
                      onClick={() => {
                        removeFromQueue(idx);
                        playSong(song);
                      }}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/10 transition-all duration-300 group`}
                      title={song.title}
                    >
                      {/* Small Poster */}
                      <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-transparent`}>
                        {song.coverArtBase64 ? (
                          <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music size={16} className={textMuted} /></div>
                        )}
                      </div>
                      
                      {/* Title and Artist Stack */}
                      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                        <p className={`font-bold text-sm truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</p>
                        <p className={`text-xs truncate opacity-70 ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist || 'Unknown Artist'}</p>
                      </div>

                      {/* Remove from Queue Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                        className={`p-1.5 rounded-md opacity-0 hover:opacity-100 group-hover:opacity-100 hover:bg-white/10 transition-all ${textMuted} hover:${textMain}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 2: BASE PLAYLIST (DESKTOP) */}
              <div className="flex flex-col gap-1">
                <h4 className={`text-xs uppercase tracking-wider font-bold px-2 py-1 ${textMuted}`}>
                  {isShuffle ? 'Available: Shuffle' : 'Available: Playlist'}
                </h4>
                {queue.map((song, idx) => {
                  const isActive = song.id === currentSong.id;
                  const isInQueue = upNextQueue?.some(qSong => qSong.id === song.id);

                  return (
                    <div 
                      key={`${song.id}-${idx}`}
                      onClick={() => playSong(song)}
                      className={`group flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all duration-300 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                      title={song.title}
                    >
                      {/* Small Poster */}
                      <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5 border ${isActive ? `border-[1.5px] ${activeColor.replace('text-', 'border-')}` : 'border-transparent'}`}>
                        {song.coverArtBase64 ? (
                          <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music size={16} className={textMuted} /></div>
                        )}
                      </div>
                      
                      {/* Title and Artist Stack */}
                      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                        <p className={`font-bold text-sm truncate ${isActive ? textMain : textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</p>
                        <p className={`text-xs truncate opacity-70 ${isActive ? textMain : textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist || 'Unknown Artist'}</p>
                      </div>

                      {/* Action Area: Playing Indicator OR Add/Check Button */}
                      {isActive && isPlaying ? (
                        <div className="flex gap-0.5 items-end h-3 pr-2 shrink-0">
                          <div className={`w-0.5 bg-white animate-[bounce_1s_infinite]`} style={{ animationDelay: '0.1s' }}></div>
                          <div className={`w-0.5 bg-white animate-[bounce_1s_infinite]`} style={{ animationDelay: '0.3s' }}></div>
                          <div className={`w-0.5 bg-white animate-[bounce_1s_infinite]`} style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      ) : isInQueue ? (
                        <div className={`p-1.5 rounded-md opacity-100 transition-all ${activeColor}`} title="Added to Queue">
                          <Check size={18} />
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            addToQueue(song); 
                          }}
                          className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all ${textMuted} hover:text-white`}
                          title="Add to Up Next"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DESKTOP LYRICS SIDEBAR */}
      <div 
        className={`
          hidden md:flex fixed top-0 right-0 bottom-24 w-96 border-l z-40 flex-col
          transition-all duration-500 ease-in-out shadow-2xl backdrop-blur-xl
          ${lyricsSidebar}
          ${isDesktopLyricsOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className={`py-3 px-6 mt-[70px] border-b flex items-center justify-between transition-colors ${lyricsSidebar}`}>
          <div className="flex items-center gap-3">
            <h3 className={`text-xl font-bold tracking-tight ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Lyrics</h3>
            <div className="flex items-center bg-white/10 rounded-full px-2 py-0.5 text-[11px] gap-1 border border-white/15">
              <button onClick={() => adjustLyricsOffset(-0.1)} className="hover:text-white px-1 font-bold text-white/70 hover:scale-110 active:scale-95 transition-transform" title="Advance lyrics earlier (-0.1s)">-0.1s</button>
              <span className="text-white/90 font-mono font-bold">{lyricsOffset >= 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}</span>
              <button onClick={() => adjustLyricsOffset(0.1)} className="hover:text-white px-1 font-bold text-white/70 hover:scale-110 active:scale-95 transition-transform" title="Delay lyrics later (+0.1s)">+0.1s</button>
            </div>
          </div>
          <button onClick={() => setIsDesktopLyricsOpen(false)} className={`${textMuted} hover:${textMain} transition-colors`}>
            <X size={20} />
          </button>
        </div>
        
        <div 
          ref={desktopSidebarLyricsContainerRef}
          onScroll={handleDesktopLyricsScroll}
          className="flex-1 overflow-y-auto scrollbar-hide p-4 text-left mask-image-gradient relative"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
          }}
        >
          {parsedLyrics.length > 0 ? (
            parsedLyrics[0].time !== -1 ? (
              <div className="space-y-2 px-1">
                {parsedLyrics.map((line, i) => (
                  <AppleLyricsLine
                    key={i}
                    elementId={`desktop-sidebar-lyric-line-${i}`}
                    line={line}
                    index={i}
                    activeLineIndex={activeLineIndex}
                    currentTime={currentTime}
                    nextLineTime={parsedLyrics[i + 1]?.time}
                    lyricsOffset={lyricsOffset}
                    fontSize={lyricsFontSize}
                    onClick={(t) => { if (t !== -1) setCurrentTime(t); }}
                    align="left"
                  />
                ))}
              </div>
            ) : (
              <p className={`text-left font-bold leading-relaxed whitespace-pre-wrap font-sans ${lyricsActive} pt-4 pb-16`} style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: `${lyricsFontSize}px` }}>
                {currentSong.lyrics}
              </p>
            )
          ) : (
            <div className={`flex flex-col items-center justify-center h-full gap-4 ${lyricsMuted}`}>
              <Mic2 size={40} className="opacity-50" />
              <p className="text-sm font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Lyrics not available</p>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FULL SCREEN PLAYER */}
      <div className={`
        fixed inset-0 z-[60] flex flex-col
        transition-all duration-500 ease-in-out md:hidden ${mobileFullBg}
        ${isFullScreen ? 'translate-y-0' : 'translate-y-full'}
      `}>
        {/* Background Blur */}
        {currentSong.coverArtBase64 && (
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none transition-opacity duration-500">
            <img src={currentSong.coverArtBase64} className="w-full h-full object-cover blur-3xl" alt="" />
            <div className={`absolute inset-0 bg-black/60`} />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-6 pb-12">
          
          {/* ── Header ── */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <button
              onClick={() => setIsFullScreen(false)}
              className={`${textMain} p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors`}
            >
              <ChevronDown size={28} />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { triggerHaptic(); handleToggleOffline(e); }}
                disabled={isDownloadingOffline}
                className={`p-2 rounded-xl transition-colors ${
                  isOfflineDownloaded
                    ? 'text-emerald-400 bg-emerald-500/20'
                    : `${textMuted} hover:bg-white/5`
                }`}
              >
                {isDownloadingOffline ? (
                  <Loader2 size={20} className="animate-spin text-indigo-400" />
                ) : isOfflineDownloaded ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <DownloadCloud size={20} />
                )}
              </button>

              <button
                onClick={() => { triggerHaptic(); setAudioQuality(audioQuality === 'best' ? 'standard' : 'best'); }}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                  audioQuality === 'best'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/5 text-white/50 border-white/10'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                title={audioQuality === 'best' ? 'Audio Quality: Best (320kbps HD)' : 'Audio Quality: Standard (128kbps)'}
              >
                {audioQuality === 'best' ? 'HQ' : 'STD'}
              </button>

              <button
                onClick={() => { triggerHaptic(); setShowAddToPlaylist(true); }}
                className={`p-2 rounded-xl transition-colors ${textMuted} hover:bg-white/5`}
              >
                <ListPlus size={20} />
              </button>

              <button
                onClick={() => { triggerHaptic(); setShowMobileQueue(!showMobileQueue); setShowLyrics(false); }}
                className={`p-2 rounded-xl transition-colors ${showMobileQueue ? `${activeColor} bg-white/10` : `${textMuted} hover:bg-white/5`}`}
              >
                <ListMusic size={20} />
              </button>
              <button
                onClick={() => { triggerHaptic(); setIs8DMode(!is8DMode); }}
                className={`p-2 rounded-xl transition-colors ${is8DMode ? `${activeColor} bg-white/10 animate-pulse` : `${textMuted} hover:bg-white/5`}`}
              >
                <Headphones size={20} fill={is8DMode ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => {
                  triggerHaptic();
                  setIsVideoMode(!isVideoMode);
                  if (!isVideoMode) {
                    setShowLyrics(false);
                    setShowMobileQueue(false);
                  }
                }}
                className={`p-2 rounded-xl transition-colors ${isVideoMode ? `${activeColor} bg-white/10` : `${textMuted} hover:bg-white/5`}`}
                title="Toggle Video Player"
              >
                <Video size={20} />
              </button>
              <button
                onClick={() => { triggerHaptic(); setShowLyrics(!showLyrics); setShowMobileQueue(false); }}
                className={`p-2 rounded-xl transition-colors ${showLyrics ? `${activeColor} bg-white/10` : `${textMuted} hover:bg-white/5`}`}
              >
                <Mic2 size={20} fill={showLyrics ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex items-center justify-center mb-8 overflow-hidden relative">
            {showMobileQueue ? (
              // --- MOBILE QUEUE UI ---
              <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col gap-6 pt-4 pb-[20vh]">
                
                {/* UP NEXT (Custom Queue) */}
                {upNextQueue && upNextQueue.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className={`text-xs uppercase tracking-wider font-bold px-2 ${textMuted}`}>Up Next</h4>
                    {upNextQueue.map((song, idx) => (
                      <div 
                        key={`mob-upnext-${song.id}-${idx}`}
                        onClick={() => { removeFromQueue(idx); playSong(song); }}
                        className="flex items-center gap-4 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-black/50">
                          {song.coverArtBase64 ? <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" /> : <Music className="m-auto mt-4 text-white/50" />}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <p className={`font-bold text-base truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</p>
                          <p className={`text-sm truncate opacity-70 ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist || 'Unknown Artist'}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                          className={`p-3 rounded-lg bg-white/5 ${textMuted} active:text-white`}
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* BASE PLAYLIST (MOBILE) */}
                <div className="flex flex-col gap-2">
                  <h4 className={`text-xs uppercase tracking-wider font-bold px-2 ${textMuted}`}>Current Playlist</h4>
                  {queue.map((song, idx) => {
                    const isCurrent = song.id === currentSong.id;
                    return (
                      <div 
                        key={`mob-base-${song.id}-${idx}`}
                        onClick={() => playSong(song)}
                        className={`flex items-center gap-4 p-2 rounded-xl border transition-all ${isCurrent ? 'border-white/30 bg-white/10' : 'border-transparent active:bg-white/5'}`}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-black/50">
                          {song.coverArtBase64 ? <img src={song.coverArtBase64} alt="" className="w-full h-full object-cover" /> : <Music className="m-auto mt-4 text-white/50" />}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <p className={`font-bold text-base truncate ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</p>
                          <p className={`text-sm truncate opacity-70 ${textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist || 'Unknown Artist'}</p>
                        </div>
                        {upNextQueue.some(s => s.id === song.id) ? (
                          <div className={`p-3 rounded-lg ${activeColor} bg-white/5`}>
                            <Check size={20} />
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToQueue(song); }}
                            className={`p-3 rounded-lg text-white bg-white/5 active:bg-white/10 transition-colors`}
                          >
                            <Plus size={20} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : showLyrics ? (
              // --- MOBILE LYRICS UI ---
              <div className="w-full h-full relative overflow-hidden flex flex-col">
                {/* Real-time Sync Calibration Pill */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center bg-black/50 backdrop-blur-xl rounded-full px-3 py-1 text-xs gap-2 border border-white/20 shadow-xl">
                  <button onClick={(e) => { e.stopPropagation(); triggerHaptic(); adjustLyricsOffset(-0.1); }} className="text-white/80 active:text-white px-1.5 font-extrabold text-xs active:scale-90 transition-transform" title="Advance lyrics earlier (-0.1s)">-0.1s</button>
                  <span className="text-white font-mono font-bold text-[11px] tracking-wide">Sync: {lyricsOffset >= 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}</span>
                  <button onClick={(e) => { e.stopPropagation(); triggerHaptic(); adjustLyricsOffset(0.1); }} className="text-white/80 active:text-white px-1.5 font-extrabold text-xs active:scale-90 transition-transform" title="Delay lyrics later (+0.1s)">+0.1s</button>
                </div>
                <div 
                  ref={mobileLyricsContainerRef}
                  onScroll={handleMobileLyricsScroll}
                  className="w-full h-full overflow-y-auto scrollbar-hide py-[25vh] space-y-8 px-6 text-left"
                >
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((item, index) => (
                      <AppleLyricsLine
                        key={index}
                        elementId={`mobile-lyric-line-${index}`}
                        line={item}
                        index={index}
                        activeLineIndex={activeLineIndex}
                        currentTime={currentTime}
                        nextLineTime={parsedLyrics[index + 1]?.time}
                        lyricsOffset={lyricsOffset}
                        fontSize={lyricsFontSize}
                        onClick={(t) => {
                          triggerHaptic();
                          if (t !== -1) setCurrentTime(t);
                        }}
                        align="left"
                      />
                    ))
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-full gap-4 ${lyricsMuted}`}>
                      <FileMusic size={42} className="opacity-50" />
                      <p className="text-base font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Lyrics not available</p>
                    </div>
                  )}
                  <div className="h-[50vh]"></div>
                </div>

                {isUserScrolledMobile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      resyncMobileLyrics();
                    }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.6)] active:scale-95 transition-all text-xs font-black uppercase tracking-wider animate-bounce"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <RotateCcw size={14} />
                    <span>Re-sync Lyrics</span>
                  </button>
                )}
              </div>
            ) : isVideoMode && youtubeId ? (
              <div className="w-full aspect-video max-w-[360px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black flex items-center justify-center relative animate-in fade-in zoom-in duration-300">
                <SyncedVideoPlayer
                  videoId={youtubeId}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  coverArt={currentSong.coverArtBase64}
                  title={currentSong.title}
                  onTogglePlay={() => (isPlaying ? pauseSong() : resumeSong())}
                />
              </div>
            ) : (
              <div
                className={`w-full aspect-square max-w-[300px] rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-300 transition-all ${isPlaying ? 'scale-100' : 'scale-95 opacity-80'} ${emptyIcon.split(' ')[1]} ${emptyIcon.split(' ')[2]}`}
              >
                {currentSong.coverArtBase64
                  ? <img src={currentSong.coverArtBase64} alt={currentSong.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music size={80} className={emptyIcon.split(' ')[0]} /></div>
                }
              </div>
            )}
          </div>

          {/* ── Song Info & Like Button ── */}
          <div className="mb-6 px-2 shrink-0 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className={`text-2xl font-black leading-tight line-clamp-1 ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {currentSong.title}
              </h2>
              <p 
                onClick={() => {
                  if (currentSong?.artist) {
                    setIsMobileFullScreen(false);
                    window.dispatchEvent(new CustomEvent('soundwave-open-artist', { detail: currentSong.artist }));
                  }
                }}
                className={`text-sm mt-1 line-clamp-1 ${textMuted} hover:text-white hover:underline cursor-pointer transition-colors`} 
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {currentSong.artist || 'Unknown Artist'}
              </p>
            </div>

            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Medium);
                if (currentSong) toggleLikeSong(currentSong);
              }}
              title={currentSong && isSongLiked(currentSong) ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              className={`p-2.5 rounded-full bg-white/5 active:scale-75 transition-all ${
                currentSong && isSongLiked(currentSong)
                  ? `${activeColor} drop-shadow-md`
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Heart size={24} fill={currentSong && isSongLiked(currentSong) ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* ── Progress Bar ── */}
          <div className="mb-7 px-2 shrink-0">
            {isInJam && (
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <button
                  onClick={() => {
                    setIsFullScreen(false);
                    window.dispatchEvent(new Event('soundwave-open-listen-together'));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold animate-pulse hover:bg-violet-500/30 transition-colors"
                >
                  <Radio size={13} />
                  <span>Jam: {activeJamRoom?.name || 'Live Room'} • Synced Playback</span>
                </button>
              </div>
            )}
            <div className="w-full h-1.5 bg-white/15 rounded-full relative group mb-2.5">
              <div
                className="absolute h-full rounded-full bg-white pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
              <input
                type="range" min="0" max={duration || 0} step="any"
                value={isDragging ? sliderValue : currentTime}
                disabled={isInJam}
                onChange={(e) => {
                  if (isInJam) return;
                  const newTime = parseFloat(e.target.value);
                  setSliderValue(newTime);
                  setCurrentTime(newTime);
                  if (audioRef.current) audioRef.current.currentTime = newTime;
                }}
                onPointerDown={() => !isInJam && setIsDragging(true)}
                onPointerUp={() => setIsDragging(false)}
                onPointerCancel={() => setIsDragging(false)}
                className={`absolute inset-0 w-full h-full opacity-0 ${isInJam ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
              />
            </div>
            <div className={`flex justify-between text-[11px] font-mono tabular-nums ${textMuted}`}>
              <span>{formatTime(isDragging ? sliderValue : currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* ── Controls ── */}
          <div className="flex items-center justify-between px-2 mb-10 shrink-0">
            <button
              onClick={() => { triggerHaptic(); toggleShuffle(); }}
              disabled={isInJam}
              className={`p-2 transition-colors ${isInJam ? 'opacity-30 cursor-not-allowed' : (isShuffle ? activeColor : textMuted)}`}
              title={isInJam ? "Queue controlled inside Jam Room" : undefined}
            >
              <Shuffle size={22} />
            </button>

            <button
              onClick={() => { triggerHaptic(); handlePrev(); }}
              disabled={!hasPrev || isInJam}
              className={`${textMain} disabled:opacity-25 transition-opacity`}
              title={isInJam ? "Controls synced inside Jam Room" : undefined}
            >
              <SkipBack size={32} fill="currentColor" />
            </button>

            {/* Play/Pause — large rounded pill */}
            <button
              onClick={handlePlayPause}
              className="w-[72px] h-[72px] bg-white rounded-3xl flex items-center justify-center text-black shadow-2xl active:scale-95 transition-transform"
              title={isInJam ? "Sync playback with Jam Room" : undefined}
            >
              {isPlaying
                ? <Pause size={28} fill="currentColor" />
                : <Play size={28} fill="currentColor" className="ml-1" />
              }
            </button>

            <button
              onClick={() => { triggerHaptic(); handleNext(); }}
              disabled={!hasNext || isInJam}
              className={`${textMain} disabled:opacity-25 transition-opacity`}
              title={isInJam ? "Controls synced inside Jam Room" : undefined}
            >
              <SkipForward size={32} fill="currentColor" />
            </button>

            <button
              onClick={() => { triggerHaptic(); toggleRepeat(); }}
              disabled={isInJam}
              className={`p-2 transition-colors ${isInJam ? 'opacity-30 cursor-not-allowed' : (repeatMode !== 'none' ? activeColor : textMuted)}`}
              title={isInJam ? "Queue controlled inside Jam Room" : undefined}
            >
              <Repeat size={22} />
              {repeatMode === 'one' && !isInJam && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black bg-white text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MINI PLAYER BAR ── */}
      <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-2xl border-t z-[70] flex items-center shadow-2xl transition-all duration-500 ${barBg} ${isFullScreen ? 'translate-y-full md:translate-y-0' : 'translate-y-0'}`}>
        <video ref={hiddenVideoRef} className="hidden" muted playsInline />

        {/* Thin progress line — mobile only */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.06] md:hidden pointer-events-none">
          <div
            className="h-full transition-all duration-300 ease-linear bg-white/60"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="w-full max-w-[1800px] mx-auto flex items-center justify-between px-4 md:px-6 gap-4 h-[76px] md:h-[80px]"
          onClick={() => setIsDesktopFullScreen(!isDesktopFullScreen)}
        >
          {/* ── Song Info ── */}
          <div
            className="flex items-center gap-3 flex-1 md:flex-initial md:w-[30%] min-w-0 cursor-pointer md:cursor-default"
            onClick={() => setIsFullScreen(true)}
          >
            {/* Artwork */}
            <div className="shrink-0 relative">
              <div className={`w-12 h-12 md:w-12 md:h-12 rounded-lg overflow-hidden border border-white/10 shadow-lg flex items-center justify-center ${emptyIcon.split(' ')[1]} ${emptyIcon.split(' ')[2]}`}>
                {currentSong.coverArtBase64
                  ? <img src={currentSong.coverArtBase64} alt={currentSong.title} className="w-full h-full object-cover" />
                  : <Music className={`w-5 h-5 ${emptyIcon.split(' ')[0]}`} />
                }
              </div>
            </div>

            {/* Title / Artist */}
            <div className="flex flex-col min-w-0">
              <h3 className={`font-semibold text-[14px] md:text-sm truncate leading-tight ${textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {currentSong.title}
              </h3>
              <p 
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentSong?.artist) {
                    window.dispatchEvent(new CustomEvent('soundwave-open-artist', { detail: currentSong.artist }));
                  }
                }}
                className={`text-[12px] md:text-xs truncate leading-tight mt-0.5 ${textMuted} hover:text-white hover:underline cursor-pointer transition-colors`} 
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {currentSong.artist || 'Unknown Artist'}
              </p>
            </div>

            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                if (currentSong) toggleLikeSong(currentSong);
              }}
              title={currentSong && isSongLiked(currentSong) ? 'Liked' : 'Like'}
              className={`p-1.5 rounded-full transition-transform active:scale-75 ml-1 hidden sm:flex items-center justify-center ${
                currentSong && isSongLiked(currentSong)
                  ? `${activeColor} drop-shadow-sm`
                  : `${textMuted} hover:text-white`
              }`}
            >
              <Heart size={16} fill={currentSong && isSongLiked(currentSong) ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* ── Mobile play/pause ── */}
          <button
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            className={`md:hidden w-11 h-11 rounded-xl flex items-center justify-center ${textMain} bg-white/10 active:scale-90 transition-transform`}
            title={isInJam ? "Sync playback with Jam Room" : undefined}
          >
            {isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* ── Desktop Center: Controls + Seek ── */}
          <div className="hidden md:flex flex-col items-center w-[40%] gap-1.5" onClick={(e) => e.stopPropagation()}>

            {/* Buttons row */}
            <div className="flex items-center gap-5">
              <button
                onClick={toggleShuffle}
                disabled={isInJam}
                title={isInJam ? 'Queue controlled inside Jam Room' : (isShuffle ? 'Shuffle On' : 'Shuffle Off')}
                className={`transition-colors ${isInJam ? 'opacity-30 cursor-not-allowed' : (isShuffle ? activeColor : `${textMuted} hover:text-white/70`)}`}
              >
                <Shuffle size={15} />
              </button>

              <button 
                onClick={handlePrev} 
                disabled={!hasPrev || isInJam} 
                title={isInJam ? 'Controls synced inside Jam Room' : undefined}
                className={`transition-opacity disabled:opacity-20 ${textMuted} hover:text-white/80`}
              >
                <SkipBack size={20} fill="currentColor" />
              </button>

              {/* Play / Pause pill */}
              <button
                onClick={handlePlayPause}
                title={isInJam ? 'Sync playback with Jam Room' : undefined}
                className={`w-9 h-9 rounded-full flex items-center justify-center bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-lg`}
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>

              <button 
                onClick={handleNext} 
                disabled={!hasNext || isInJam} 
                title={isInJam ? 'Controls synced inside Jam Room' : undefined}
                className={`transition-opacity disabled:opacity-20 ${textMuted} hover:text-white/80`}
              >
                <SkipForward size={20} fill="currentColor" />
              </button>

              <button
                onClick={toggleRepeat}
                disabled={isInJam}
                title={isInJam ? 'Queue controlled inside Jam Room' : `Repeat: ${repeatMode}`}
                className={`relative transition-colors ${isInJam ? 'opacity-30 cursor-not-allowed' : (repeatMode !== 'none' ? activeColor : `${textMuted} hover:text-white/70`)}`}
              >
                <Repeat size={15} />
                {repeatMode === 'one' && !isInJam && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-white text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>
                )}
              </button>

              {isInJam && (
                <button
                  onClick={() => window.dispatchEvent(new Event('soundwave-open-listen-together'))}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold animate-pulse hover:bg-violet-500/30 transition-colors"
                  title="Playback synced with Jam Room"
                >
                  <Radio size={10} />
                  <span>Jam Synced</span>
                </button>
              )}
            </div>

            {/* Seek bar */}
            <div className={`w-full flex items-center gap-2 text-[10px] font-mono ${textMuted}`}>
              <span className="w-8 text-right tabular-nums">{formatTime(isDragging ? sliderValue : currentTime)}</span>
              <div className="relative flex-1 group h-4 flex items-center">
                <input
                  type="range" min="0" max={duration || 0} step="any"
                  value={isDragging ? sliderValue : currentTime}
                  disabled={isInJam}
                  onPointerDown={() => !isInJam && setIsDragging(true)}
                  onChange={(e) => {
                    if (isInJam) return;
                    const newTime = parseFloat(e.target.value);
                    setSliderValue(newTime);
                    setCurrentTime(newTime);
                    if (audioRef.current) audioRef.current.currentTime = newTime;
                  }}
                  onPointerUp={() => setIsDragging(false)}
                  onPointerCancel={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  className={`absolute w-full h-full opacity-0 z-20 ${isInJam ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                />
                {/* Track */}
                <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden relative">
                  <div className={`h-full bg-white/80 rounded-full`} style={{ width: `${progressPercent}%` }} />
                </div>
                {/* Thumb */}
                <div
                  className="absolute w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>
              <span className="w-8 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          {/* ── Desktop Right: extras + volume ── */}
          <div className="hidden md:flex items-center justify-end w-[30%] gap-2.5" onClick={(e) => e.stopPropagation()}>

            {/* Add to Playlist Button */}
            <button
              onClick={() => setShowAddToPlaylist(true)}
              title="Add to Playlist"
              className={`p-1.5 rounded-lg transition-colors ${textMuted} hover:text-white/90 hover:bg-white/5`}
            >
              <ListPlus size={16} />
            </button>

            {/* Offline Download Button */}
            <button
              onClick={handleToggleOffline}
              disabled={isDownloadingOffline}
              title={isOfflineDownloaded ? 'Saved Offline (Click to remove)' : 'Download for Offline Playback'}
              className={`p-1.5 rounded-lg transition-colors ${
                isOfflineDownloaded
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : `${textMuted} hover:text-white/90 hover:bg-white/5`
              }`}
            >
              {isDownloadingOffline ? (
                <Loader2 size={16} className="animate-spin text-indigo-400" />
              ) : isOfflineDownloaded ? (
                <CheckCircle2 size={16} />
              ) : (
                <DownloadCloud size={16} />
              )}
            </button>

            {/* Audio Quality Toggle */}
            <button
              onClick={() => {
                triggerHaptic();
                setAudioQuality(audioQuality === 'best' ? 'standard' : 'best');
              }}
              title={audioQuality === 'best' ? 'Streaming: Best Quality (320kbps HD) — Click for Standard (128kbps)' : 'Streaming: Standard (128kbps) — Click for Best Quality (320kbps HD)'}
              className={`px-2 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase border transition-all flex items-center gap-1 ${
                audioQuality === 'best'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white/80 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <span>{audioQuality === 'best' ? 'HQ' : 'STD'}</span>
            </button>

            {/* Video Player Toggle */}
            <button
              onClick={() => {
                triggerHaptic();
                setIsVideoMode(true);
                setIsDesktopFullScreen(true);
              }}
              title="Watch Music Video"
              className={`p-1.5 rounded-lg transition-colors ${
                isDesktopFullScreen && isVideoMode
                  ? `${activeColor} bg-white/10`
                  : `${textMuted} hover:text-white/90 hover:bg-white/5`
              }`}
            >
              <Video size={16} />
            </button>

            <button
              onClick={() => setIsDesktopLyricsOpen(!isDesktopLyricsOpen)}
              title="Lyrics"
              className={`p-1.5 rounded-lg transition-colors ${isDesktopLyricsOpen ? `${activeColor} bg-white/10` : `${textMuted} hover:text-white/70 hover:bg-white/5`}`}
            >
              <Mic2 size={16} />
            </button>

            <button
              onClick={() => setIs8DMode(!is8DMode)}
              title="8D Audio"
              className={`p-1.5 rounded-lg transition-colors ${is8DMode ? `${activeColor} bg-white/10 animate-pulse` : `${textMuted} hover:text-white/70 hover:bg-white/5`}`}
            >
              <Headphones size={16} />
            </button>

            <button
              onClick={togglePiP}
              title="Picture in Picture"
              className={`p-1.5 rounded-lg transition-colors ${textMuted} hover:text-white/70 hover:bg-white/5`}
            >
              <ExternalLink size={16} />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-1">
              <button
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className={`transition-colors ${textMuted} hover:text-white/70 shrink-0`}
              >
                {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
              </button>

              <div className="w-20 group relative flex items-center h-5">
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden relative">
                  <div className="h-full bg-white/80 rounded-full" style={{ width: `${volume * 100}%` }} />
                </div>
                <div
                  className="absolute w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${volume * 100}% - 6px)` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={showAddToPlaylist}
        song={currentSong}
        onClose={() => setShowAddToPlaylist(false)}
      />
    </>
  )
}

export default Player