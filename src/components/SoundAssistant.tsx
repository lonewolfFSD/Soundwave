// components/SoundieAssistant.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Keyboard, Send } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Song } from '../context/PlayerContext';
import { addDoc, serverTimestamp, updateDoc, doc, where, deleteDoc, setDoc } from 'firebase/firestore';
import { App } from '@capacitor/app';

let NativeAudio: any = null;
let ScreenBrightness: any = null;
let NativeSpeech: any = null;

const SoundieAssistant = ({ isOpen, onClose: onCloseExternal }: { isOpen?: boolean; onClose?: () => void }) => {
  const { user } = useAuth();
  const {
    currentSong, pauseSong, resumeSong, nextSong, previousSong,
    playSong, addToQueue, queue, globalLibrary, setGlobalLibrary,
  } = usePlayer();

  const [internalOpen, setInternalOpen] = useState(false);
  const modalOpen = isOpen !== undefined ? isOpen : internalOpen;
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [awaitingPlaylistName, setAwaitingPlaylistName] = useState(false);

  const [pendingSongConfirmation, setPendingSongConfirmation] = useState<Song | null>(null); // NEW: Tracks the typo guess
  const [pendingPlaylistDeletion, setPendingPlaylistDeletion] = useState<{ id: string, name: string } | null>(null); // NEW: Tracks playlist to delete

  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothScaleRef = useRef(1.0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaElemSrcRef = useRef<MediaElementAudioSourceNode | null>(null);

  const isListeningRef = useRef(false);
  const pendingTranscriptRef = useRef<string>('');
  const isProcessingRef = useRef(false);

  const [blobScale, setBlobScale] = useState(1.0);
  const [blobGlow, setBlobGlow] = useState(0);
  const [blobWave, setBlobWave] = useState(0);

  const setListening = (val: boolean) => {
    isListeningRef.current = val;
    setIsListening(val);
  };

  const [theme, setTheme] = useState(() =>
    Capacitor.isNativePlatform() ? (localStorage.getItem('soundwave_theme') || 'default') : 'default'
  );

  const themeConfig: Record<string, { primary: string; hex: string }> = {
    default: { primary: 'violet', hex: '#8b5cf6' },
    sunset: { primary: 'orange', hex: '#f97316' },
    valentine: { primary: 'pink', hex: '#ec4899' },
    jungle: { primary: 'emerald', hex: '#10b981' },
    ocean: { primary: 'cyan', hex: '#06b6d4' },
    cyberpunk: { primary: 'fuchsia', hex: '#d946ef' },
    midnight: { primary: 'violet', hex: '#7c3aed' },
    coffee: { primary: 'amber', hex: '#d97706' },
  };

  const colors = themeConfig[theme] || themeConfig['default'];
  const UNREAL_KEY = localStorage.getItem('sw_unreal_key') || 'jHkES2MDPMQxTiRCYcytOFiZa4xltB1NWwwUIelHHz0EeLBKPXG8xy';
  const [soundieEnabled, setSoundieEnabled] = useState(() =>
    localStorage.getItem('sw_soundie_enabled') !== 'false'
  );

  const resetState = () => {
    setTranscript('');
    setAiResponse('');
    setAwaitingPlaylistName(false);
    setIsThinking(false);
    setPendingSongConfirmation(null);
    setPendingPlaylistDeletion(null);
  };

  useEffect(() => {
    const handle = () => {
      setTheme(Capacitor.isNativePlatform() ? (localStorage.getItem('soundwave_theme') || 'default') : 'default');
      setSoundieEnabled(localStorage.getItem('sw_soundie_enabled') !== 'false');
    };
    window.addEventListener('theme-change', handle);
    window.addEventListener('sw-settings-updated', handle);
    return () => {
      window.removeEventListener('theme-change', handle);
      window.removeEventListener('sw-settings-updated', handle);
    };
  }, []);

  const pluginsReadyRef = useRef(false);

  useEffect(() => {
    (async () => {
      try { NativeAudio = (await import('@capacitor-community/native-audio')).NativeAudio; } catch {}
      try { ScreenBrightness = (await import('@capacitor-community/screen-brightness')).ScreenBrightness; } catch {}
      try { NativeSpeech = (await import('@capacitor-community/speech-recognition')).SpeechRecognition; } catch {}
      pluginsReadyRef.current = true;
    })();
  }, []);

  useEffect(() => {
    if (isOpen && Capacitor.isNativePlatform() && soundieEnabled) {
      resetState();
      setTimeout(() => {
        startListening();
      }, 350);
    }
  }, [isOpen, soundieEnabled]);

  // Track whether Soundie was open when the user left the app
  const wasOpenOnBackgroundRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = async ({ isActive }: { isActive: boolean }) => {
      if (!isActive) {
        // User is leaving the app — if Soundie was open, show PiP orb
        if (modalOpen || wasOpenOnBackgroundRef.current) {
          wasOpenOnBackgroundRef.current = true;
          setIsMiniMode(true);
        }
      } else {
        // User returned to app
        wasOpenOnBackgroundRef.current = false;
        setIsMiniMode(false);
      }
    };

    const listener = App.addListener('appStateChange', handleAppStateChange);
    return () => {
      listener.then(l => l.remove());
    };
  }, [modalOpen]);

  useEffect(() => {
    if (isTypingMode) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isTypingMode]);

  useEffect(() => {
    if (!user?.id || globalLibrary.length > 0) return;
    (async () => {
      try {
        const q = query(collection(db, 'users', user.id, 'uploads'), orderBy('addedAt', 'desc'));
        const snap = await getDocs(q);
        const songs: Song[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Song, 'id'>) }));
        if (songs.length > 0) setGlobalLibrary(songs);
      } catch (e) { console.error('[Soundie] Firestore error:', e); }
    })();
  }, [user?.id, globalLibrary.length]);

   // ── Add song to playlist (FIXED: Now uses the Subcollection to match UI) ──
  const addSongToPlaylist = async (song: Song, playlistName: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // 1. Fetch all playlists to do a case-insensitive search
      const q = query(collection(db, 'playlists'), where('userId', '==', user.id));
      const snapshot = await getDocs(q);
      
      const targetDoc = snapshot.docs.find(d => d.data().name.toLowerCase() === playlistName.toLowerCase());
      if (!targetDoc) return false;

      // 2. Add directly to the 'songs' subcollection, perfectly matching SongUpload.tsx
      const playlistSongRef = doc(db, 'playlists', targetDoc.id, 'songs', song.id);
      await setDoc(playlistSongRef, {
        ...song,
        addedAt: new Date().toISOString()
      });

      return true;
    } catch (err) {
      console.error('Failed to add song to playlist:', err);
      return false;
    }
  };

  

  const getOrCreateCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const startVoiceReactive = (sourceNode?: AudioNode) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const ctx = getOrCreateCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    analyserRef.current = analyser;
    if (sourceNode) sourceNode.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let last = 0;

    const tick = (now: number) => {
      animFrameRef.current = requestAnimationFrame(tick);
      if (now - last < 16) return;
      last = now;
      analyser.getByteFrequencyData(data);
      const slice = data.slice(0, Math.floor(data.length * 0.35));
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      const target = 1 + (avg / 255) * 0.18;
      smoothScaleRef.current += (target - smoothScaleRef.current) * 0.16;
      const s = Math.max(1.0, Math.min(1.15, smoothScaleRef.current));
      setBlobScale(s);
      setBlobGlow(avg / 255);
      setBlobWave(avg);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const stopVoiceReactive = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const ease = () => {
      smoothScaleRef.current += (1.0 - smoothScaleRef.current) * 0.11;
      setBlobScale(+smoothScaleRef.current.toFixed(4));
      setBlobGlow(g => Math.max(0, +(g - 0.055).toFixed(4)));
      setBlobWave(w => Math.max(0, w - 8));
      if (smoothScaleRef.current > 1.003) {
        animFrameRef.current = requestAnimationFrame(ease);
      } else {
        setBlobScale(1.0); setBlobGlow(0); setBlobWave(0);
        animFrameRef.current = null;
      }
    };
    animFrameRef.current = requestAnimationFrame(ease);
  };

  const forceKillMic = () => {
    if (Capacitor.isNativePlatform() && NativeSpeech) {
      try { NativeSpeech.stop(); NativeSpeech.removeAllListeners(); } catch {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); recognitionRef.current.abort(); } catch {}
    }
    setListening(false);
    stopVoiceReactive();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startListening = async () => {
    // Prevent double-tapping
    if (isListening || isThinking || isSpeaking) return;

    // Pause music and stop current speech before listening
    pauseSong();
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setTranscript('');
    setAiResponse('');
    
    try {
      // --- 1. NATIVE MOBILE (CAPACITOR) ---
      // --- 1. NATIVE MOBILE (CAPACITOR) ---
      if (Capacitor.isNativePlatform() && NativeSpeech) {
        try {
          // 1. Check if the device's native speech engine is actually available
          const { available } = await NativeSpeech.available();
          if (!available) {
            setAiResponse("Speech recognition isn't supported or enabled on this device.");
            setListening(false);
            return;
          }

          // 2. Request modern permissions
          let permStatus = await NativeSpeech.checkPermissions();
          if (permStatus.speechRecognition !== 'granted') {
            permStatus = await NativeSpeech.requestPermissions();
            if (permStatus.speechRecognition !== 'granted') {
              setAiResponse("I need microphone permissions to hear you.");
              setListening(false);
              return;
            }
          }

          setListening(true);
          NativeSpeech.removeAllListeners(); // Clear old listeners just in case

          // 3. Start listening (CRITICAL: popup must be true on Android for stability)
          const result = await NativeSpeech.start({
            language: 'en-US',
            maxResults: 1,
            prompt: 'Listening...',
            partialResults: false, 
            popup: true, // Fixes 99% of Android native crashes
          });

          // 4. Capture the final result directly from the promise
          if (result && result.matches && result.matches.length > 0) {
            const text = result.matches[0];
            setTranscript(text);
            setListening(false);
            await processUserInput(text);
          } else {
            // User cancelled or it heard nothing
            setListening(false);
            setAiResponse("I didn't catch that. Try again?");
          }

        } catch (err) {
          console.error("Native Mic Error:", err);
          setListening(false);
          setAiResponse("Microphone error. Check your device settings.");
        }

      // --- 2. WEB BROWSER FALLBACK ---
    

      // --- 2. WEB BROWSER FALLBACK ---
      } else {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setAiResponse("Your browser doesn't support voice commands. Try typing!");
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setListening(true);
        };

        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setListening(false);
          await processUserInput(text);
        };

        recognition.onerror = (event: any) => {
          console.error("Mic error:", event.error);
          setListening(false);
          if (event.error === 'not-allowed') {
            setAiResponse("Microphone blocked. Please check your browser permissions.");
          } else {
            setAiResponse("I couldn't hear anything. Try again?");
          }
        };

        recognition.onend = () => {
          // Safety catch to unlock the button if it silently stops
          if (isListeningRef.current) {
             setListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (error) {
      console.error("Failed to start mic:", error);
      setListening(false);
      setAiResponse("Something went wrong with the microphone.");
    }
  };
  // (I kept your startListening exactly as you provided)

  const handleTypedSubmit = async () => {
    const text = typedInput.trim();
    if (!text) return;
    setTranscript(text);
    setTypedInput('');
    setIsTypingMode(false);
    await processUserInput(text);
  };

  const setSystemVolume = async (level: number) => {
    const v = Math.max(0, Math.min(1, level));
    try {
      if (Capacitor.isNativePlatform() && NativeAudio) await NativeAudio.setVolume?.({ volume: v });
      if (audioRef.current) audioRef.current.volume = v;
    } catch (e) { console.warn(e); }
  };

  const setScreenBrightness = async (level: number) => {
    const b = Math.max(0, Math.min(1, level));
    try {
      if (Capacitor.isNativePlatform() && ScreenBrightness) {
        await ScreenBrightness.setBrightness({ brightness: b });
      } else {
        document.body.style.filter = `brightness(${0.4 + b * 0.6})`;
      }
    } catch (e) { console.warn(e); }
  };

  // ── FULLY RESTORED LOCAL COMMAND DETECTION ─────────────────────────────
  // ── FULLY RESTORED & TYPO-PROOF LOCAL COMMAND DETECTION ─────────────────────────────
  const findBestSong = (needle: string) => {
    const lib = globalLibrary.length > 0 ? globalLibrary : queue;
    if (!lib.length) return null;
    
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const n = norm(needle);
    const nw = n.split(' ').filter(Boolean);

    // Lightweight Typo Checker (Levenshtein Distance)
    const getDistance = (a: string, b: string) => {
      if (!a || !b) return 99;
      const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
      }
      return matrix[a.length][b.length];
    };

    const scored = lib.map(s => {
      const hayTitle = norm(s.title || '');
      const hayArtist = norm(s.artist || '');
      let score = 0;

      if (hayTitle === n) score += 1000; // Exact match
      else if (hayTitle.includes(n)) score += 500; // Substring match
      else if (n.includes(hayTitle)) score += 300; // Reverse substring match
      else {
        // 1. Check for typos in the full title (allow up to 2 typos for medium-length words)
        const dist = getDistance(n, hayTitle);
        if (dist <= 2 && n.length > 4) {
          score += 250; // High enough to trigger "Did you mean?", but not auto-play
        }

        // 2. Word-by-word matching
        const titleWords = hayTitle.split(' ');
        nw.forEach(w => {
          if (titleWords.includes(w)) {
            score += 20;
          } else if (titleWords.some(tw => tw.startsWith(w) || w.startsWith(tw))) {
            score += 10;
          } else {
            // Check for 1-letter typos on individual words
            titleWords.forEach(tw => {
              if (Math.abs(w.length - tw.length) <= 1 && getDistance(w, tw) <= 1 && w.length > 3) {
                score += 15; 
              }
            });
          }
        });
      }
      
      // 3. Artist checking
      hayArtist.split(' ').forEach(w => { 
        if (nw.includes(w)) score += 5; 
      });
      
      return { song: s, score };
    });
    
    // Sort by highest score
    const best = scored.sort((a, b) => b.score - a.score)[0];
    
    // Return both the song AND the score so we can judge confidence
    return best?.score > 5 ? best : null; 
  };

  const detectLocalCommand = (text: string): { handled: true; response: string } | { handled: false } => {
    // 1. STRIP CONVERSATIONAL FILLER
    // This makes Soundie ignore polite human words so it only sees the core command.
    let t = text.toLowerCase().trim();
    const fillers = /\b(hey soundie|soundie|can you|please|i want to|let'?s|could you|would you mind|just|go ahead and|for me|right now)\b/gi;
    t = t.replace(fillers, '').replace(/\s+/g, ' ').trim();



    // 2. PLAYLIST CHECK (Do this first so it doesn't get confused with "Play" commands)
    if (/\b(add|put|move|include)\b.*\b(to|in|into)\b.*\b(playlist|mix)\b/i.test(t) ||
        /\b(add|put)\b.*\b(to|in)\b/i.test(t) && /playlist|mix/i.test(t)) {
      return { handled: false }; // Let processUserInput handle the complex playlist logic
    }

    // 3. PLAYBACK STATE
    if (/\b(pause|stop|hold on|wait|shut up|quiet)\b/.test(t)) { 
      pauseSong(); 
      return { handled: true, response: 'Paused.' }; 
    }
    // Matches "resume", "play music", or if the user literally just says "play"
    if (/\b(resume|continue|unpause|keep playing)\b/.test(t) || /^(play|go|start|play music)$/.test(t)) {
      resumeSong(); 
      return { handled: true, response: 'Resuming playback.' };
    }
    if (/\b(skip|next|forward|pass)\b/.test(t)) { 
      nextSong(); 
      return { handled: true, response: 'Skipping to the next track.' }; 
    }
    if (/\b(previous|prev|back|last track|rewind)\b/.test(t)) { 
      previousSong(); 
      return { handled: true, response: 'Going back.' }; 
    }

    // 3.5 EXIT APP
    if (/\b(exit|close|quit)\b.*\b(app|application|soundwave)\b/i.test(t)) {
      return { handled: false }; // Handled in processUserInput for Native check
    }


    // 4. VOLUME CONTROLS (Now handles fractions and max/min)
    const volMatch = t.match(/\b(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})\b/) || t.match(/\b(?:turn|set)\s+(?:the\s+)?volume\s+(?:to\s+|up\s+to\s+)?(\d{1,3})\b/);
    if (volMatch) {
      const level = Math.min(100, parseInt(volMatch[1])) / 100;
      setSystemVolume(level);
      return { handled: true, response: `Volume set to ${Math.round(level * 100)}%.` };
    }
    if (/\b(max volume|full volume|maximum|100%)\b/.test(t)) { setSystemVolume(1.0); return { handled: true, response: 'Volume at maximum.' }; }
    if (/\b(half volume|50%)\b/.test(t)) { setSystemVolume(0.5); return { handled: true, response: 'Volume at 50%.' }; }
    if (/\b(volume up|turn up|louder|increase volume|crank it)\b/.test(t)) { setSystemVolume(0.8); return { handled: true, response: 'Turning it up.' }; }
    if (/\b(volume down|turn down|quieter|lower volume|too loud)\b/.test(t)) { setSystemVolume(0.3); return { handled: true, response: 'Turning it down.' }; }
    if (/\b(mute|silence)\b/.test(t)) { setSystemVolume(0); return { handled: true, response: 'Muted.' }; }

    // 5. BRIGHTNESS
    const brightMatch = t.match(/\b(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})\b/);
    if (brightMatch) {
      const level = Math.min(100, parseInt(brightMatch[1])) / 100;
      setScreenBrightness(level);
      return { handled: true, response: `Brightness set to ${Math.round(level * 100)}%.` };
    }
    if (/\b(max brightness|full brightness)\b/.test(t)) { setScreenBrightness(1.0); return { handled: true, response: 'Screen at max brightness.' }; }
    if (/\b(brighter|increase brightness|brightness up)\b/.test(t)) { setScreenBrightness(0.9); return { handled: true, response: 'Brightness increased.' }; }
    if (/\b(dimmer|dim|decrease brightness|brightness down|too bright)\b/.test(t)) { setScreenBrightness(0.3); return { handled: true, response: 'Screen dimmed.' }; }

    // 6. PLAY SPECIFIC SONG
    const playMatch = t.match(/\b(?:play|put on|start|hear|listen to)\s+(.+)/i);
    if (playMatch && !/^(music|some music|a song|it|that|this)$/.test(playMatch[1].trim())) {
      const songQuery = playMatch[1].trim();
      const bestMatch = findBestSong(songQuery);
      
      if (bestMatch) {
        if (bestMatch.score >= 300) {
          // High confidence: Play immediately
          playSong(bestMatch.song);
          return { handled: true, response: `Playing "${bestMatch.song.title}" by ${bestMatch.song.artist}.` };
        } else {
          // Low confidence (Typo or loose match): Ask for confirmation
          setPendingSongConfirmation(bestMatch.song);
          return { handled: true, response: `I couldn't find an exact match. Did you mean "${bestMatch.song.title}" by ${bestMatch.song.artist}?` };
        }
      }
      return { handled: true, response: `I couldn't find "${songQuery}" in your library.` };
    }

    // 7. ADD TO QUEUE
    const queueMatch = t.match(/\b(?:add|queue|put)\s+(.+?)\s+(?:to\s+(?:the\s+)?queue|up next|next)\b/i) || t.match(/\b(?:queue up)\s+(.+)/i);
    if (queueMatch) {
      const songQuery = queueMatch[1].trim();
      const bestMatch = findBestSong(songQuery);
      if (bestMatch) {
        // We assume queueing is safer, so we just add the best guess
        addToQueue(bestMatch.song);
        return { handled: true, response: `Added "${bestMatch.song.title}" to the queue.` };
      }
      return { handled: true, response: `Couldn't find "${songQuery}" to queue up.` };
    }

    // 8. INFO / STATUS
    if (/\b(what('?s| is) (playing|this song|the song)|current(ly playing)?|song name|who sings this)\b/.test(t)) {
      if (currentSong) return { handled: true, response: `This is "${currentSong.title}" by ${currentSong.artist}.` };
      return { handled: true, response: 'Nothing is playing right now.' };
    }

    if (/\b(what('?s| is) in( the)? queue|show queue|queue)\b/.test(t)) {
      if (queue.length === 0) return { handled: true, response: 'Your queue is currently empty.' };
      const preview = queue.slice(0, 3).map(s => `"${s.title}"`).join(', ');
      return { handled: true, response: `You have ${queue.length} song${queue.length > 1 ? 's' : ''} queued. Up next: ${preview}.` };
    }

    // 9. FUN EXTRAS
    if (/\b(what time is it|tell me the time)\b/.test(t)) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { handled: true, response: `It's currently ${time}.` };
    }

    
    // 10. 8D AUDIO TOGGLE
    if (/\b(8d|eight d|3d|spatial)\b.*\b(audio|sound|mode|effect)\b/i.test(t)) {
      if (/\b(on|enable|start|activate)\b/.test(t)) {
        // We'll return handled: false and let processUserInput handle the state
        // or you can call a window-exposed function if you prefer.
        return { handled: false }; 
      }
      if (/\b(off|disable|stop|deactivate)\b/.test(t)) {
        return { handled: false };
      }
    }

    // 11. SLEEP TIMER
    const sleepMatch = t.match(/\b(sleep timer|stop music)\b.*\b(in|for)\b\s+(\d+)\s+(minute|min|hour|hr)s?\b/i);
    if (sleepMatch) {
       return { handled: false };
    }

    return { handled: false }; // Passes to LLM logic if it matches nothing here
  };

  // ── Hardcoded AI Processing ─────────────────────────────────────────────
  // ── Hardcoded AI Processing ─────────────────────────────────────────────
  const processUserInput = async (userText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setListening(false);
    stopVoiceReactive();

    try {
      const lower = userText.toLowerCase().trim();

      // --- 1. EXPLICIT CONTENT & HARASSMENT FILTER ---
      // Blocks direct sexualization or insults, but allows them if a valid command is present
      const explicitRegex = /\b(fuck you|suck|have sex|really sexy|horny|nude|naked|slut|bitch|kiss me|make me hard|I am hard|cock|penis|vagina|your pussy|my dick)\b/i;
      const validCommandRegex = /\b(play|pause|skip|queue|volume|brightness|add|put|move)\b/i;

      // If it contains explicit words BUT NO valid command, we shut it down.
      if (explicitRegex.test(lower) && !validCommandRegex.test(lower)) {
        const resp = "Let's keep things respectful. I'm here to help you manage your music. What would you like to hear?";
        setAiResponse(resp);
        await speakWithUnreal(resp);
        return;
      }

      // --- 1.5 TYPO CONFIRMATION DECISION FACTOR ---
      if (pendingSongConfirmation) {
        // 1. The "YES" Factor
        const isAffirmative = /\b(yes|yeah|yep|sure|do it|play it|that one|absolutely|of course|yup|exactly|please)\b/i;
        
        // 2. The "NO" Factor
        const isNegative = /\b(no|nope|cancel|stop|nevermind|wrong|nah|not that one)\b/i;

        if (isAffirmative.test(lower)) {
           playSong(pendingSongConfirmation);
           const resp = `Awesome. Playing "${pendingSongConfirmation.title}".`;
           setAiResponse(resp);
           await speakWithUnreal(resp);
           setPendingSongConfirmation(null); // Clear the decision state
           return;
        } 
        else if (isNegative.test(lower)) {
           const resp = "Ah, my mistake! I couldn't find the exact track you were looking for. What else can I play for you?";
           setAiResponse(resp);
           await speakWithUnreal(resp);
           setPendingSongConfirmation(null); // Clear the decision state
           return;
        }
        
        // If they didn't say yes or no, but just barked a totally new command (e.g. "Skip"), 
        // we clear the pending state and let the code continue down to handle the new command naturally.
        setPendingSongConfirmation(null);
      }

      // --- 1.6 PLAYLIST DELETION CONFIRMATION ---
      if (pendingPlaylistDeletion) {
        const isAffirmative = /\b(yes|yeah|yep|sure|do it|delete it|absolutely|of course|yup|exactly|please|remove it)\b/i;
        const isNegative = /\b(no|nope|cancel|stop|nevermind|wrong|nah|keep it|don't)\b/i;

        if (isAffirmative.test(lower)) {
           try {
             await deleteDoc(doc(db, 'playlists', pendingPlaylistDeletion.id));
             const resp = `Got it. The playlist "${pendingPlaylistDeletion.name}" has been completely deleted.`;
             setAiResponse(resp);
             await speakWithUnreal(resp);
           } catch (e) {
             const resp = "I ran into an error and couldn't delete the playlist.";
             setAiResponse(resp);
             await speakWithUnreal(resp);
           }
           setPendingPlaylistDeletion(null);
           return;
        } 
        else if (isNegative.test(lower)) {
           const resp = "Okay, deletion cancelled. Your playlist is safe!";
           setAiResponse(resp);
           await speakWithUnreal(resp);
           setPendingPlaylistDeletion(null);
           return;
        }
        
        // If they bypass with a different command
        setPendingPlaylistDeletion(null);
      }

      // --- 2. LOCAL COMMANDS ---
      // Local music controls first (play, pause, skip, queue, etc.)
      const local = detectLocalCommand(userText);
      if (local.handled) {
        setAiResponse(local.response);
        await speakWithUnreal(local.response);
        return;
      }

      // --- 3. PLAYLIST MULTI-TURN FLOW ---
      if (awaitingPlaylistName) {
        const playlistName = userText.trim() || 'My Playlist';
        const success = await actuallyCreatePlaylist(playlistName);
        
        if (success) {
          const resp = `Playlist "${playlistName}" has been created successfully!`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
        } else {
          const resp = "Failed to create playlist. Please try again.";
          setAiResponse(resp);
          await speakWithUnreal(resp);
        }
        setAwaitingPlaylistName(false);
        return;
      }

      setIsThinking(true);

      

      // ── ADD SONG TO PLAYLIST ─────────────────
      const addToPlaylistRegex = /\b(add|put|move|include)\s+(.+?)\s+(?:to|in|into)\s+(.+)/i;
      const addMatch = userText.match(addToPlaylistRegex);
      
      if (addMatch) {
        const songQuery = addMatch[2].trim();
        let playlistName = addMatch[3].trim()
          .replace(/\b(playlist|mix|the)\b/gi, '')
          .trim();

        const foundSong = findBestSong(songQuery);
        if (!foundSong) {
          const resp = `Sorry, I couldn't find "${songQuery}".`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
          return;
        }

        const success = await addSongToPlaylist(foundSong.song, playlistName);
        if (success) {
          const resp = `Added "${foundSong.song.title}" to "${playlistName}" ✅`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
        } else {
          const resp = `Couldn't find a playlist called "${playlistName}". Try creating it first.`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
        }
        return;
      }

      // ── REMOVE SONG FROM PLAYLIST ─────────────────
      // Matches: "remove [song] from [playlist]", "take [song] out of [playlist]"
      const removeFromPlaylistRegex = /\b(remove|take|get rid of)\s+(.+?)\s+(?:from|out of|off)\s+(.+)/i;
      const removeMatch = userText.match(removeFromPlaylistRegex);
      
      if (removeMatch) {
        const songQuery = removeMatch[2].trim();
        // Clean up the playlist name (remove "the", "playlist", "please", etc.)
        let rawPlaylistName = removeMatch[3].trim().replace(/\b(playlist|mix|the)\b/gi, '').trim();
        const fillers = /\b(hey soundie|soundie|can you|please|i want to|let'?s|could you|would you mind|just|go ahead and|for me|right now)\b/gi;
        const playlistName = rawPlaylistName.replace(fillers, '').trim();

        // 1. Find the song in your library
        const foundSong = findBestSong(songQuery);
        if (!foundSong) {
          const resp = `I couldn't find "${songQuery}" in your library.`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
          return;
        }

        // 2. Find the playlist ID (Case-insensitive)
        const q = query(collection(db, 'playlists'), where('userId', '==', user?.id));
        const snapshot = await getDocs(q);
        const targetDoc = snapshot.docs.find(d => d.data().name.toLowerCase() === playlistName.toLowerCase());

        if (targetDoc) {
          const playlistId = targetDoc.id;
          try {
            // 3. Delete the exact document from the UI's subcollection
            await deleteDoc(doc(db, 'playlists', playlistId, 'songs', foundSong.song.id));
            
            const resp = `Removed "${foundSong.song.title}" from your "${targetDoc.data().name}" playlist.`;
            setAiResponse(resp);
            await speakWithUnreal(resp);
          } catch (err) {
            const resp = "I had trouble removing that song. Please try again.";
            setAiResponse(resp);
            await speakWithUnreal(resp);
          }
        } else {
          const resp = `I couldn't find a playlist called "${playlistName}".`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
        }
        return;
      }

      // Matches "play something", "play anything", "play a random song", etc.
      if (/\b(play|put on|start)\s+(something|anything|a song)\s*(random)?\b/.test(lower) || /\b(play|put on|start)\s+(a\s+)?random\s+(song|track|music)\b/.test(lower)) {
        const lib = globalLibrary.length > 0 ? globalLibrary : queue;
        
        if (lib.length > 0) {
          const randomTrack = lib[Math.floor(Math.random() * lib.length)];
          playSong(randomTrack);
          const resp = `Playing something random. Here is "${randomTrack.title}" by ${randomTrack.artist}.`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
        } else {
          const resp = `Your library is empty, so I don't have anything random to play!`;
          setAiResponse(resp);
          await speakWithUnreal(resp);
        }
        return;
      }
      

      // --- 4. CREATE PLAYLIST ---
      if (/\b(create|make|new|start|add)\b.*\b(playlist|play ?list|mix)\b/i.test(lower)) {
        const nameMatch = userText.match(/["']([^"']{2,})["']|(?:name|called|title|for)\s+["']?([^"']{2,})["']?/i);
        const playlistName = nameMatch ? (nameMatch[1] || nameMatch[2] || '').trim() : '';

        if (playlistName) {
          const success = await actuallyCreatePlaylist(playlistName);
          if (success) {
            const resp = `Playlist "${playlistName}" created successfully! 🔥`;
            setAiResponse(resp);
            await speakWithUnreal(resp);
          } else {
            const resp = "Sorry, I couldn't create the playlist right now.";
            setAiResponse(resp);
            await speakWithUnreal(resp);
          }
        } else {
          setAwaitingPlaylistName(true);
          const resp = "Great! What name do you want for this new playlist?";
          setAiResponse(resp);
          await speakWithUnreal(resp);
        }
        return;
      }

      // --- 4.5 DELETE PLAYLIST ---
      if (/\b(delete|remove|erase|destroy)\b.*\b(playlist|mix)\b/i.test(lower)) {
        let playlistName = '';
        
        // 1. Capture the potential name from the phrase
        const matchAfter = lower.match(/\b(?:playlist|mix)\s+(?:called\s+|named\s+)?["']?([^"']+)["']?/i);
        const matchBefore = lower.match(/\b(delete|remove|erase)\s+(?:the\s+|my\s+)?(.+?)\s+(?:playlist|mix)\b/i);
        
        if (matchAfter && matchAfter[1]) {
          playlistName = matchAfter[1].trim();
        } else if (matchBefore && matchBefore[2]) {
          playlistName = matchBefore[2].trim();
        }

        // 2. Clean up common "voice fluff" that regex might have caught
        const fillers = /\b(hey soundie|soundie|can you|please|i want to|let'?s|could you|would you mind|just|go ahead and|for me|right now)\b/gi;
        playlistName = playlistName.replace(fillers, '').trim();

        if (playlistName && user?.id) {
          // 3. To handle case-sensitivity, we fetch ALL user playlists and check the name locally
          const q = query(
            collection(db, 'playlists'),
            where('userId', '==', user.id)
          );
          
          const snapshot = await getDocs(q);
          // Find a case-insensitive match manually
          const targetDoc = snapshot.docs.find(d => d.data().name.toLowerCase() === playlistName.toLowerCase());
          
          if (targetDoc) {
            // Lock the target in state for the "Yes/No" decision factor
            setPendingPlaylistDeletion({ id: targetDoc.id, name: targetDoc.data().name });
            
            const resp = `Are you absolutely sure you want to delete the playlist "${targetDoc.data().name}"? This cannot be undone.`;
            setAiResponse(resp);
            await speakWithUnreal(resp);
          } else {
            const resp = `I couldn't find a playlist called "${playlistName}" in your library.`;
            setAiResponse(resp);
            await speakWithUnreal(resp);
          }
        } else {
          const resp = "Please tell me the name of the playlist you want to delete.";
          setAiResponse(resp);
          await speakWithUnreal(resp);
        }
        return;
      }

      // --- 5. GREETINGS ---
      if (/^(hi|hello|hey|sup|yo|good (morning|afternoon|evening)|hiya|howdy)/.test(lower)) {
        const greetings = ["Hey! What's the vibe today?", "Hello! Ready to make some playlists?", "Yo! Soundie here 🎧"];
        const resp = greetings[Math.floor(Math.random() * greetings.length)];
        setAiResponse(resp);
        await speakWithUnreal(resp);
        return;
      }

      // --- 6. GRATITUDE / THANK YOU ---
      if (/\b(thank you|thanks|thx|appreciate it)\b/i.test(lower)) {
        const replies = [
          "You're welcome!",
          "Anytime! Let me know if you need anything else.",
          "No problem, enjoy the music!",
          "Always here to help!"
        ];
        const resp = replies[Math.floor(Math.random() * replies.length)];
        setAiResponse(resp);
        await speakWithUnreal(resp);
        return;
      }

      // --- 8. 8D AUDIO CONTROL ---
      if (/\b(8d|eight d|3d|spatial)\b.*\b(audio|sound|mode|effect)\b/i.test(lower)) {
        const turnOn = /\b(on|enable|start|activate)\b/.test(lower);
        const turnOff = /\b(off|disable|stop|deactivate)\b/.test(lower);
        
        if (turnOn) {
          localStorage.setItem('sw_8d_mode', 'true');
          window.dispatchEvent(new Event('sw-settings-updated'));
          const resp = "8D Spatial Audio is now enabled. Enjoy the 360-degree soundscape.";
          setAiResponse(resp);
          await speakWithUnreal(resp);
          return;
        } else if (turnOff) {
          localStorage.setItem('sw_8d_mode', 'false');
          window.dispatchEvent(new Event('sw-settings-updated'));
          const resp = "8D Audio has been disabled.";
          setAiResponse(resp);
          await speakWithUnreal(resp);
          return;
        }
      }

      // --- 9. SLEEP TIMER SETTING ---
      const sleepMatch = lower.match(/\b(sleep timer|stop music|turn off)\b.*\b(in|for)\b\s+(\d+)\s+(minute|min|hour|hr)s?\b/i);
      if (sleepMatch) {
        let minutes = parseInt(sleepMatch[3]);
        const unit = sleepMatch[4].toLowerCase();
        if (unit.startsWith('hour') || unit === 'hr') minutes *= 60;

        localStorage.setItem('sw_sleep_timer', minutes.toString());
        window.dispatchEvent(new Event('sw-settings-updated'));
        
        const resp = `Got it. I'll stop the music and close the player in ${minutes} minutes. Sleep well!`;
        setAiResponse(resp);
        await speakWithUnreal(resp);
        return;
      }

      // --- 10. EXIT APP COMMAND ---
      if (/\b(exit|close|quit)\b.*\b(app|application|soundwave)\b/i.test(lower)) {
        if (Capacitor.isNativePlatform()) {
          const resp = "Closing SoundWave. See you next time!";
          setAiResponse(resp);
          await speakWithUnreal(resp);
          setTimeout(async () => {
            const { App } = await import('@capacitor/app');
            App.exitApp();
          }, 2000);
          return;
        } else {
          const resp = "I can only close the app on mobile devices. On the web, you can just close the browser tab.";
          setAiResponse(resp);
          await speakWithUnreal(resp);
          return;
        }
      }

      // --- 7. DEFAULT FALLBACK (Didn't Understand) ---
      const responses = [
        "I didn't quite catch that. Could you try saying a song name or a command?",
        "I'm not sure I understood. Want to play a song or create a playlist?",
        "Sorry, I didn't get that. What would you like to do with your music?",
        "I didn't understand that command. Try asking me to play a track or adjust the volume."
      ];
      const resp = responses[Math.floor(Math.random() * responses.length)];
      setAiResponse(resp);
      await speakWithUnreal(resp);

    } catch (e) {
      console.error(e);
      const msg = "Something went wrong. Try again.";
      setAiResponse(msg);
      await speakWithUnreal(msg);
    } finally {
      setIsThinking(false);
      isProcessingRef.current = false;
    }
  };

  // ── ACTUAL FIREBASE PLAYLIST CREATION ───────────────────────────────
  const actuallyCreatePlaylist = async (name: string): Promise<boolean> => {
    if (!user?.id) {
      setAiResponse("You need to be logged in to create playlists.");
      return false;
    }

    try {
      await addDoc(collection(db, 'playlists'), {
        userId: user.id,
        name: name,
        songCount: 0,
        createdAt: serverTimestamp(),
        coverArtBase64: null,
      });
      return true;
    } catch (err) {
      console.error('Failed to create playlist:', err);
      return false;
    }
  };

  const speakWithBrowserTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.1;
    u.onstart = () => { setIsSpeaking(true); startVoiceReactive(); };
    u.onend = () => { setIsSpeaking(false); stopVoiceReactive(); };
    window.speechSynthesis.speak(u);
  };

  const speakWithUnreal = async (text: string) => {
    if (!text) return;
    if (text.length > 1000 || !UNREAL_KEY) {
      speakWithBrowserTTS(text);
      return;
    }

    setIsSpeaking(true);
    stopVoiceReactive();

    try {
      const apiUrl = 'https://api.v8.unrealspeech.com/stream';
      let audioUrl = '';

      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.post({
          url: apiUrl,
          headers: { 'Authorization': `Bearer ${UNREAL_KEY}`, 'Content-Type': 'application/json' },
          data: { Text: text, VoiceId: 'af_nicole', Bitrate: '192k', Speed: '0.1', Pitch: '1.2' },
          responseType: 'blob' // CRITICAL: Tell Capacitor to handle binary data
        });
        
        if (response.status !== 200) throw new Error("Native API Error");
        
        // Capacitor returns blobs as base64 strings! 
        // Do NOT use new Blob(), just format it as a playable data URI:
        audioUrl = `data:audio/mpeg;base64,${response.data}`;
      } else {
        // Web Fallback
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${UNREAL_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ Text: text, VoiceId: 'Hannah', Bitrate: '192k', Speed: '0', Pitch: '1' })
        });
        if (!res.ok) throw new Error();
        const audioBlob = await res.blob();
        audioUrl = URL.createObjectURL(audioBlob);
      }

      if (!audioRef.current) throw new Error();
      audioRef.current.src = audioUrl;

      const startAudioAnalysis = () => {
        try {
          const ctx = getOrCreateCtx();
          if (!mediaElemSrcRef.current) mediaElemSrcRef.current = ctx.createMediaElementSource(audioRef.current!);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          mediaElemSrcRef.current.connect(analyser);
          analyser.connect(ctx.destination);
          startVoiceReactive(); // Tick function will handle animation
        } catch {}
      };

      audioRef.current.onplay = startAudioAnalysis;
      audioRef.current.onended = () => { stopVoiceReactive(); setIsSpeaking(false); };
      audioRef.current.onerror = () => { stopVoiceReactive(); setIsSpeaking(false); };

      await audioRef.current.play();
    } catch {
      console.log("Unreal Speech failed, falling back to browser TTS");
      speakWithBrowserTTS(text);
    }
  };

  

  const handleClose = () => {
    resetState();
    setInternalOpen(false);
    if (onCloseExternal) onCloseExternal();
    setIsTypingMode(false);
    setTypedInput('');
    setIsMiniMode(false);
    forceKillMic();
    window.speechSynthesis?.cancel();
    stopVoiceReactive();
    document.body.style.filter = '';
  };

  const state = isListening ? 'listening' : isThinking ? 'thinking' : isSpeaking ? 'speaking' : 'idle';
  const stateLabel = { listening: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING', idle: '' }[state];
  const isActive = state !== 'idle';
  const glowHex = Math.round(blobGlow * 90).toString(16).padStart(2, '0');
  const glowBlur = 18 + blobWave * 0.22;
  const ringScale = 1 + (blobScale - 1) * 1.9;

  if (!Capacitor.isNativePlatform() || !soundieEnabled) return null;

  return (
    <>
    {/* PiP orb — renders independently of modalOpen so it survives parent closing Soundie */}
    {isMiniMode && (
      <div className="soundie-pip-mode">
        <div
          className="soundie-pip-orb relative overflow-hidden rounded-full elevenlabs-mesh"
          onClick={() => {
            setIsMiniMode(false);
            // Re-open the sheet: if controlled externally, parent handles it via onClose
            // For internal mode, flip internalOpen
            setInternalOpen(true);
          }}
        >
          <div className="absolute inset-0 grain-overlay z-10" />
          <Mic size={20} className="absolute inset-0 m-auto text-white z-20 animate-pulse" />
        </div>
      </div>
    )}

    {modalOpen && !isMiniMode && (
      <div className="soundie-overlay fixed inset-0 z-[200] flex items-end justify-center pb-0">
        <>
          <div className="absolute inset-0 soundie-backdrop" onClick={handleClose} />
          <div className="soundie-sheet relative w-full max-w-sm mx-auto rounded-t-[2.5rem] flex flex-col items-center pt-5 pb-10 px-6 soundie-slide-up">
            <div className="soundie-handle mb-6" />
            <div className="w-full flex items-center justify-between mb-8 px-1">
              <div>
                <p className="soundie-eyebrow">AI Assistant</p>
                <h2 className="soundie-title">Soundie</h2>
              </div>
              <div className="soundie-state-pill" data-state={state}>
                <span className="soundie-state-dot" data-state={state} />
                <span className="soundie-state-text">{state === 'idle' ? 'Ready' : stateLabel}</span>
              </div>
            </div>

            <div className="relative flex items-center justify-center mb-8" style={{ width: 200, height: 200 }}>
              {isActive && (
                <>
                  <div className="soundie-ring" style={{ '--ring-color': colors.hex, '--ring-scale': ringScale * 1.18, '--ring-opacity': 0.18 + blobGlow * 0.4 } as any} />
                  <div className="soundie-ring" style={{ '--ring-color': colors.hex, '--ring-scale': ringScale * 1.07, '--ring-opacity': 0.1 + blobGlow * 0.22 } as any} />
                </>
              )}
              <div className="soundie-glow-halo" style={{ background: `radial-gradient(circle, ${colors.hex}${glowHex} 0%, transparent 70%)`, filter: `blur(${glowBlur}px)`, transform: `scale(${blobScale * 1.2})` }} />
              <div className="soundie-orb" style={{ transform: `scale(${blobScale})` }}>
                <div className="absolute inset-0 rounded-full elevenlabs-mesh" style={{ filter: 'blur(1px)' }} />
                <div className="absolute inset-0 rounded-full grain-overlay z-10" />
                <div className="soundie-orb-shine" />
                {isActive && (
                  <div className="soundie-orb-overlay">
                    {state === 'thinking' && <div className="soundie-thinking-dots"> {[0,1,2].map(i => <div key={i} className="soundie-dot" style={{animationDelay: `${i*0.14}s`}} />)} </div>}
                    {state === 'speaking' && <div className="soundie-bars"> {[0,1,2,3,4].map(i => <div key={i} className="soundie-bar" style={{animationDelay: `${i*0.09}s`}} />)} </div>}
                    {state === 'listening' && <div className="soundie-listen-icon"><Mic size={28} /></div>}
                  </div>
                )}
              </div>
            </div>

            <div className="soundie-response-card w-full mb-6">
              {transcript && <p className="soundie-transcript">"{transcript}"</p>}
              {aiResponse && <p className="soundie-response-text" style={{ color: colors.hex }}>{aiResponse}</p>}
              {!transcript && !aiResponse && <p className="soundie-hint">{isTypingMode ? 'Type your request...' : 'Tap the mic and speak'}</p>}
            </div>

            {isTypingMode && (
              <div className="soundie-input-row w-full mb-6">
                <input ref={inputRef} type="text" value={typedInput} onChange={e => setTypedInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTypedSubmit()} placeholder="Ask Soundie anything…" className="soundie-input" />
                <button onClick={handleTypedSubmit} className="soundie-send-btn" style={{ color: typedInput.trim() ? colors.hex : 'rgba(255,255,255,0.2)' }}>
                  <Send size={17} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button onClick={() => setIsTypingMode(p => !p)} className="soundie-ctrl-btn" data-active={isTypingMode}>
                <Keyboard size={18} />
              </button>
              <button onClick={startListening} disabled={isListening || isSpeaking || isThinking} className="soundie-mic-btn">
                <Mic size={22} />
              </button>
              <div style={{ width: 48, height: 48 }} />
            </div>

            <button onClick={handleClose} className="soundie-dismiss mt-7">Dismiss</button>
          </div>
        </>
      </div>
    )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes elevenlabs-swirl {
          0%   { background-position: 0% 0%;    transform: scale(1) rotate(0deg); }
          50%  { background-position: 100% 100%; transform: scale(1.05) rotate(15deg); }
          100% { background-position: 0% 100%;  transform: scale(1) rotate(-10deg); }
        }
        .elevenlabs-mesh {
          background:
            radial-gradient(circle at 70% 30%, rgba(249,115,22,1) 0%, transparent 60%),
            radial-gradient(circle at 20% 20%, rgba(139,92,246,1) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(236,72,153,1) 0%, transparent 60%),
            radial-gradient(circle at 10% 90%, rgba(14,165,233,1) 0%, transparent 60%);
          background-size: 150% 150%;
          animation: elevenlabs-swirl 6s ease-in-out infinite alternate;
        }
        .grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
          opacity: 0.4;
          pointer-events: none;
        }

        @keyframes soundie-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .soundie-slide-up {
          animation: soundie-slide-up 0.42s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }

        .soundie-overlay { pointer-events: all; }
        .soundie-backdrop {
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(18px) saturate(1.4);
          -webkit-backdrop-filter: blur(18px) saturate(1.4);
        }

        .soundie-sheet {
          background: linear-gradient(160deg, #111114 0%, #0d0d10 100%);
          border-top: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 -20px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset;
          font-family: 'DM Sans', sans-serif;
        }

        .soundie-handle {
          width: 40px; height: 4px;
          border-radius: 99px;
          background: rgba(255,255,255,0.14);
        }

        .soundie-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.32);
          margin-bottom: 2px;
        }
        .soundie-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .soundie-state-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px 6px 8px;
          border-radius: 99px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
          transition: background 0.3s;
        }
        .soundie-state-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          transition: background 0.3s;
        }
        .soundie-state-dot[data-state="listening"] { background: #22c55e; box-shadow: 0 0 8px #22c55e88; animation: soundie-pulse-dot 1s ease-in-out infinite; }
        .soundie-state-dot[data-state="thinking"]  { background: #f59e0b; box-shadow: 0 0 8px #f59e0b88; animation: soundie-pulse-dot 0.7s ease-in-out infinite; }
        .soundie-state-dot[data-state="speaking"]  { background: #60a5fa; box-shadow: 0 0 8px #60a5fa88; animation: soundie-pulse-dot 0.5s ease-in-out infinite; }
        @keyframes soundie-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
        .soundie-state-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }

        /* Add to your existing <style> block */
        .soundie-pip-mode {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          z-index: 9999;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .soundie-pip-orb {
          width: 100%;
          height: 100%;
        }

        .soundie-orb {
          position: relative;
          width: 180px; height: 180px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .soundie-orb-shine {
          position: absolute;
          top: 6%; left: 10%;
          width: 50%; height: 35%;
          background: radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.28) 0%, transparent 80%);
          border-radius: 50%;
          z-index: 20;
          pointer-events: none;
        }
        .soundie-glow-halo {
          position: absolute;
          width: 180px; height: 180px;
          border-radius: 50%;
          pointer-events: none;
        }

        .soundie-ring {
          position: absolute;
          width: 180px; height: 180px;
          border-radius: 50%;
          pointer-events: none;
          border: 1.5px solid var(--ring-color);
          opacity: var(--ring-opacity);
          transform: scale(var(--ring-scale));
          transition: transform 70ms ease-out, opacity 70ms ease-out;
        }

        .soundie-orb-overlay {
          position: absolute; inset: 0; z-index: 30;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.38);
          backdrop-filter: blur(3px);
          border-radius: 50%;
        }

        .soundie-thinking-dots { display: flex; gap: 6px; }
        @keyframes soundie-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-7px); opacity: 1; }
        }
        .soundie-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #fff;
          animation: soundie-bounce 0.85s ease-in-out infinite;
        }

        .soundie-bars { display: flex; align-items: center; gap: 3px; height: 28px; }
        @keyframes soundie-bar-wave {
          0%, 100% { transform: scaleY(0.3); }
          50%       { transform: scaleY(1); }
        }
        .soundie-bar {
          width: 3px; height: 100%;
          border-radius: 99px;
          background: rgba(255,255,255,0.9);
          transform-origin: center;
          animation: soundie-bar-wave 0.6s ease-in-out infinite;
        }

        .soundie-listen-icon { color: #fff; opacity: 0.95; }

        .soundie-response-card {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          padding: 18px 20px;
          min-height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .soundie-transcript {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          font-style: italic;
          line-height: 1.5;
        }
        .soundie-response-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          line-height: 1.6;
          font-weight: 400;
        }
        .soundie-hint {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.2);
          text-align: center;
          width: 100%;
        }

        .soundie-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          padding: 13px 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .soundie-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #fff;
        }
        .soundie-input::placeholder { color: rgba(255,255,255,0.22); }
        .soundie-send-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.2s, transform 0.15s;
        }
        .soundie-send-btn:active { transform: scale(0.88); }

        .soundie-ctrl-btn {
          width: 48px; height: 48px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.12s;
          cursor: pointer;
        }
        .soundie-ctrl-btn:active { transform: scale(0.9); }

        .soundie-mic-btn {
          width: 64px; height: 64px;
          border-radius: 20px;
          border: 1.5px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.5);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.25s, border-color 0.25s, color 0.25s, box-shadow 0.25s, transform 0.12s, opacity 0.2s;
          cursor: pointer;
        }
        .soundie-mic-btn:active { transform: scale(0.9); }
        .soundie-mic-btn:disabled { cursor: not-allowed; }

        .soundie-dismiss {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          transition: color 0.2s;
        }
        .soundie-dismiss:hover { color: rgba(255,255,255,0.45); }
      `}</style>

      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />
    </>
  );
};

export default SoundieAssistant;