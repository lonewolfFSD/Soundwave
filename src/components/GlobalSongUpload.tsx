import React, { useRef, useState, useEffect } from 'react'
import { Upload, X, CheckCircle, Music, Image as ImageIcon, Plus, AlertCircle, FileText, Loader2, CloudUpload, HardDrive, ShieldAlert } from 'lucide-react'
import { db } from '../utils/firebase'
import { useAuth } from '../context/AuthContext' 
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'

const CLOUD_NAME = "dhaymyifo"; 
const UPLOAD_PRESET = "ml_default"; 
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac']
const MAX_UPLOAD_LIMIT = 5

interface GlobalSongUploadProps {
  onClose: () => void
}

interface UploadItem {
  id: string
  audioFile: File
  coverFile: File | null
  coverPreview: string | null
  title: string
  artist: string 
  lyrics: string 
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
}

// --- THEME ENGINE CONSTANT ---
const getThemeStyles = (theme: string) => {
  const themes: Record<string, any> = {
    default: { modalBg: 'bg-[#09090b]/95', headerBorder: 'border-white/10', textMain: 'text-slate-100', textMuted: 'text-zinc-400', primaryBtn: 'bg-slate-200 text-black hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)]', activeText: 'text-slate-300', activeBg: 'bg-slate-200', hoverBg: 'hover:bg-white/10', inputBg: 'bg-black/60 border-white/10 focus:border-slate-400', uploadIconBg: 'bg-white/5', uploadIcon: 'text-slate-300', dragBorder: 'border-slate-400', dragBg: 'bg-white/10' },
    sunset: { modalBg: 'bg-[#1a0502]/95', headerBorder: 'border-orange-500/20', textMain: 'text-orange-50', textMuted: 'text-orange-200/60', primaryBtn: 'bg-orange-500 text-black hover:bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]', activeText: 'text-orange-400', activeBg: 'bg-orange-500', hoverBg: 'hover:bg-orange-500/20', inputBg: 'bg-black/60 border-orange-500/20 focus:border-orange-400', uploadIconBg: 'bg-orange-500/10', uploadIcon: 'text-orange-500', dragBorder: 'border-orange-500', dragBg: 'bg-orange-500/10' },
    valentine: { modalBg: 'bg-[#1f0610]/95', headerBorder: 'border-pink-500/20', textMain: 'text-pink-50', textMuted: 'text-pink-200/60', primaryBtn: 'bg-pink-500 text-black hover:bg-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]', activeText: 'text-pink-400', activeBg: 'bg-pink-500', hoverBg: 'hover:bg-pink-500/20', inputBg: 'bg-black/60 border-pink-500/20 focus:border-pink-400', uploadIconBg: 'bg-pink-500/10', uploadIcon: 'text-pink-500', dragBorder: 'border-pink-500', dragBg: 'bg-pink-500/10' },
    jungle: { modalBg: 'bg-[#03170b]/95', headerBorder: 'border-emerald-500/20', textMain: 'text-emerald-50', textMuted: 'text-emerald-200/60', primaryBtn: 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]', activeText: 'text-emerald-400', activeBg: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-500/20', inputBg: 'bg-black/60 border-emerald-500/20 focus:border-emerald-400', uploadIconBg: 'bg-emerald-500/10', uploadIcon: 'text-emerald-500', dragBorder: 'border-emerald-500', dragBg: 'bg-emerald-500/10' },
    ocean: { modalBg: 'bg-[#04121c]/95', headerBorder: 'border-cyan-500/20', textMain: 'text-cyan-50', textMuted: 'text-cyan-200/60', primaryBtn: 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]', activeText: 'text-cyan-400', activeBg: 'bg-cyan-500', hoverBg: 'hover:bg-cyan-500/20', inputBg: 'bg-black/60 border-cyan-500/20 focus:border-cyan-400', uploadIconBg: 'bg-cyan-500/10', uploadIcon: 'text-cyan-500', dragBorder: 'border-cyan-500', dragBg: 'bg-cyan-500/10' },
    cyberpunk: { modalBg: 'bg-[#120322]/95', headerBorder: 'border-fuchsia-500/20', textMain: 'text-fuchsia-50', textMuted: 'text-fuchsia-200/60', primaryBtn: 'bg-fuchsia-500 text-black hover:bg-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.2)]', activeText: 'text-fuchsia-400', activeBg: 'bg-fuchsia-500', hoverBg: 'hover:bg-fuchsia-500/20', inputBg: 'bg-black/60 border-fuchsia-500/20 focus:border-fuchsia-400', uploadIconBg: 'bg-fuchsia-500/10', uploadIcon: 'text-fuchsia-500', dragBorder: 'border-fuchsia-500', dragBg: 'bg-fuchsia-500/10' },
    midnight: { modalBg: 'bg-[#0f071c]/95', headerBorder: 'border-violet-500/20', textMain: 'text-violet-50', textMuted: 'text-violet-200/60', primaryBtn: 'bg-violet-500 text-black hover:bg-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]', activeText: 'text-violet-400', activeBg: 'bg-violet-500', hoverBg: 'hover:bg-violet-500/20', inputBg: 'bg-black/60 border-violet-500/20 focus:border-violet-400', uploadIconBg: 'bg-violet-500/10', uploadIcon: 'text-violet-500', dragBorder: 'border-violet-500', dragBg: 'bg-violet-500/10' },
    coffee: { modalBg: 'bg-[#140c06]/95', headerBorder: 'border-amber-600/20', textMain: 'text-amber-50', textMuted: 'text-amber-200/60', primaryBtn: 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.2)]', activeText: 'text-amber-500', activeBg: 'bg-amber-500', hoverBg: 'hover:bg-amber-600/20', inputBg: 'bg-black/60 border-amber-600/20 focus:border-amber-600', uploadIconBg: 'bg-amber-600/10', uploadIcon: 'text-amber-500', dragBorder: 'border-amber-500', dragBg: 'bg-amber-500/10' }
  }
  return themes[theme] || themes['default'];
}

