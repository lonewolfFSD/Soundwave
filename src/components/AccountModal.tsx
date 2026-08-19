import React, { useState, useEffect, useRef } from 'react';
import { 
  X, User, Trash2, Copy, Check, HardDrive, AlertTriangle, 
  Palette, Calendar, Clock, Shield, Monitor, Headphones, 
  Save, Download, Volume2, Edit2, LogOut, Camera, Minimize, 
  Activity, Sliders, Info, Smartphone, Zap, Cpu, MonitorPlay, Fingerprint, Database, Github, ExternalLink, ChevronRight, ChevronLeft,
  Type, Wifi, Home, Mic,
  Battery,
  Lock,
  Sparkles,
  Vibrate
} from 'lucide-react';
import { getAuth, deleteUser, updateProfile } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../images/logo.png'; 
import { updateDynamicFavicon } from '@/utils/themeHelper';

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import { Toast } from '@capacitor/toast';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import DownloadModal from './DownloadModal'; // 🔥 Added Import

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

// --- THEME DATA ---
const AVAILABLE_THEMES = [
  { id: 'default', name: 'High Contrast', category: 'Dark', colors: { activeBorder: 'border-slate-300', shadow: 'shadow-[0_0_20px_rgba(255,255,255,0.1)]', checkBg: 'bg-slate-300', sidebar: 'bg-zinc-950', main: 'bg-black', accent: 'bg-slate-400/50', glow: 'bg-slate-500/10' } },
  { id: 'sunset', name: 'Sunset Vibes', category: 'Warm', colors: { activeBorder: 'border-amber-500', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]', checkBg: 'bg-amber-500', sidebar: 'bg-[#1a0502]', main: 'bg-gradient-to-br from-[#450a0a] to-[#1a0502]', accent: 'bg-amber-500/50', glow: 'bg-amber-500/20' } },
  { id: 'valentine', name: 'Valentine', category: 'Warm', colors: { activeBorder: 'border-pink-500', shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.2)]', checkBg: 'bg-pink-500', sidebar: 'bg-[#1f0610]', main: 'bg-gradient-to-br from-rose-950 to-pink-900', accent: 'bg-pink-500/50', glow: 'bg-pink-500/20' } },
  { id: 'jungle', name: 'Jungle Groove', category: 'Nature', colors: { activeBorder: 'border-emerald-500', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]', checkBg: 'bg-emerald-500', sidebar: 'bg-[#03170b]', main: 'bg-gradient-to-br from-emerald-950 to-green-900', accent: 'bg-emerald-500/50', glow: 'bg-emerald-500/20' } },
  { id: 'ocean', name: 'Deep Ocean', category: 'Cool', colors: { activeBorder: 'border-cyan-500', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]', checkBg: 'bg-cyan-500', sidebar: 'bg-[#04121c]', main: 'bg-gradient-to-br from-[#083344] to-[#04121c]', accent: 'bg-cyan-500/50', glow: 'bg-cyan-500/20' } },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'Dark', colors: { activeBorder: 'border-fuchsia-500', shadow: 'shadow-[0_0_20px_rgba(217,70,239,0.2)]', checkBg: 'bg-fuchsia-500', sidebar: 'bg-[#120322]', main: 'bg-gradient-to-br from-[#3b0764] to-[#120322]', accent: 'bg-fuchsia-500/50', glow: 'bg-fuchsia-500/20' } },
  { id: 'midnight', name: 'Midnight Purple', category: 'Dark', colors: { activeBorder: 'border-violet-500', shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]', checkBg: 'bg-violet-500', sidebar: 'bg-[#0f071c]', main: 'bg-gradient-to-br from-[#2e1065] to-[#0f071c]', accent: 'bg-violet-500/50', glow: 'bg-violet-500/20' } },
  { id: 'coffee', name: 'Mocha / Coffee', category: 'Warm', colors: { activeBorder: 'border-amber-600', shadow: 'shadow-[0_0_20px_rgba(217,119,6,0.2)]', checkBg: 'bg-amber-600', sidebar: 'bg-[#140c06]', main: 'bg-gradient-to-br from-[#451a03] to-[#140c06]', accent: 'bg-amber-600/50', glow: 'bg-amber-600/20' } },
];

const EQUALIZER_PRESETS = ['Flat', 'Bass Boost', 'Electronic', 'Acoustic', 'Vocal Booster', 'Rock'];

// --- APP ICON DATA ---
// Each id must match the <activity-alias android:name> you define in AndroidManifest.xml
const AVAILABLE_APP_ICONS = [
  {
    id: 'default',
    name: 'Classic',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/732ZpjB/rounded.png',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityDefault',
  },
  {
    id: 'galactic',
    name: 'Galactic',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/p6jR5Cdr/Untitled-Project-removebg-preview.png',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityGalactic',
  },
  {
    id: 'arora',
    name: 'Aurora',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/zhYCKg8q/Arora.jpg',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityArora',
  },
  {
    id: 'vortex',
    name: 'Vortex',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/9HdGRbjK/Vortex.jpg',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityVortex',
  },
  {
    id: 'volt',
    name: 'Volt',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/xtNL52wG/Volt.jpg',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityVolt',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/ns12NF6J/Nebula.jpg',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityNebula',
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'Original Soundwave icon',
    // Use your actual icon paths — these are shown as preview swatches
    preview: 'https://i.ibb.co/Fkn9D7Tc/Prism.jpg',
    accentColor: '#e2e2e2',
    // The alias name that matches AndroidManifest.xml (for the default, we enable the main activity)
    alias: '.MainActivityPrism',
  },
];

type TabType = 'profile' | 'appearance' | 'playback' | 'mobile' | 'data' | 'security' | 'device' | 'about' ;

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, user }) => {
  const triggerHaptic = async (style: any = ImpactStyle.Light) => {
    const isHapticEnabled = localStorage.getItem('sw_haptics') !== 'false';
    const isNative = Capacitor.isNativePlatform();
    if (isHapticEnabled && isNative) {
      try { await Haptics.impact({ style }); } catch (e) {}
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showMobileMenu, setShowMobileMenu] = useState(true); // Native Mobile Drill-Down State
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false); // 🔥 State for Download Modal
  
  // Base Settings States
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('soundwave_theme') || 'default';
  });

  // Mobile Native Hardware Preferences
  const [hapticsEnabled, setHapticsEnabled] = useState(localStorage.getItem('sw_haptics') !== 'false');
  const [shakeEnabled, setShakeEnabled] = useState(localStorage.getItem('sw_shake_shuffle') !== 'false');
  const [duckingEnabled, setDuckingEnabled] = useState(localStorage.getItem('sw_ducking') !== 'false');
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(localStorage.getItem('sw_keep_awake') === 'true');
  const [soundieMobileEnabled, setSoundieMobileEnabled] = useState(localStorage.getItem('sw_soundie_enabled') !== 'false');
  const [startupScreen, setStartupScreen] = useState(localStorage.getItem('sw_startup_screen') || 'home');

// Update the theme listener effect
useEffect(() => {
  const handleThemeUpdate = () => {
    setCurrentTheme(localStorage.getItem('soundwave_theme') || 'default');
  };
  
  window.addEventListener('theme-change', handleThemeUpdate);
  window.addEventListener('sw-settings-updated', handleThemeUpdate); // Added this
  
  return () => {
    window.removeEventListener('theme-change', handleThemeUpdate);
    window.removeEventListener('sw-settings-updated', handleThemeUpdate);
  };
}, []);

  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Advanced Settings States
  const [audioQuality, setAudioQuality] = useState<'best' | 'standard'>(() => {
    return (localStorage.getItem('sw_audio_quality') as 'best' | 'standard') || 'best';
  });
  const [autoPlay, setAutoPlay] = useState(localStorage.getItem('sw_autoplay') !== 'false');
  const [crossfade, setCrossfade] = useState(Number(localStorage.getItem('sw_crossfade') || 0));
  const [normalizeVolume, setNormalizeVolume] = useState(localStorage.getItem('sw_normalize') === 'true');
  const [eqPreset, setEqPreset] = useState(localStorage.getItem('sw_eq_preset') || 'Flat');
  const [compactMode, setCompactMode] = useState(localStorage.getItem('sw_compact_mode') === 'true');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true');
  // 🔥 ADD THIS NEW STATE:
  const [autoReduceMotion, setAutoReduceMotion] = useState(localStorage.getItem('sw_auto_reduce_motion') === 'true');
  
  const [normalizationType, setNormalizationType] = useState(localStorage.getItem('sw_norm_type') || 'loudness');
  const [sleepTimer, setSleepTimer] = useState(Number(localStorage.getItem('sw_sleep_timer') || 0));
  const [wifiOnly, setWifiOnly] = useState(localStorage.getItem('sw_wifi_only') !== 'false');
  const [monoAudio, setMonoAudio] = useState(localStorage.getItem('sw_mono_audio') === 'true');
  const [lyricsFontSize, setLyricsFontSize] = useState(Number(localStorage.getItem('sw_lyrics_size') || 18));
  
  const [enableSoundie, setEnableSoundie] = useState(localStorage.getItem('sw_soundie_enabled') === 'true');
const [geminiKey, setGeminiKey] = useState(localStorage.getItem('sw_gemini_key') || '');
const [unrealKey, setUnrealKey] = useState(localStorage.getItem('sw_unreal_key') || '');
  // --- APP ICON STATE (native only) ---
  const [currentAppIcon, setCurrentAppIcon] = useState(localStorage.getItem('sw_app_icon') || 'default');
  const [isChangingIcon, setIsChangingIcon] = useState(false);

  // --- ADD THIS NEAR YOUR OTHER STATES ---
// --- NATIVE DEVICE SPECS STATE ---
  const [deviceSpecs, setDeviceSpecs] = useState<any>({
    info: null,
    battery: null,
    network: null,
    hardware: null,
    screen: null,
    id: null
  });
  
  // Modal States
  const [dragY, setDragY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false); 
  
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  const rawAuthUser = getAuth().currentUser;
  const displayId = user?.uid || user?.id || rawAuthUser?.uid || 'Unknown ID';
  const displayDate = user?.metadata?.creationTime || rawAuthUser?.metadata?.creationTime;
  const currentAvatar = rawAuthUser?.photoURL || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(displayName || 'User')}`;

  const isLowBattery = deviceSpecs.battery?.batteryLevel <= 0.15 && !deviceSpecs.battery?.isCharging;
  
  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsClosing(false);
      setDisplayName(user?.displayName || '');
      setIsEditingName(false);
      setShowDeleteConfirm(false);
      setShowMobileMenu(true); // Reset to main menu on open
    } else {
      setTimeout(() => {
        setActiveTab('profile');
        setShowMobileMenu(true);
      }, 300);
    }
  }, [isOpen, user]);
  
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const fetchSpecs = async () => {
        const info = await Device.getInfo();
        const battery = await Device.getBatteryInfo();
        const id = await Device.getId();
        const net = await Network.getStatus();
        
        // Extract HTML5 Hardware APIs available in WebView
        const nav = navigator as any;
        const hardware = {
          ram: nav.deviceMemory ? `${nav.deviceMemory} GB+` : 'Hidden',
          cores: navigator.hardwareConcurrency || 'Hidden',
          connection: nav.connection ? nav.connection.effectiveType : 'Unknown',
          agent: navigator.userAgent
        };
        
        const screenSpecs = {
          width: window.screen.width,
          height: window.screen.height,
          pixelRatio: window.devicePixelRatio,
          colorDepth: window.screen.colorDepth
        };
        
        setDeviceSpecs({ info, battery, network: net, hardware, screen: screenSpecs, id: id.identifier });
      };
      fetchSpecs();
    }
  }, []);
  
  // 🔥 AUTO-REDUCE MOTION ON LOW BATTERY LOGIC
  useEffect(() => {
    const checkBatteryAndAdjustMotion = async () => {
      if (autoReduceMotion && Capacitor.isNativePlatform()) {
        try {
          const battery = await Device.getBatteryInfo();
          if (battery.batteryLevel !== undefined && battery.batteryLevel <= 0.15 && !battery.isCharging) {
            if (!reduceMotion) {
              setReduceMotion(true);
              localStorage.setItem('sw_reduce_motion', 'true');
              window.dispatchEvent(new Event('sw-settings-updated'));
            }
          }
        } catch (e) { console.error(e); }
      }
    };
    
    checkBatteryAndAdjustMotion();
    
    const resumeListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkBatteryAndAdjustMotion();
    });
    
    return () => {
      resumeListener.then(l => l.remove());
    };
  }, [autoReduceMotion, reduceMotion]);
  
  // --- Theme Engine ---
  const themeConfig: Record<string, any> = {
    default: { modalBg: 'bg-[#09090b]', border: 'border-zinc-800', highlight: 'text-slate-200' },
    sunset: { modalBg: 'bg-[#2a0808]', border: 'border-orange-500/20', highlight: 'text-orange-400' },
    valentine: { modalBg: 'bg-[#330a1a]', border: 'border-pink-500/20', highlight: 'text-pink-400' },
    jungle: { modalBg: 'bg-[#062414]', border: 'border-emerald-500/20', highlight: 'text-emerald-400' },
    ocean: { modalBg: 'bg-[#061a29]', border: 'border-cyan-500/20', highlight: 'text-cyan-400' },
    cyberpunk: { modalBg: 'bg-[#22063b]', border: 'border-fuchsia-500/20', highlight: 'text-fuchsia-400' },
    midnight: { modalBg: 'bg-[#1a0c30]', border: 'border-violet-500/20', highlight: 'text-violet-400' },
    coffee: { modalBg: 'bg-[#26150a]', border: 'border-amber-600/20', highlight: 'text-amber-500' }
  };
  const activeThemeObj = themeConfig[currentTheme] || themeConfig['default'];
  const animationClass = reduceMotion ? '' : 'animate-in fade-in slide-in-from-right-4 duration-300';

  const ICON_ALIASES: Record<string,string> = {
    default: "com.lonewolffsd.soundwave.MainActivityDefault",
    galactic: "com.lonewolffsd.soundwave.MainActivityGalactic",
    arora: "com.lonewolffsd.soundwave.MainActivityArora",
    vortex: "com.lonewolffsd.soundwave.MainActivityVortex",
    volt: "com.lonewolffsd.soundwave.MainActivityVolt",
    nebula: "com.lonewolffsd.soundwave.MainActivityNebula",
    prism: "com.lonewolffsd.soundwave.MainActivityPrism",
  };
  
  // --- Handlers ---
  const handleClose = () => {
    triggerHaptic(); 
    setIsClosing(true);
    setTimeout(() => { onClose(); setIsClosing(false); }, 300);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    setIsDraggingState(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };
  
  const handleTouchEnd = () => {
    isDragging.current = false;
    setIsDraggingState(false);
    if (dragY > 150) handleClose(); 
    else setDragY(0);
  };
  
  const handleCopyUid = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleUpdateProfile = async () => {
    if (!isEditingName) { setIsEditingName(true); return; }
    if (!displayName.trim() || displayName === user.displayName) { setIsEditingName(false); return; }
    
    setIsSavingProfile(true);
    try {
      if (rawAuthUser) await updateProfile(rawAuthUser, { displayName });
    } catch (error) { console.error("Update failed", error); } 
    finally { setIsSavingProfile(false); setIsEditingName(false); }
  };
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !rawAuthUser) return;
    
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateProfile(rawAuthUser, { photoURL: base64 });
        window.dispatchEvent(new Event('user-profile-updated'));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to update avatar", err);
    } finally {
      setAvatarUploading(false);
    }
  };
  
  const toggleSetting = (key: string, value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    triggerHaptic(); 
    setter(value);
    localStorage.setItem(key, value.toString());
    window.dispatchEvent(new Event('sw-settings-updated'));
  };
  
  const handleThemeChange = (themeId: string) => {
    triggerHaptic(); 
    setCurrentTheme(themeId);
    localStorage.setItem('soundwave_theme', themeId);
    
    // This now works because it's imported!
    updateDynamicFavicon(themeId); 
    
    window.dispatchEvent(new Event('theme-change'));
  };
  
  
  const handleAppIconChange = async (iconId:string) => {
  try {

    const alias = ICON_ALIASES[iconId];

    if (!alias) {
      console.error("No alias for:", iconId);
      return;
    }

    // @ts-ignore
    window.AndroidSettings.switchIcon(alias);

    setCurrentAppIcon(iconId);
    localStorage.setItem("sw_app_icon", iconId);

  } catch(e) {
    console.error("Icon switch failed", e);
  }
};

  const handleClearSearchHistory = () => {
    localStorage.removeItem('soundwave_recent_searches');
    alert('Search history cleared!');
  };
  
  const handleClearAppCache = () => {
    if(window.confirm("This will reset all your app preferences (theme, audio settings, etc). Are you sure?")) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sw_') || key === 'soundwave_theme') localStorage.removeItem(key);
      });
      window.location.reload();
    }
  };
  
  const handleExportData = async () => {
    // 1. Prepare the data object
    const data = {
      theme: currentTheme, 
      audioQuality, 
      autoPlay, 
      crossfade, 
      normalizeVolume, 
      eqPreset, 
      compactMode, 
      reduceMotion,
      history: localStorage.getItem('soundwave_recent_searches')
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    
    // 2. NATIVE MOBILE LOGIC (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: 'soundwave_preferences.json',
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        
        // Use Toast for native feedback
        await Toast.show({
          text: 'Preferences exported to Documents!',
          duration: 'short'
        });
      } catch (error) {
        console.error("Native export failed:", error);
        await Toast.show({ text: 'Export failed' });
      }
    } 
    // 3. WEB BROWSER FALLBACK
    else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'soundwave_preferences.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (err) { console.error('Logout failed:', err); }
  };
  
  const handleDeleteAccount = async () => {
    if (!rawAuthUser) return;
    try {
      setIsDeleting(true); setDeleteError('');
      const songsRef = collection(db, 'users', displayId, 'uploads');
      const snapshot = await getDocs(songsRef);
      
      for (const docSnap of snapshot.docs) {
        const songData = docSnap.data();
        if (songData.url) await fetch('/api/deleteSong', { method: 'POST', body: JSON.stringify({ fileUrl: songData.url, resourceType: 'video' }) }).catch(e => console.error(e));
        if (songData.coverArtBase64 && songData.coverArtBase64.includes('cloudinary.com')) await fetch('/api/deleteSong', { method: 'POST', body: JSON.stringify({ fileUrl: songData.coverArtBase64, resourceType: 'image' }) }).catch(e => console.error(e));
        await deleteDoc(doc(db, 'users', displayId, 'uploads', docSnap.id));
      }
      await deleteDoc(doc(db, 'users', displayId));
      await deleteUser(rawAuthUser);
      navigate('/login');
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      setIsDeleting(false);
      setDeleteError(error.code === 'auth/requires-recent-login' ? 'Security requirement: Please log out and log back in before deleting your account.' : error.message || 'Failed to fully delete account.');
    }
  };
  
  const formatCreationDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date';
  const isNative = Capacitor.isNativePlatform();
  
  // Added Descriptions for Native Stack View
  // Replace your current `const tabs = [...]` with this:
  const baseTabs = [
    { id: 'profile', label: 'Profile', description: 'Manage your identity, avatar, and account details.', icon: User },
    { id: 'appearance', label: 'Appearance', description: 'Customize themes, layouts, and animations.', icon: Palette },
    { id: 'playback', label: 'Playback', description: 'Fine-tune equalizer, crossfade, and audio rules.', icon: Headphones },
    { id: 'mobile', label: 'Mobile & Gestures', description: 'Haptic feedback, shake to shuffle & mobile controls.', icon: Smartphone },
    { id: 'data', label: 'App Data', description: 'Manage local cache, history, and storage.', icon: HardDrive },
    { id: 'security', label: 'Security', description: 'Session control, logout, and account deletion.', icon: Shield },
    { id: 'about', label: 'About', description: 'App version, developer info, and resources.', icon: Info },
  ];
  
  const tabs = isNative 
  ? [...baseTabs, { id: 'device', label: 'Device Info', description: 'Hardware and OS specifications.', icon: Smartphone }]
  : baseTabs;

  const isMotionLocked = isNative && autoReduceMotion && isLowBattery;
  
  return (
    <div className={`fixed inset-0 z-[250] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md md:p-4 transition-opacity duration-300 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      
      <div className="absolute inset-0 z-0" onClick={handleClose}></div>
      
      <div 
        ref={modalRef}
        className={`${activeThemeObj.modalBg} border ${activeThemeObj.border} w-full max-w-5xl md:rounded-4xl shadow-2xl relative z-10 flex flex-col md:flex-row h-[100vh] md:h-[650px] md:max-h-[85vh] overflow-hidden ${isDraggingState ? 'transition-none' : (reduceMotion ? '' : 'transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)')} ${!isOpen || isClosing ? 'translate-y-full md:translate-y-10 md:scale-[0.98]' : 'translate-y-0 md:scale-100'}`}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
      >
        
        {/* Mobile Drag Handle (Only visible on Menu) */}
        <div 
          className={`md:hidden w-full flex flex-col items-center justify-center pt-5 pb-2 cursor-grab active:cursor-grabbing shrink-0 relative z-20 bg-black/40 backdrop-blur-xl border-b border-white/5 touch-none ${showMobileMenu ? 'block' : 'hidden'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mb-4 pointer-events-none" />
          <h2 className="text-xl mb-2 font-black text-slate-100 tracking-tight pointer-events-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Account Settings</h2>
        </div>

        {/* Spotlighting Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-500/[0.03] rounded-full blur-[100px] pointer-events-none"></div>

        {/* Desktop Close */}
        <button onClick={handleClose} className="hidden md:flex absolute top-4 right-4 z-20 w-10 h-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
          <X size={20}/>
        </button>

        {/* --- NATIVE MOBILE STACK / DESKTOP SIDEBAR --- */}
        <div className={`w-full md:w-80 border-r border-white/5  backdrop-blur-xl flex flex-col shrink-0 z-10 relative overflow-y-auto scrollbar-hide ${showMobileMenu ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-6 pb-2 hidden md:block">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Settings</h2>
          </div>
          <div className="flex flex-col p-4 md:pt-4 gap-2.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic();
                    setActiveTab(tab.id as TabType);
                    setShowMobileMenu(false); // Trigger Drill-Down on Mobile
                  }}
                  className={`flex items-center -mt-2 gap-3 py-3 px-2 transition-all text-left ${isActive && !showMobileMenu ? `bg-white/5  ${activeThemeObj.highlight} shadow-[0_0_15px_rgba(255,255,255,0.03)]` : ' border-b border-white/5 text-zinc-400'}`}
                >
                  <div className={`p-1 -mt-2 shrink-0 ${isActive && !showMobileMenu ? activeThemeObj.highlight : 'text-zinc-100'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0 -ml-1 ">
                    <h3 className={`text-[13px] font-normal tracking-wide ${isActive && !showMobileMenu ? 'text-white' : 'text-slate-200'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{tab.label}</h3>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">{tab.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- SETTINGS CONTENT DETAIL VIEW --- */}
        <div className={`flex-1 overflow-y-auto bg-gradient-to-br from-white/[0.01] to-transparent z-10 relative flex flex-col ${!showMobileMenu ? 'flex' : 'hidden md:flex'}`}>
          
          {/* Mobile Drill-Down Header */}
          <div className="md:hidden sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowMobileMenu(true)} className="p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <ChevronLeft size={20} className="text-white" />
              </button>
              <h3 className="font-bold text-lg text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
            </div>
            <button onClick={handleClose} className="hidden p-2 bg-white/5 rounded-xl">
              <X size={20} className="text-zinc-400" />
            </button>
          </div>

          <div className="p-5 md:p-10 pb-20 md:pb-10 space-y-6">
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <div className={`space-y-6 ${animationClass}`}>
                <div className="hidden md:block">
                  <h3 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Profile Identity</h3>
                  <p className="text-zinc-500 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Manage how you appear across SoundWave.</p>
                </div>

                <div className="space-y-6 backdrop-blur-sm">
                  {/* Avatar Upload */}
                  <div className="flex flex-row items-start gap-5 pb-6 border-b border-white/5">
                    <div className="relative group w-24 h-24 md:w-32 md:h-32 rounded-xl p-[2px] bg-gradient-to-tr from-zinc-700 to-zinc-500 shadow-lg shrink-0">
                      <div className="w-full h-full rounded-xl overflow-hidden border border-black relative bg-zinc-900">
                        <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <label className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all duration-300 ${avatarUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          {avatarUploading ? (
                            <div className="w-5 h-5 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin"></div>
                          ) : (
                            <Camera size={18} className="text-white drop-shadow-md" />
                          )}
                          <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 text-left pt-1">
                      <h4 className="text-slate-200 font-bold text-lg tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Profile Picture</h4>
                      <p className="text-xs text-zinc-500 mt-1 mb-2 max-w-[200px] md:max-w-[320px]">Upload a custom avatar. We recommend a 256x256px image.</p>
                    </div>
                  </div>

                  {/* Editable Display Name */}
                  <div className="space-y-3 border-b border-white/5 pb-6">
                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      <User size={12} className={activeThemeObj.highlight} /> Display Name
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        disabled={!isEditingName} 
                        className={`flex-1 bg-black/40 rounded-xl px-4 py-3 text-sm text-slate-200 transition-all font-medium ${isEditingName ? 'border border-slate-500/50 shadow-[0_0_10px_rgba(255,255,255,0.05)] focus:outline-none focus:border-slate-400' : 'border border-white/5 opacity-80 cursor-default'}`} 
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }} 
                      />
                      <button 
                        onClick={handleUpdateProfile} 
                        disabled={isSavingProfile || (isEditingName && displayName === user.displayName)} 
                        className={`px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 text-xs disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${isEditingName ? 'bg-slate-200 text-black hover:bg-white shadow-lg shadow-white/10' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'}`} 
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {isSavingProfile ? 'Saving...' : isEditingName ? <><Save size={14} /> Save</> : <><Edit2 size={14} /> Edit</>}
                      </button>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Monitor size={12} className={activeThemeObj.highlight}/> Email Address</span>
                      <span className="text-slate-300 text-sm font-medium">{user?.email}</span>
                    </div>
                    
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Shield size={12} className={activeThemeObj.highlight}/> SoundWave ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs font-mono truncate">{displayId}</span>
                        <button onClick={handleCopyUid} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 transition-colors ml-auto">
                          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-black/30 border border-white/5 rounded-xl p-4 md:col-span-2">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Calendar size={12} className={activeThemeObj.highlight}/> Member Since</span>
                      <span className="text-slate-300 text-sm font-medium">{formatCreationDate(displayDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className={`space-y-9 ${animationClass}`}>
                <div className="hidden md:block">
                  <h3 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Theme & Appearance</h3>
                  <p className="text-zinc-500 text-sm">Customize the visual structural look of your workspace.</p>
                </div>

                {/* Toggles */}
                <div className="space-y-5 mb-6 backdrop-blur-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  
                  {/* REMOVED RESTRICTION: Default Startup Screen */}
                  <div className="flex justify-between items-center">
                    <div className="pr-4">
                      <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                        <Home size={16} className={activeThemeObj.highlight}/> Startup Screen
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">Choose where the app opens when launched.</p>
                    </div>
                    <select 
                      value={startupScreen} 
                      onChange={(e) => { 
                        triggerHaptic(); 
                        setStartupScreen(e.target.value); 
                        localStorage.setItem('sw_startup_screen', e.target.value); 
                        window.dispatchEvent(new Event('sw-settings-updated')); 
                      }} 
                      className="bg-black/60 border border-white/10 w-full max-w-[150px] text-slate-200 text-xs font-bold rounded-xl px-3 py-3 outline-none focus:border-slate-400"
                    >
                      <option value="dashboard">Home</option>
                      <option value="library">Library</option>
                    </select>
                  </div>
                  
                  <div className="h-px bg-white/5 w-full"></div>

                  <div 
                    className={`flex justify-between items-center transition-opacity ${!isNative ? 'opacity-50 cursor-pointer' : 'opacity-100'}`}
                    onClick={() => !isNative && setShowDownloadModal(true)}
                  >
                    <div className="pr-4 w-full">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                          <Type size={16} className={activeThemeObj.highlight}/> Lyrics Font Size
                        </h4>
                        <span className="text-xs font-bold text-slate-300">{lyricsFontSize}px</span>
                      </div>
                      <input 
                        type="range" min="12" max="32" step="2"
                        disabled={!isNative} 
                        value={lyricsFontSize}
                        onChange={(e) => {
                          if(isNative) {
                            setLyricsFontSize(Number(e.target.value));
                            localStorage.setItem('sw_lyrics_size', e.target.value);
                            window.dispatchEvent(new Event('sw-settings-updated'));
                          }
                        }}
                        className={`w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full ${isNative ? 'cursor-pointer' : 'cursor-pointer'}`}
                      />
                    </div>
                  </div>
                  <div className="h-px bg-white/5 w-full"></div>

                  <div className="flex justify-between items-center">
                    <div className="pr-4">
                      <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                        <Minimize size={16} className={activeThemeObj.highlight}/> Compact Mode
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">Reduce padding and scale down images to fit more content.</p>
                    </div>
                    <button 
                      onClick={() => toggleSetting('sw_compact_mode', !compactMode, setCompactMode)} 
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${compactMode ? 'bg-slate-300' : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${compactMode ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                    </button>
                  </div>
                  <div className="h-px bg-white/5 w-full"></div>
                  
                  <div className={`flex justify-between items-center transition-opacity ${isMotionLocked ? 'opacity-50' : 'opacity-100'}`}>
  <div className="pr-4">
    <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
      <Activity size={16} className={activeThemeObj.highlight}/> Reduce Motion
    </h4>
    <p className="text-xs text-zinc-500 mt-1">
      {isMotionLocked 
        ? "Locked: Currently active to save battery." 
        : "Disable UI animations and transitions for better performance."}
    </p>
  </div>
  <button 
    disabled={isMotionLocked} // 🔥 Prevents clicking
    onClick={() => toggleSetting('sw_reduce_motion', !reduceMotion, setReduceMotion)} 
    className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${isMotionLocked ? 'cursor-not-allowed bg-slate-400' : (reduceMotion ? 'bg-slate-300' : 'bg-black')}`}
  >
    <div className={`w-4 h-4 rounded-full transition-transform ${reduceMotion ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
  </button>
</div>

                  <div className="h-px bg-white/5 w-full"></div>
                  
                  <div 
                  className={`flex justify-between items-center transition-opacity ${!isNative ? 'opacity-50 cursor-pointer' : 'opacity-100'}`}
                  onClick={() => !isNative && setShowDownloadModal(true)}
                >
                  <div className="pr-4">
                    <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                      <Battery size={16} className={activeThemeObj.highlight}/> Auto-Reduce on Low Battery
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">Automatically enable Reduce Motion if battery drops to 15%.</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      if(isNative) {
                        toggleSetting('sw_auto_reduce_motion', !autoReduceMotion, setAutoReduceMotion);
                      } else {
                        setShowDownloadModal(true);
                      }
                    }} 
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${autoReduceMotion && isNative ? 'bg-slate-300' : 'bg-black'}`}
                  >
                    <div className={`w-4 h-4 rounded-full transition-transform ${autoReduceMotion && isNative ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                  </button>
                </div>
                </div>

                {/* Themes */}
                {/* REMOVED RESTRICTION: Themes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {AVAILABLE_THEMES.map((t) => {
                      const isActuallyActive = currentTheme === t.id;

                      return (
                        <div 
                          key={t.id} 
                          onClick={() => handleThemeChange(t.id)} 
                          className={`group relative p-2 cursor-pointer rounded-3xl transition-all duration-300 
                            ${isActuallyActive ? `border-2 ${t.colors.activeBorder} bg-white/5 scale-[1.02] ${t.colors.shadow}` : 'border border-white/5 bg-black/40'}`}
                        >
                          {isActuallyActive && (
                            <div className={`absolute top-5 right-5 w-5 h-5 ${t.colors.checkBg} rounded-lg flex items-center justify-center shadow-lg z-10`}>
                              <Check size={13} className="text-black" strokeWidth={3} />
                            </div>
                          )}

                          {/* Theme Preview Box */}
                          <div className={`h-32 sm:h-38 rounded-t-3xl overflow-hidden flex relative ${t.colors.main} border border-white/5`}>
                            {t.colors.glow && <div className={`absolute bottom-0 right-0 w-16 h-16 ${t.colors.glow} blur-2xl rounded-full`}></div>}
                            <div className={`w-1/3 ${t.colors.sidebar} border-r border-white/5 p-3 flex flex-col gap-2 z-10`}>
                              <div className={`w-1/2 h-2 ${t.colors.accent} rounded-full mb-1`}></div>
                              <div className="w-full h-1.5 bg-white/10 rounded-full"></div>
                            </div>
                            <div className="flex-1 p-3 flex flex-col gap-2 z-10 mt-1">
                              <div className="w-full h-2 bg-white/10 rounded-full"></div>
                            </div>
                          </div>

                          <div className="p-4 flex justify-between items-center">
                            <p className="text-[13px] font-bold text-slate-200 tracking-wide" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.name}</p>
                            <span className="text-[8px] uppercase font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded-am border border-white/5">{t.category}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                {/* ── APP ICON SECTION ── always visible, disabled on web ── */}
                <div className={`pt-2 space-y-4 lg:hidden transition-opacity ${!isNative ? 'opacity-40' : 'opacity-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                         App Icon
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        {isNative
                          ? 'Choose your home screen icon. Takes effect immediately.'
                          : 'Available on the app only.'}
                      </p>
                    </div>
                    {!isNative && (
                      <span className="shrink-0 text-[9px] uppercase font-bold tracking-widest bg-white/5 border border-white/10 text-zinc-400 px-2 py-1 rounded-lg mt-0.5">
                        NATIVE only
                      </span>
                    )}
                  </div>

                  <div className={`grid grid-cols-4 sm:grid-cols-7 md:grid-cols-6 lg:grid-cols-7 gap-3 ${!isNative ? 'pointer-events-none select-none' : ''}`}>
                    {AVAILABLE_APP_ICONS.map((icon) => {
                      const isActive = currentAppIcon === icon.id;
                      return (
                        <button
  key={icon.id}
  onClick={() => isNative && handleAppIconChange(icon.id)}
  disabled={!isNative || isChangingIcon}
  className={`
    relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all duration-200
    ${isNative
      ? isActive
        ? 'border-2 bg-white/5 scale-[1.04] shadow-[0_0_18px_rgba(255,255,255,0.06)] cursor-pointer'
        : 'border-white/5 bg-black/30 active:scale-95 cursor-pointer'
      : 'border-white/5 bg-black/20 cursor-not-allowed'
    }
    ${isChangingIcon ? 'opacity-50' : ''}
  `}
  style={isActive && isNative ? { borderColor: icon.accentColor } : {}}
>
  {/* Icon Preview */}
  <div
    className="w-14 h-14 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden"
    style={{ background: icon.preview }}
  >
    <img src={icon.preview} />

    {isActive && isNative && (
      <div
        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center shadow"
        style={{ background: icon.accentColor }}
      >
        <Check size={9} className="text-black" strokeWidth={3} />
      </div>
    )}
  </div>

  {/* Name Only */}
  <span
    className="text-[11px] font-semibold text-slate-200 text-center"
    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
  >
    {icon.name}
  </span>
</button>
                      );
                    })}
                  </div>

                  {isNative && isChangingIcon && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                      <div className="w-3.5 h-3.5 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
                      Changing icon...
                    </div>
                  )}

                  {!isNative && (
                    <button
                      onClick={() => setShowDownloadModal(true)}
                      className="w-full mt-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs font-semibold text-zinc-300 flex items-center justify-center gap-2"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      <Download size={13} /> Get the Native App
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PLAYBACK SETTINGS */}
            {activeTab === 'playback' && (
              <div className={`space-y-6 ${animationClass}`}>
                <div className="hidden md:block">
                  <h3 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Advanced Playback</h3>
                  <p className="text-zinc-500 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Fine-tune your audio experience.</p>
                </div>

                <div className="space-y-3 backdrop-blur-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  
                  {/* Streaming Audio Quality */}
                  <div className="border-b border-white/5 pb-6">
                    <h4 className="text-slate-200 text-base font-bold flex items-center gap-2 mb-1">
                      <Zap size={18} className={activeThemeObj.highlight} /> Streaming Audio Quality
                    </h4>
                    <p className="text-xs text-zinc-500 mb-4">Choose your preferred streaming bitrate and resolution.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Best (Default) */}
                      <div
                        onClick={() => {
                          triggerHaptic();
                          setAudioQuality('best');
                          localStorage.setItem('sw_audio_quality', 'best');
                          window.dispatchEvent(new Event('sw-settings-updated'));
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          audioQuality === 'best'
                            ? 'bg-white/10 border-white/30 shadow-lg'
                            : 'bg-black/30 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">Best Quality (HD)</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              DEFAULT
                            </span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${audioQuality === 'best' ? 'border-white bg-white' : 'border-zinc-600'}`}>
                            {audioQuality === 'best' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400">Direct studio master stream (up to 320kbps OPUS/AAC).</p>
                      </div>

                      {/* Standard */}
                      <div
                        onClick={() => {
                          triggerHaptic();
                          setAudioQuality('standard');
                          localStorage.setItem('sw_audio_quality', 'standard');
                          window.dispatchEvent(new Event('sw-settings-updated'));
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          audioQuality === 'standard'
                            ? 'bg-white/10 border-white/30 shadow-lg'
                            : 'bg-black/30 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-slate-100">Standard</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${audioQuality === 'standard' ? 'border-white bg-white' : 'border-zinc-600'}`}>
                            {audioQuality === 'standard' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400">Data saver stream (~128kbps) for instant buffering on slow networks.</p>
                      </div>
                    </div>
                  </div>

                  {/* EQ Preset */}
                  <div className="border-b border-white/5 pb-6">
                    <h4 className="text-slate-200 text-base font-bold flex items-center gap-2 mb-3"><Sliders size={18} className={activeThemeObj.highlight}/> Equalizer Preset</h4>
                    <div className="relative">
                      <select value={eqPreset} onChange={(e) => { setEqPreset(e.target.value); localStorage.setItem('sw_eq_preset', e.target.value); window.dispatchEvent(new Event('sw-settings-updated')); }} className="w-full bg-black/60 border border-white/10 text-slate-200 text-sm font-medium rounded-xl px-5 py-4 outline-none focus:border-slate-400 appearance-none transition-colors">
                        {EQUALIZER_PRESETS.map(preset => <option key={preset} value={preset}>{preset}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2">
                    
                    {isNative ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 gap-4">
                        <div className="pr-4">
                          <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">ReplayGain (Normalization)</h4>
                          <p className="text-xs text-zinc-500 mt-1">Prevent volume jumps between different sources.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {normalizeVolume && (
                            <select 
                              value={normalizationType} 
                              onChange={(e) => { triggerHaptic(); setNormalizationType(e.target.value); localStorage.setItem('sw_norm_type', e.target.value); window.dispatchEvent(new Event('sw-settings-updated')); }} 
                              className="bg-black/60 border border-white/10 text-slate-200 text-xs font-bold rounded-xl px-2 py-1 outline-none"
                            >
                              <option value="peak">Peak</option>
                              <option value="loudness">Loudness</option>
                            </select>
                          )}
                          <button onClick={() => toggleSetting('sw_normalize', !normalizeVolume, setNormalizeVolume)} className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${normalizeVolume ? 'bg-slate-300' : 'bg-black'}`}>
                            <div className={`w-4 h-4 rounded-full transition-transform ${normalizeVolume ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 gap-4 opacity-40 cursor-pointer relative" onClick={() => setShowDownloadModal(true)}>
                        <div className="absolute inset-0 z-10"></div>
                        <div className="pr-4">
                          <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">ReplayGain (Normalization)</h4>
                          <p className="text-xs text-zinc-500 mt-1">Prevent volume jumps between different sources.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 pointer-events-none">
                          <button disabled className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${normalizeVolume ? 'bg-slate-300' : 'bg-black'}`}>
                            <div className={`w-4 h-4 rounded-full transition-transform ${normalizeVolume ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                          </button>
                        </div>
                      </div>
                    )}

                    

                    {/* ENBALE SOUNDIE AI ASSISTANT */}
                    {isNative ? (
                      <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                        <div className="pr-4">
                          <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                            <Mic size={16} className={activeThemeObj.highlight} /> Enable Soundie AI Assistant
                          </h4>
                          <p className="text-xs text-zinc-500 mt-1">Voice-controlled music AI</p>
                        </div>
                        <button
                          onClick={() => {
                            const newVal = !enableSoundie;
                            setEnableSoundie(newVal);
                            localStorage.setItem('sw_soundie_enabled', newVal.toString());
                            window.dispatchEvent(new Event('sw-settings-updated'));
                          }}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${enableSoundie ? 'bg-emerald-400' : 'bg-black'}`}
                        >
                          <div className={`w-4 h-4 rounded-full transition-transform ${enableSoundie ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 opacity-40 cursor-pointer relative" 
                        onClick={() => setShowDownloadModal(true)}
                      >
                        <div className="absolute inset-0 z-10"></div>
                        <div className="pr-4">
                          <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                            <Mic size={16} className={activeThemeObj.highlight} /> Enable Soundie AI Assistant
                          </h4>
                          <p className="text-xs text-zinc-500 mt-1">Voice-controlled music AI</p>
                        </div>
                        <button
                          disabled
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 pointer-events-none ${enableSoundie ? 'bg-white' : 'bg-black'}`}
                        >
                          <div className={`w-4 h-4 rounded-full transition-transform ${enableSoundie ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                        </button>
                      </div>
                    )}

                    {/* SLEEP TIMER */}
                    <div 
                      className={`flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 transition-opacity cursor-pointer ${!isNative ? 'opacity-50' : 'opacity-100'}`}
                      onClick={() => !isNative && setShowDownloadModal(true)}
                    >
                      <div className="pr-4">
                        <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                          <Clock size={16} className={activeThemeObj.highlight} /> Sleep Timer
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">Music automatically fades out and stops.</p>
                      </div>
                      <select 
                        disabled={!isNative}
                        value={isNative ? sleepTimer : 0} 
                        onChange={(e) => isNative && setSleepTimer(Number(e.target.value))}
                        className={`bg-black/60 border border-white/10 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none shrink-0 ${!isNative ? 'cursor-pointer' : 'focus:border-slate-400'}`}
                      >
                        <option value={0}>Off</option>
                        <option value={15}>15 mins</option>
                        <option value={30}>30 mins</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    {/* 🔥 LOCKED: MONO AUDIO */}
                    {isNative ? (
                      <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                        <div className="pr-4">
                          <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">Mono Audio</h4>
                          <p className="text-xs text-zinc-500 mt-1">Combine left and right channels for single-earbud use.</p>
                        </div>
                        <button onClick={() => toggleSetting('sw_mono_audio', !monoAudio, setMonoAudio)} className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${monoAudio ? 'bg-slate-300' : 'bg-black'}`}>
                          <div className={`w-4 h-4 rounded-full transition-transform ${monoAudio ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 opacity-40 cursor-pointer relative" onClick={() => setShowDownloadModal(true)}>
                        <div className="absolute inset-0 z-10"></div>
                        <div className="pr-4">
                          <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">Mono Audio</h4>
                          <p className="text-xs text-zinc-500 mt-1">Combine left and right channels for single-earbud use.</p>
                        </div>
                        <button disabled className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 pointer-events-none ${monoAudio ? 'bg-slate-300' : 'bg-black'}`}>
                          <div className={`w-4 h-4 rounded-full transition-transform ${monoAudio ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                        </button>
                      </div>
                    )}

                    

                    <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                      <div className="pr-4">
                        <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">Autoplay Similar Songs</h4>
                        <p className="text-xs text-zinc-500 mt-1">Keep the music going when your playlist ends.</p>
                      </div>
                      <button onClick={() => toggleSetting('sw_autoplay', !autoPlay, setAutoPlay)} className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${autoPlay ? 'bg-slate-300' : 'bg-black'}`}>
                        <div className={`w-4 h-4 rounded-full transition-transform ${autoPlay ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: MOBILE & HARDWARE GESTURES */}
            {activeTab === 'mobile' && (
              <div className={`space-y-6 ${animationClass}`}>
                <div className="hidden md:block">
                  <h3 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Mobile & Hardware Controls</h3>
                  <p className="text-zinc-500 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Configure vibration, physical gestures, audio ducking, and native hardware features.</p>
                </div>

                <div className="space-y-6 backdrop-blur-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  
                  {/* 1. Haptic Feedback */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                    <div className="pr-4">
                      <h4 className="text-slate-200 font-bold text-base flex items-center gap-2">
                        <Vibrate size={18} className={activeThemeObj.highlight} /> Haptic Feedback
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-[420px]">
                        Tactile vibration responses when tapping playback controls, dragging the bottom navigation bar, and seeking tracks.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const next = !hapticsEnabled;
                        setHapticsEnabled(next);
                        localStorage.setItem('sw_haptics', String(next));
                        if (next && Capacitor.isNativePlatform()) {
                          try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
                        }
                        window.dispatchEvent(new Event('sw-settings-updated'));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors border border-white/10 shrink-0 ${hapticsEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${hapticsEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                    </button>
                  </div>

                  {/* 2. Shake to Shuffle */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                    <div className="pr-4">
                      <h4 className="text-slate-200 font-bold text-base flex items-center gap-2">
                        <Zap size={18} className={activeThemeObj.highlight} /> Shake to Shuffle
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-[420px]">
                        Physically shake your mobile device to randomize and shuffle the current playing queue.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !shakeEnabled;
                        setShakeEnabled(next);
                        localStorage.setItem('sw_shake_shuffle', String(next));
                        triggerHaptic();
                        window.dispatchEvent(new Event('sw-settings-updated'));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors border border-white/10 shrink-0 ${shakeEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${shakeEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                    </button>
                  </div>

                  {/* 3. Audio Ducking */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                    <div className="pr-4">
                      <h4 className="text-slate-200 font-bold text-base flex items-center gap-2">
                        <Volume2 size={18} className={activeThemeObj.highlight} /> Smart Audio Ducking
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-[420px]">
                        Temporarily reduce music volume when system notifications or voice navigation announcements arrive.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !duckingEnabled;
                        setDuckingEnabled(next);
                        localStorage.setItem('sw_ducking', String(next));
                        triggerHaptic();
                        window.dispatchEvent(new Event('sw-settings-updated'));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors border border-white/10 shrink-0 ${duckingEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${duckingEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                    </button>
                  </div>

                  {/* 4. Keep Screen Awake */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                    <div className="pr-4">
                      <h4 className="text-slate-200 font-bold text-base flex items-center gap-2">
                        <Smartphone size={18} className={activeThemeObj.highlight} /> Keep Screen Awake
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-[420px]">
                        Prevent the device screen from dimming or locking while lyrics or full-screen visualizers are open.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !keepAwakeEnabled;
                        setKeepAwakeEnabled(next);
                        localStorage.setItem('sw_keep_awake', String(next));
                        triggerHaptic();
                        window.dispatchEvent(new Event('sw-settings-updated'));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors border border-white/10 shrink-0 ${keepAwakeEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${keepAwakeEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                    </button>
                  </div>

                  {/* 5. Soundie AI on Mobile */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                    <div className="pr-4">
                      <h4 className="text-slate-200 font-bold text-base flex items-center gap-2">
                        <Sparkles size={18} className={activeThemeObj.highlight} /> Soundie AI Voice Assistant
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-[420px]">
                        Display the Soundie AI orb in mobile navigation and quick-access header.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !soundieMobileEnabled;
                        setSoundieMobileEnabled(next);
                        localStorage.setItem('sw_soundie_enabled', String(next));
                        triggerHaptic();
                        window.dispatchEvent(new Event('sw-settings-updated'));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors border border-white/10 shrink-0 ${soundieMobileEnabled ? activeThemeObj.activeToggle : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${soundieMobileEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                    </button>
                  </div>

                  {/* 6. Default Startup Screen */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
                    <div>
                      <h4 className="text-slate-200 font-bold text-base">Startup Screen</h4>
                      <p className="text-xs text-zinc-500 mt-1">Choose which view loads when opening the SoundWave app.</p>
                    </div>
                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 shrink-0">
                      <button
                        onClick={() => {
                          setStartupScreen('home');
                          localStorage.setItem('sw_startup_screen', 'home');
                          triggerHaptic();
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${startupScreen === 'home' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Discover Home
                      </button>
                      <button
                        onClick={() => {
                          setStartupScreen('library');
                          localStorage.setItem('sw_startup_screen', 'library');
                          triggerHaptic();
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${startupScreen === 'library' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Your Library
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 4: APP DATA */}
            {activeTab === 'data' && (
              <div className={`space-y-6 ${animationClass}`}>
                <div className="hidden md:block">
                  <h3 className="text-xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>App Data & Storage</h3>
                  <p className="text-zinc-500 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Manage your local footprint and quotas.</p>
                </div>

                <div className=" space-y-4 backdrop-blur-sm">
                  
                  {/* WIFI ONLY TOGGLE */}
                  <div 
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6 transition-opacity cursor-pointer ${!isNative ? 'opacity-50' : 'opacity-100'}`}
                    onClick={() => !isNative && setShowDownloadModal(true)}
                  >
                    <div className="pr-4">
                      <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                        <Wifi size={16} className={activeThemeObj.highlight}/> Download over Wi-Fi Only
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">Prevent the app from using cellular data for large files.</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        if(isNative) {
                          toggleSetting('sw_wifi_only', !wifiOnly, setWifiOnly);
                        } else {
                          setShowDownloadModal(true);
                        }
                      }} 
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors border border-white/10 shrink-0 ${wifiOnly && isNative ? 'bg-slate-300' : 'bg-black'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform ${wifiOnly && isNative ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-500'}`}></div>
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <div>
                      <h4 className="text-slate-200 text-sm font-bold">Clear Search History</h4>
                      <p className="text-xs text-zinc-500 mt-1">Removes your recent search terms locally.</p>
                    </div>
                    <button onClick={handleClearSearchHistory} className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors">Clear History</button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">Reset App Cache</h4>
                      <p className="text-xs text-zinc-500 mt-1">Resets theme, volume, and UI settings to default.</p>
                    </div>
                    <button onClick={handleClearAppCache} className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-sm font-bold rounded-xl transition-colors">Reset Cache</button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <div>
                      <h4 className="text-slate-200 text-sm font-bold flex items-center gap-1.5"><Download size={16} className={activeThemeObj.highlight}/> Export Preferences</h4>
                      <p className="text-xs text-zinc-500 mt-1">Download local app settings as a JSON file.</p>
                    </div>
                    <button onClick={handleExportData} className="px-5 py-2.5 bg-slate-200 hover:bg-white text-black text-sm font-bold rounded-xl transition-colors shadow-lg shadow-white/5">Download</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SECURITY */}
            {activeTab === 'security' && (
              <div className={`space-y-6 ${animationClass}`}>
                <div className="hidden md:block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <h3 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Account Security</h3>
                  <p className="text-zinc-500 text-sm">Manage your session and account status.</p>
                </div>

                <div className="space-y-3">
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif' }} className=" flex flex-col mb-6 sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-sm ">
                    <div >
                      <h4 className="text-slate-200 text-base font-bold flex items-center gap-2 mt-4">Log Out</h4>
                      <p className="text-sm text-zinc-500 mt-1">Sign out of your account securely on this device.</p>
                    </div>
                    <button onClick={handleLogout} className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>

                  <div style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="border border-red-500/20 bg-red-950/20 rounded-2xl p-5 md:p-6 relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500/50"></div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-slate-200 font-bold text-base">Danger Zone</h4>
                    </div>

                    <div className="space-y-4">
                      {showDeleteConfirm ? (
                        <div className="bg-black/40 mt-4 p-5 rounded-xl border border-red-500/30 animate-in fade-in">
                          <p className="text-sm text-slate-300 mb-5 font-medium leading-relaxed">
                            Are you absolutely sure? This action <span className="text-red-400 font-bold">cannot be undone</span>. All your data, uploads, and playlists will be permanently wiped from our servers.
                          </p>
                          {deleteError && (
                            <div className="text-sm text-red-400 mb-5 p-4 bg-red-950/50 rounded-xl border border-red-500/40 flex items-start gap-3">
                              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                              <p className="font-medium">{deleteError}</p>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={handleDeleteAccount} disabled={isDeleting} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm rounded-xl transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-900/20">
                              {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                            </button>
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-sm rounded-xl transition-colors font-bold flex items-center justify-center">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-zinc-500 mb-5">Permanently delete your account and remove all associated data from SoundWave. This action cannot be reversed.</p>
                          <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-bold border border-red-500/20 rounded-xl transition-colors flex items-center gap-2 w-fit">
                            <Trash2 size={16} /> Delete Account
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: DEVICE INFO (NATIVE ONLY) */}
            {/* TAB 7: DEVICE INFO (NATIVE ONLY) */}
            {activeTab === 'device' && isNative && (
              <div className={`space-y-6 ${animationClass}`}>
                 <div className="hidden md:block">
                   <h3 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>System Diagnostics</h3>
                   <p className="text-zinc-500 text-sm">Real-time hardware, network, and operating system telemetry.</p>
                 </div>

                 {deviceSpecs.info ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                     
                     {/* 1. OS & Identity */}
                     <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2"><Smartphone size={12} className={activeThemeObj.highlight}/> System</h4>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Manufacturer</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.info.manufacturer}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Model</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.info.model}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Platform</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.info.operatingSystem}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">OS Version</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.info.osVersion}</span></div>
                     </div>

                     {/* 2. Processing & Memory */}
                     <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2"><Cpu size={12} className={activeThemeObj.highlight}/> Processing</h4>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">CPU Cores</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.hardware.cores} Logical</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Est. RAM</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.hardware.ram}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Architecture</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.info.isVirtual ? 'Virtual Machine' : 'Physical Device'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">WebView Engine</span><span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{deviceSpecs.info.webViewVersion}</span></div>
                     </div>

                     {/* 3. Power & Battery */}
                     <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2"><Zap size={12} className={activeThemeObj.highlight}/> Power</h4>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Battery Level</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.battery ? `${Math.round(deviceSpecs.battery.batteryLevel * 100)}%` : 'Reading...'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Power Status</span><span className={`text-xs font-bold ${deviceSpecs.battery?.isCharging ? 'text-emerald-400' : 'text-amber-400'}`}>{deviceSpecs.battery?.isCharging ? 'Charging (AC)' : 'Discharging'}</span></div>
                     </div>

                     {/* 4. Display Metrics */}
                     <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2"><MonitorPlay size={12} className={activeThemeObj.highlight}/> Display</h4>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Resolution</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.screen.width} x {deviceSpecs.screen.height}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Pixel Ratio</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.screen.pixelRatio}x</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Color Depth</span><span className="text-xs font-bold text-slate-200">{deviceSpecs.screen.colorDepth}-bit</span></div>
                     </div>

                     {/* 5. Network & Connectivity */}
                     <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2"><Wifi size={12} className={activeThemeObj.highlight}/> Connectivity</h4>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Network Type</span><span className="text-xs font-bold uppercase text-slate-200">{deviceSpecs.network?.connectionType || 'None'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Link Speed</span><span className="text-xs font-bold uppercase text-slate-200">{deviceSpecs.hardware.connection}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-zinc-500">Status</span><span className={`text-xs font-bold ${deviceSpecs.network?.connected ? 'text-emerald-400' : 'text-red-400'}`}>{deviceSpecs.network?.connected ? 'Online' : 'Offline'}</span></div>
                     </div>

                     {/* 6. Hardware IDs & Storage Fallback */}
                     <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2"><Database size={12} className={activeThemeObj.highlight}/> Storage & ID</h4>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-500 uppercase">Device UUID</span>
                          <span className="text-[10px] font-mono text-slate-300 truncate">{deviceSpecs.id}</span>
                        </div>
                        <div className="flex justify-between mt-2"><span className="text-xs text-zinc-500">Disk Space</span><span className="text-xs font-bold text-slate-200">
                          {deviceSpecs.info.realDiskFree ? `${(deviceSpecs.info.realDiskFree / 1024 / 1024 / 1024).toFixed(1)} GB Free` : 'System Managed'}
                        </span></div>
                     </div>

                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                     <div className={`w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin`}></div>
                     <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Running Diagnostics...</p>
                   </div>
                 )}
              </div>
            )}

            {/* TAB 7: ABOUT */}
            {activeTab === 'about' && (
              <div className={`space-y-6 flex flex-col items-center justify-center py-12 md:py-20 ${animationClass}`}>
                 <div className="w-36 h-36 opacity-90 -mb-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] mb-4">
                   <img src={Logo} alt="SoundWave Logo" className="w-full h-full object-contain" />
                 </div>
                 
                 <div className="text-center ">
                   <h2 className="text-3xl font-black text-slate-100 tracking-tight" style={{ fontFamily: 'Cabin, sans-serif' }}>SoundWave</h2>
                   <p className="text-zinc-500 text-xs mt-2 font-mono bg-white/5 inline-block px-3 py-1 rounded-full border border-white/5">v2.0.0-lat</p>
                 </div>

                 <p className="text-center text-sm text-zinc-400 max-w-md mt-6 leading-relaxed" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                   A modern, feature-rich music player. <br/> 
                   Developed and maintained by <span className="text-slate-200 font-bold"><a target='_blank' href="https://lonewolffsd.in" className='hover:underline transition-all'>LonewolfFSD</a></span>.
                 </p>

                 <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                   <a href="https://github.com/lonewolfFSD/Soundwave" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-200 hover:bg-white text-black rounded-xl transition-all shadow-xl hover:-translate-y-0.5 font-bold text-sm w-full sm:w-auto" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                     <Github size={18} /> GitHub Repo
                   </a>
                   <a href="https://github.com/lonewolfFSD/Soundwave/issues" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all font-bold text-sm w-full sm:w-auto" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                     <ExternalLink size={18} /> Report Bug
                   </a>
                 </div>
              </div>
            )}

            
          </div>
        </div>

      </div>

      {/* 🔥 THE DOWNLOAD MODAL INTERCEPTOR 🔥 */}
      <DownloadModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
      
    </div>
  );
};

export default AccountModal;