// Google Drive Inline SVG Logo
const GoogleDriveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.6,66.85l15.25,26.4h52.5l-15.25-26.4H6.6z M59.1,66.85l15.25-26.4H21.85L6.6,66.85H59.1z M21.85,40.45l15.25-26.4h52.5l-15.25,26.4H21.85z" fill="currentColor"/>
    <path d="M66.9,22.65L43.65,0L0.4,75h23.25l43.25-52.35z" fill="#0066DA"/>
    <path d="M0.4,75L23.65,34.55l23.25,40.45H0.4z M43.65,0H86.9l-23.25,40.45H20.4L43.65,0z M86.9,75H40.4L63.65,34.55L86.9,75z" fill="#00AC47"/>
    <path d="M86.9,75L63.65,34.55l-23.25,40.45H86.9z" fill="#EA4335"/>
    <path d="M20.4,40.45L43.65,0h43.25L63.65,40.45H20.4z" fill="#FFBA00"/>
  </svg>
);

const CLIENT_ID = "928688843298-mnq71t4hk7g57nlikhtd5nmvimb2927d.apps.googleusercontent.com";
const API_KEY = "AIzaSyDgQ59a7lLRAMwAgKwDfgKsm3WtmsjpQpY";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

const GlobalSongUpload: React.FC<GlobalSongUploadProps> = ({ onClose }) => {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [openLyricsId, setOpenLyricsId] = useState<string | null>(null);
  const [currentUploadCount, setCurrentUploadCount] = useState(0);
  const [loadingQuota, setLoadingQuota] = useState(true);
  
  // Drag & Drop State
  const [isDragOver, setIsDragOver] = useState(false);

  // --- PREFERENCES & THEME STATE ---
  const [theme, setTheme] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    return isNative ? (localStorage.getItem('soundwave_theme') || 'default') : 'default';
  });

  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true');

  // Track user uploaded song count
  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setLoadingQuota(false);
      return;
    }

    const unsub = onSnapshot(collection(db, 'users', userId, 'uploads'), (snapshot) => {
      setCurrentUploadCount(snapshot.size);
      setLoadingQuota(false);
    }, (err) => {
      console.error('Error fetching upload count:', err);
      setLoadingQuota(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    const handleThemeUpdate = () => {
      setTheme(localStorage.getItem('soundwave_theme') || 'default');
    };

    const handleSettingsUpdate = () => {
      setReduceMotion(localStorage.getItem('sw_reduce_motion') === 'true');
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

  const activeThemeObj = getThemeStyles(theme);

  // Inside your component
  const tokenClientRef = useRef<any>(null);

  // Ensure the Google scripts load when the component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && !window.google?.accounts) {
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, []);

  const initGoogle = () => {
    // Check if GIS is loaded
    if (!window.google?.accounts?.oauth2) {
      console.error("Google Identity Services script not loaded yet.");
      return;
    }

    // 1. Initialize the OAuth2 Token Client. FIXED: added .current
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: "", // We will overwrite this in handleGoogleDriveUpload
    });

    // 2. Load the GAPI (Picker) library
    if (window.gapi) {
      window.gapi.load("client:picker", async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
          });
        } catch (err) {
          console.error("GAPI init error:", err);
        }
      });
    }
  };

  // --- DRAG LOGIC FOR MOBILE CLOSE ---
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0) { 
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 150) {
      onClose();
    } else {
      setDragY(0); 
    }
  };

  // --- FILE PROCESSING LOGIC WITH 5-SONG QUOTA ---
  const processFiles = (selectedFiles: File[]) => {
    const remainingSlots = MAX_UPLOAD_LIMIT - currentUploadCount - items.length;

    if (remainingSlots <= 0) {
      alert(`Upload limit reached! You have used ${currentUploadCount}/${MAX_UPLOAD_LIMIT} uploaded tracks. Please remove existing uploads to add new ones, or use YouTube Music search to play and save unlimited songs!`);
      return;
    }

    const validFiles = selectedFiles
      .filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        return ext && SUPPORTED_AUDIO_FORMATS.includes(ext)
      })

    if (validFiles.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more song(s) to stay within the 5-upload limit.`);
    }

    const filesToProcess = validFiles.slice(0, remainingSlots);

    const newItems: UploadItem[] = filesToProcess
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        audioFile: file, 
        coverFile: null, 
        coverPreview: null,
        title: file.name.replace(/\.[^/.]+$/, ''), 
        artist: '', 
        lyrics: '', 
        status: 'pending', 
        progress: 0
      }))
    setItems(prev => [...prev, ...newItems])
  }

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  }

  // --- GOOGLE DRIVE HANDLER ---
  const handleGoogleDriveUpload = () => {
    if (!tokenClientRef.current) {
      console.error("Google Token Client is not defined yet.");
      initGoogle();
      if (!tokenClientRef.current) return;
    }

    tokenClientRef.current.callback = async (response: any) => {
      if (response.error !== undefined) {
        throw response;
      }
      
      const accessToken = response.access_token;

      // 1. Configure the view to only show audio files
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      view.setMimeTypes("audio/mpeg,audio/wav,audio/ogg,audio/x-m4a,audio/flac,audio/*");

      // 2. Build and show the Picker
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED) // Allow multiple songs
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setCallback(async (data: any) => {
          // 3. When the user clicks "Select"
          if (data.action === window.google.picker.Action.PICKED) {
            const fetchedFiles: File[] = [];
            
            // Loop through all selected files
            for (const doc of data.docs) {
              const fileId = doc.id;
              const fileName = doc.name;
              const mimeType = doc.mimeType;

              try {
                // 4. Download the actual file data from Google Drive
                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (!res.ok) throw new Error(`Failed to download ${fileName}`);
                
                // 5. Convert the downloaded data into a JS File object
                const blob = await res.blob();
                const file = new File([blob], fileName, { type: mimeType });
                fetchedFiles.push(file);

              } catch (e) {
                console.error("Drive download error:", e);
                alert(`Could not download "${fileName}" from Drive. Make sure it's fully uploaded to Drive.`);
              }
            }

            // 6. Feed the downloaded files straight into your existing UI logic!
            if (fetchedFiles.length > 0) {
              processFiles(fetchedFiles);
            }
          }
        })
        .build();

      picker.setVisible(true);
    };

    tokenClientRef.current.requestAccessToken();
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // --- UPLOAD LOGIC ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); 
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string); 
      reader.onerror = e => reject(e)
    })
  }

  const uploadToCloudinary = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('resource_type', 'video') 

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`)
      xhr.upload.onprogress = (e) => onProgress(Math.round((e.loaded / e.total) * 100))
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url)
        else reject(new Error("Cloudinary Failed"))
      }
      xhr.onerror = () => reject(new Error("Network Error"))
      xhr.send(formData)
    })
  }

  const handleUploadAll = async () => {
    const userId = user?.uid || user?.id;

    if (!userId) {
      alert("Error: No active user session. Please log out and log back in.")
      return
    }

    const incomplete = items.filter(i => !i.coverFile || !i.artist.trim() || !i.title.trim())
    if (incomplete.length > 0) {
      alert("All fields (Title, Artist, Cover) are required.")
      return
    }

    setIsUploading(true)
    let successCount = 0

    for (const item of items) {
      if (item.status === 'success') { successCount++; continue; }

      try {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 5 } : i))
        
        const audioUrl = await uploadToCloudinary(item.audioFile, (p) => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: Math.floor(p * 0.9) } : i))
        })

        const coverBase64 = await fileToBase64(item.coverFile!)

        await addDoc(collection(db, 'users', userId, 'uploads'), {
          title: item.title.trim(),
          artist: item.artist.trim(),
          lyrics: item.lyrics, 
          url: audioUrl,
          coverArtBase64: coverBase64,
          addedAt: serverTimestamp(),
          duration: 0 
        })

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', progress: 100 } : i))
        successCount++
      } catch (error) {
        console.error("Upload error:", error)
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', progress: 0 } : i))
      }
    }
    setIsUploading(false)
    if (successCount === items.length) {
        setTimeout(onClose, 800)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center pointer-events-none sm:p-4">
      
      {/* Backdrop with Fade In */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-xl pointer-events-auto ${reduceMotion ? '' : 'transition-opacity duration-300 ease-out'}`}
        onClick={onClose}
      />

      {/* Modal Container - Reduced Width to 2xl */}
      <div 
        className={`
          pointer-events-auto w-full md:w-full md:max-w-2xl 
          ${activeThemeObj.modalBg} backdrop-blur-2xl border border-white/5 
          rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col 
          max-h-[90vh] md:max-h-[80vh] overflow-hidden
          ${reduceMotion ? '' : 'transition-transform duration-300 ease-out animate-in slide-in-from-bottom-10 md:zoom-in-95'}
        `}
        style={{ transform: `translateY(${dragY}px)` }}
      >
        
        {/* Mobile Drag Handle Area */}
        <div 
          className="md:hidden w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing bg-transparent relative z-20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header - Reduced Padding & Font size */}
        <div className={`flex items-center justify-between px-5 sm:px-7 pb-4 pt-4 md:pt-6 border-b border-white/5 bg-transparent`}>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-md sm:text-2xl font-black tracking-tight ${activeThemeObj.textMain}`} style={{ fontFamily: 'Syne, sans-serif' }}>Library Sync</h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                currentUploadCount >= MAX_UPLOAD_LIMIT
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-white/10 text-white/80 border-white/10'
              }`}>
                {currentUploadCount}/{MAX_UPLOAD_LIMIT} Uploads Used
              </span>
            </div>
            <p className={`text-[9.5px] mt-1.5 uppercase tracking-widest font-bold ${activeThemeObj.textMuted}`}>Upload up to 5 songs to your private storage</p>
          </div>
          <button onClick={onClose} className={`w-9 h-9 rounded-md flex items-center justify-center border border-white/5 ${reduceMotion ? '' : 'transition-all'} hidden md:flex ${activeThemeObj.textMuted} bg-black/20 hover:bg-white/10 hover:${activeThemeObj.textMain}`}>
            <X size={16} />
          </button>
        </div>

        {/* Quota reached alert banner */}
        {currentUploadCount >= MAX_UPLOAD_LIMIT && (
          <div className="mx-5 sm:mx-7 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-200 text-xs">
            <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-bold text-amber-300">5-Song Upload Limit Reached</p>
              <p className="opacity-80 mt-0.5 text-[11px]">
                You have reached your 5 uploaded songs quota. Delete existing tracks to upload new ones, or use <strong>YouTube Music search</strong> for unlimited free streaming and playlists!
              </p>
            </div>
          </div>
        )}

        {/* Content Area - Reduced Padding */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-7 py-4 scrollbar-hide bg-gradient-to-b from-white/[0.02] to-transparent`}>
          {!user ? (
            <div className="text-center py-24">
              <Loader2 className={`animate-spin h-8 w-8 mx-auto mb-5 ${activeThemeObj.activeText}`} />
              <p className={`text-sm font-medium ${activeThemeObj.textMuted}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Verifying secure session...</p>
            </div>
          ) : items.length === 0 ? (
            
            // --- DRAG AND DROP EMPTY STATE ---
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                h-64 md:h-72 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl 
                ${reduceMotion ? '' : 'transition-all duration-300 ease-out'} 
                ${isDragOver 
                  ? `${activeThemeObj.dragBorder} ${activeThemeObj.dragBg} scale-[1.01] shadow-xl` 
                  : `border-white/10 bg-black/40`
                }
              `}
            >
              <div className={`w-16 h-16 hidden md:flex rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-white/5 ${reduceMotion ? '' : 'transition-transform duration-300'} ${isDragOver ? 'scale-110' : ''} ${activeThemeObj.uploadIconBg}`}>
                <CloudUpload className={activeThemeObj.uploadIcon} size={32} />
              </div>
              <p className={`font-black text-lg sm:text-xl tracking-tight ${activeThemeObj.textMain}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className='hidden md:flex'>{isDragOver ? "Drop files here" : "Drag & drop audio files"}</span>
                <span className='md:hidden'>{isDragOver ? "Drop files here" : "Select your music files"}</span>
              </p>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-5 w-full max-w-sm px-6">
                <button 
                  onClick={() => {
                    if (currentUploadCount >= MAX_UPLOAD_LIMIT) {
                      alert('You have reached the 5-upload limit.');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={currentUploadCount >= MAX_UPLOAD_LIMIT}
                  className={`flex-1 py-3 md:py-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-xs font-bold ${activeThemeObj.textMain} ${activeThemeObj.hoverBg} ${reduceMotion ? '' : 'transition-colors'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <HardDrive size={16} className={activeThemeObj.textMuted} />
                  Local Device
                </button>
                <button 
                  onClick={() => {
                    if (currentUploadCount >= MAX_UPLOAD_LIMIT) {
                      alert('You have reached the 5-upload limit.');
                      return;
                    }
                    handleGoogleDriveUpload();
                  }}
                  disabled={currentUploadCount >= MAX_UPLOAD_LIMIT}
                  className={`flex-1 py-3 md:py-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-xs font-bold ${activeThemeObj.textMain} ${activeThemeObj.hoverBg} ${reduceMotion ? '' : 'transition-colors'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <img className='w-4' src="https://cdn-icons-png.flaticon.com/128/5968/5968523.png" alt="" />
                  Google Drive
                </button>
              </div>

              <div className="flex gap-2 mt-5">
                {SUPPORTED_AUDIO_FORMATS.map(ext => (
                  <span key={ext} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] uppercase font-bold text-zinc-500">{ext}</span>
                ))}
              </div>
            </div>

          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className={`bg-black/40 border rounded-xl p-3 sm:p-4 flex flex-col backdrop-blur-md ${reduceMotion ? '' : 'transition-all hover:bg-black/60'} border-white/10`}>
                  <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4`}>
                    
                    {/* Cover Art Upload - Reduced size */}
                    <div className="shrink-0 mx-auto sm:mx-0">
                      <label className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden border border-dashed ${reduceMotion ? '' : 'transition-all'} ${item.coverPreview ? 'border-transparent shadow-lg' : `border-white/10 hover:border-white/30 bg-black/50`}`}>
                        {item.coverPreview ? (
                          <img src={item.coverPreview} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <ImageIcon className={activeThemeObj.textMuted} size={20} />
                            <span className={`text-[8px] font-black uppercase ${activeThemeObj.activeText} px-1.5 py-0.5 bg-white/5 rounded-full border border-white/10`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Cover</span>
                          </div>
                        )}
                        <input type="file" hidden accept="image/*" onChange={(e) => {
                          const f = e.target.files?.[0]; 
                          if (f) setItems(prev => prev.map(i => i.id === item.id ? { ...i, coverFile: f, coverPreview: URL.createObjectURL(f) } : i))
                        }} />
                      </label>
                    </div>

                    {/* Metadata Inputs */}
                    <div className="flex-1 space-y-2 flex flex-col justify-center">
                      <div className="grid sm:grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            value={item.title} 
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                            onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: e.target.value } : i))} 
                            className={`w-full border rounded-lg px-3 py-2 text-xs outline-none font-bold shadow-inner ${reduceMotion ? '' : 'transition-all'} ${activeThemeObj.inputBg} ${activeThemeObj.textMain}`} 
                            placeholder="Track Title" 
                          />
                          <input 
                            type="text" 
                            value={item.artist} 
                            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                            onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, artist: e.target.value } : i))} 
                            className={`w-full border rounded-lg px-3 py-2 text-xs outline-none font-medium shadow-inner ${reduceMotion ? '' : 'transition-all'} ${activeThemeObj.inputBg} ${activeThemeObj.textMain}`} 
                            placeholder="Artist Name" 
                          />
                      </div>

                      {/* Action Row */}
                      <div className="flex justify-between items-center pt-1">
                        <button 
                          onClick={() => setOpenLyricsId(openLyricsId === item.id ? null : item.id)}
                          className={`text-[11px] flex items-center gap-1.5 font-bold px-3 py-1 rounded-lg border shadow-sm ${reduceMotion ? '' : 'transition-all'} ${item.lyrics ? `${activeThemeObj.activeText} border-current ${activeThemeObj.uploadIconBg}` : `${activeThemeObj.textMuted} border-white/10 bg-white/5 hover:bg-white/10 hover:${activeThemeObj.textMain}`}`}
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          <FileText size={12} />
                          {item.lyrics ? 'Edit Lyrics' : 'Add Lyrics'}
                        </button>

                        <div className="flex items-center justify-center">
                          {item.status === 'success' ? (
                            <CheckCircle className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" size={20} />
                          ) : (
                            <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className={`p-1.5 rounded-full border border-transparent hover:border-red-500/30 hover:bg-red-500/10 ${reduceMotion ? '' : 'transition-colors'} ${activeThemeObj.textMuted} hover:text-red-400`}>
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {item.status !== 'pending' && (
                        <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden shadow-inner mt-1">
                          <div className={`h-full ${reduceMotion ? '' : 'transition-all duration-500'} ${activeThemeObj.activeBg}`} style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                      {item.status === 'error' && <p className="text-[10px] text-red-500 flex items-center gap-1.5 font-bold mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}><AlertCircle size={12}/> Upload failed.</p>}
                    </div>
                  </div>

                  {/* Lyrics Editor (Collapsible) */}
                  {openLyricsId === item.id && (
                    <div className={`mt-3 pt-3 border-t border-white/5 ${reduceMotion ? '' : 'animate-in fade-in slide-in-from-top-4 duration-300'}`}>
                      <textarea 
                        value={item.lyrics}
                        onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, lyrics: e.target.value } : i))}
                        placeholder="Paste synchronized lyrics here..."
                        className={`w-full h-28 border rounded-lg p-3 text-[11px] focus:outline-none resize-none font-mono leading-relaxed whitespace-pre-wrap shadow-inner ${activeThemeObj.inputBg} ${activeThemeObj.textMain}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Reduced padding */}
        <div className={`p-4 sm:p-5 border-t mb-4 md:mb-auto bg-black/40 backdrop-blur-xl flex flex-col sm:flex-row gap-3 items-center justify-between border-white/5`}>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            className={`w-full sm:w-auto px-5 py-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${reduceMotion ? '' : 'transition-all'} border border-white/10 bg-white/5 shadow-lg ${activeThemeObj.textMain} hover:bg-white/10 disabled:opacity-50`}
          >
            <Plus size={16} /> Add More
          </button>
          
          <div className="flex-1 flex gap-2.5 w-full sm:w-auto justify-end">
            <button style={{ fontFamily: 'Space Grotesk, sans-serif' }} onClick={onClose} disabled={isUploading} className={`px-5 py-2.5 rounded-xl font-bold text-xs ${reduceMotion ? '' : 'transition-colors'} hidden sm:block border border-transparent ${activeThemeObj.textMuted} hover:${activeThemeObj.textMain} hover:bg-white/5`}>Cancel</button>
            <button 
              onClick={handleUploadAll} 
              disabled={items.length === 0 || isUploading || !user} 
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              className={`w-full sm:w-auto px-8 py-4 rounded-lg text-xs font-black ${reduceMotion ? '' : 'transition-all hover:-translate-y-0.5'} uppercase tracking-widest disabled:opacity-50 disabled:hover:translate-y-0 shadow-2xl ${activeThemeObj.primaryBtn}`}
            >
              {isUploading ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin"/> Syncing...</span> : 'Sync All Tracks'}
            </button>
          </div>
          
        </div>
      </div>
      
      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_AUDIO_FORMATS.map(f => `.${f}`).join(',')} onChange={handleAudioSelect} className="hidden" />
    </div>
  )
}

export default GlobalSongUpload