import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  User,
  Trash2,
  Copy,
  Check,
  HardDrive,
  AlertTriangle,
  Palette,
  Calendar,
  Clock,
  Shield,
  Monitor,
  Headphones,
  Save,
  Download,
  Volume2,
  Edit2,
  LogOut,
  Camera,
  Activity,
  Sliders,
  Info,
  Smartphone,
  Zap,
  Cpu,
  Fingerprint,
  Database,
  Github,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Wifi,
  Sparkles,
  Radio,
  Lock,
  Battery,
  Search,
  Upload,
  RefreshCw,
  EyeOff,
  Music,
  SlidersHorizontal,
  FileDown,
  FileUp,
  Share2,
  Layers,
  KeyRound,
  CheckCircle2,
  X
} from 'lucide-react'
import { getAuth, deleteUser, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import Logo from '../images/logo.png'
import { updateDynamicFavicon } from '@/utils/themeHelper'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import DownloadModal from './DownloadModal'
import { clearAllOfflineSongs } from '../utils/offlineStorage'
import { clearListenHistory } from '../utils/listenHistory'

interface AccountSettingsPageProps {
  onBack: () => void
  user: any
}

// --- THEME PRESETS ---
const AVAILABLE_THEMES = [
  { id: 'default', name: 'High Contrast', category: 'Dark', gradient: 'from-zinc-900 to-black', accent: '#e2e8f0', desc: 'Minimal obsidian dark' },
  { id: 'sunset', name: 'Sunset Vibes', category: 'Warm', gradient: 'from-amber-950 to-stone-950', accent: '#f59e0b', desc: 'Deep warm amber tones' },
  { id: 'valentine', name: 'Valentine', category: 'Warm', gradient: 'from-rose-950 to-pink-950', accent: '#ec4899', desc: 'Rose & neon pink glow' },
  { id: 'jungle', name: 'Jungle Groove', category: 'Nature', gradient: 'from-emerald-950 to-zinc-950', accent: '#10b981', desc: 'Deep emerald forest' },
  { id: 'ocean', name: 'Deep Ocean', category: 'Cool', gradient: 'from-cyan-950 to-slate-950', accent: '#06b6d4', desc: 'Vibrant oceanic cyan' },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'Dark', gradient: 'from-fuchsia-950 to-purple-950', accent: '#d946ef', desc: 'Neon future magenta' },
  { id: 'midnight', name: 'Midnight Purple', category: 'Dark', gradient: 'from-violet-950 to-slate-950', accent: '#8b5cf6', desc: 'Mystic electric purple' },
  { id: 'coffee', name: 'Mocha / Coffee', category: 'Warm', gradient: 'from-amber-950 to-zinc-950', accent: '#b45309', desc: 'Warm roasted mocha' },
]

const EQUALIZER_PRESETS = ['Flat', 'Bass Boost', 'Electronic', 'Acoustic', 'Vocal Booster', 'Rock', 'Hi-Fi Master']

const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/glass/svg?seed=Aura',
  'https://api.dicebear.com/9.x/glass/svg?seed=Vortex',
  'https://api.dicebear.com/9.x/glass/svg?seed=Cosmo',
  'https://api.dicebear.com/9.x/glass/svg?seed=Cyber',
  'https://api.dicebear.com/9.x/glass/svg?seed=Echo',
  'https://api.dicebear.com/9.x/glass/svg?seed=Prism',
]

type TabType = 'profile' | 'audio' | 'appearance' | 'ai' | 'storage' | 'integrations' | 'about'

// --- SLEEK CUSTOM TOGGLE SWITCH ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label?: string }> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'bg-white/15'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md transition duration-200 ease-in-out ${
          checked ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/70'
        }`}
      />
    </button>
  )
}

// --- CLEAN SETTING ROW CONTAINER ---
const SettingRow: React.FC<{
  title: string
  subtitle?: string
  children: React.ReactNode
  badge?: string
}> = ({ title, subtitle, children, badge }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-colors">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-white/95 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {title}
        </h4>
        {badge && (
          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/80 border border-white/10">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-white/50 mt-0.5 leading-relaxed font-light">{subtitle}</p>}
    </div>
    <div className="shrink-0 flex items-center">{children}</div>
  </div>
)

export const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({ onBack, user }) => {
  const { logout } = useAuth()
  const { setAudioQuality } = usePlayer()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDownloadModal, setShowDownloadModal] = useState(false)

  // Profile States
  const rawAuthUser = getAuth().currentUser
  const [displayName, setDisplayName] = useState(user?.displayName || rawAuthUser?.displayName || '')
  const [userBio, setUserBio] = useState(localStorage.getItem('sw_user_bio') || 'Audiophile & Soundwave Explorer')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState('')

  // Theme & Appearance States
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('soundwave_theme') || 'default')
  const [compactMode, setCompactMode] = useState(localStorage.getItem('sw_compact_mode') === 'true')
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('sw_reduce_motion') === 'true')
  const [animatedGlows, setAnimatedGlows] = useState(localStorage.getItem('sw_animated_glows') !== 'false')
  const [visualizerStyle, setVisualizerStyle] = useState(localStorage.getItem('sw_visualizer_style') || 'waveform')

  // Audio Quality & Playback States
  const [audioQuality, setAudioQualityLocal] = useState<'best' | 'standard'>(() => (localStorage.getItem('sw_audio_quality') as 'best' | 'standard') || 'best')
  const [crossfade, setCrossfade] = useState(Number(localStorage.getItem('sw_crossfade') || 0))
  const [normalizeVolume, setNormalizeVolume] = useState(localStorage.getItem('sw_normalize') === 'true')
  const [spatialAudio8D, setSpatialAudio8D] = useState(localStorage.getItem('sw_8d_audio') === 'true')
  const [gaplessPlayback, setGaplessPlayback] = useState(localStorage.getItem('sw_gapless') !== 'false')
  const [eqPreset, setEqPreset] = useState(localStorage.getItem('sw_eq_preset') || 'Flat')
  const [monoAudio, setMonoAudio] = useState(localStorage.getItem('sw_mono_audio') === 'true')

  // AI & Recommendation States
  const [mlTasteTraining, setMlTasteTraining] = useState(localStorage.getItem('sw_ml_training') !== 'false')
  const [privateSession, setPrivateSession] = useState(localStorage.getItem('sw_private_session') === 'true')
  const [infiniteFeed, setInfiniteFeed] = useState(localStorage.getItem('sw_infinite_feed') !== 'false')

  // Integrations & Assistant
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('sw_gemini_key') || '')
  const [discordWebhook, setDiscordWebhook] = useState(localStorage.getItem('sw_discord_webhook') || '')
  const [keepAwake, setKeepAwake] = useState(localStorage.getItem('sw_keep_awake') === 'true')
  const [mediaSession, setMediaSession] = useState(localStorage.getItem('sw_media_session') !== 'false')
  const [hapticsEnabled, setHapticsEnabled] = useState(localStorage.getItem('sw_haptics') !== 'false')

  const triggerHaptic = async (style: any = ImpactStyle.Light) => {
    if (hapticsEnabled && Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }) } catch {}
    }
  }

  // Setting updater
  const updateSetting = (key: string, value: any, callback?: () => void) => {
    localStorage.setItem(key, typeof value === 'boolean' ? String(value) : value)
    window.dispatchEvent(new Event('sw-settings-updated'))
    triggerHaptic()
    if (callback) callback()
  }

  const handleAudioQualityChange = (quality: 'best' | 'standard') => {
    setAudioQualityLocal(quality)
    setAudioQuality(quality)
    triggerHaptic()
  }

  const displayId = user?.uid || user?.id || rawAuthUser?.uid || 'soundwave-guest'
  const currentAvatar = rawAuthUser?.photoURL || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(displayName || 'User')}`

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      if (rawAuthUser) {
        await updateProfile(rawAuthUser, {
          displayName: displayName,
          photoURL: customAvatarUrl || currentAvatar
        })
      }
      localStorage.setItem('sw_user_bio', userBio)
      window.dispatchEvent(new Event('sw-settings-updated'))
      alert('Profile updated successfully!')
    } catch (e: any) {
      alert(`Error updating profile: ${e.message}`)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!rawAuthUser?.email) {
      alert('No email linked to this account.')
      return
    }
    try {
      await sendPasswordResetEmail(getAuth(), rawAuthUser.email)
      alert(`Password reset link sent to ${rawAuthUser.email}!`)
    } catch (e: any) {
      alert(`Failed to send password reset: ${e.message}`)
    }
  }

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '1.5.0',
        exportedAt: new Date().toISOString(),
        settings: {
          theme: currentTheme,
          audioQuality,
          crossfade,
          normalizeVolume,
          eqPreset,
          compactMode
        },
        likedSongs: JSON.parse(localStorage.getItem('sw_liked_songs') || '[]'),
        history: JSON.parse(localStorage.getItem('sw_listen_history') || '[]'),
        bio: userBio
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `soundwave_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export backup.')
    }
  }

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.likedSongs) localStorage.setItem('sw_liked_songs', JSON.stringify(data.likedSongs))
        if (data.history) localStorage.setItem('sw_listen_history', JSON.stringify(data.history))
        if (data.settings?.theme) {
          localStorage.setItem('soundwave_theme', data.settings.theme)
          setCurrentTheme(data.settings.theme)
        }
        window.dispatchEvent(new Event('sw-settings-updated'))
        window.dispatchEvent(new Event('theme-change'))
        alert('Soundwave backup successfully restored!')
      } catch {
        alert('Invalid backup file format.')
      }
    }
    reader.readAsText(file)
  }

  const handleClearOfflineStorage = async () => {
    if (confirm('Are you sure you want to delete all offline downloaded tracks?')) {
      try {
        await clearAllOfflineSongs()
        alert('All offline tracks cleared!')
      } catch {
        alert('Failed to clear storage.')
      }
    }
  }

  const handleResetMLVectors = () => {
    if (confirm('Reset your personalized AI recommendations and listening history?')) {
      clearListenHistory()
      localStorage.removeItem('sw_listen_again')
      window.dispatchEvent(new Event('soundwave-history-updated'))
      window.dispatchEvent(new Event('sw-settings-updated'))
      alert('AI Taste Vectors reset to initial state.')
    }
  }

  const handleDeleteAccount = async () => {
    if (!rawAuthUser) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const userRef = doc(db, 'users', rawAuthUser.uid)
      await deleteDoc(userRef).catch(() => null)
      await deleteUser(rawAuthUser)
      await logout()
      navigate('/login')
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please re-login.')
      setIsDeleting(false)
    }
  }

  const NAV_ITEMS: { id: TabType; label: string; icon: any; desc: string }[] = [
    { id: 'profile', label: 'Profile & Account', icon: User, desc: 'Identity, credentials & security' },
    { id: 'audio', label: 'Audio & Playback', icon: Headphones, desc: 'Bitrate, 8D audio, crossfade & EQ' },
    { id: 'appearance', label: 'Themes & Visuals', icon: Palette, desc: 'Palettes, visualizer & layout' },
    { id: 'ai', label: 'AI & Algorithm', icon: Sparkles, desc: 'ML recommendations & private session' },
    { id: 'storage', label: 'Storage & Backup', icon: Database, desc: 'Offline tracks & JSON export' },
    { id: 'integrations', label: 'Integrations & Native', icon: Zap, desc: 'Discord, lockscreen & Gemini' },
    { id: 'about', label: 'About Soundwave', icon: Info, desc: 'Version, build & specs' }
  ]

  // --- SEARCHABLE SETTING REGISTRY ---
  const ALL_SEARCHABLE_SETTINGS = [
    {
      id: 'audio_quality',
      title: 'Streaming Audio Fidelity',
      subtitle: 'Switch between 320kbps Hi-Fi lossless and 128kbps standard',
      tab: 'audio',
      element: (
        <div className="flex gap-2">
          <button
            onClick={() => handleAudioQualityChange('best')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              audioQuality === 'best' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            320k Hi-Fi
          </button>
          <button
            onClick={() => handleAudioQualityChange('standard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              audioQuality === 'standard' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            128k Standard
          </button>
        </div>
      )
    },
    {
      id: 'crossfade',
      title: 'Crossfade Duration',
      subtitle: 'Smoothly blend tracks into one another (0s to 12s)',
      tab: 'audio',
      element: (
        <div className="flex items-center gap-3 w-44">
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={crossfade}
            onChange={(e) => updateSetting('sw_crossfade', Number(e.target.value), () => setCrossfade(Number(e.target.value)))}
            className="w-full accent-white cursor-pointer"
          />
          <span className="text-xs font-mono text-white/80 w-8 text-right">{crossfade === 0 ? 'Off' : `${crossfade}s`}</span>
        </div>
      )
    },
    {
      id: 'spatial_8d',
      title: '8D Spatial Panning Engine',
      subtitle: 'Continuous binaural orbit across stereo spectrum',
      tab: 'audio',
      element: (
        <ToggleSwitch
          checked={spatialAudio8D}
          onChange={(v) => updateSetting('sw_8d_audio', v, () => setSpatialAudio8D(v))}
        />
      )
    },
    {
      id: 'normalize',
      title: 'Auto-Normalize Volume (ReplayGain)',
      subtitle: 'Set consistent loudness across all tracks',
      tab: 'audio',
      element: (
        <ToggleSwitch
          checked={normalizeVolume}
          onChange={(v) => updateSetting('sw_normalize', v, () => setNormalizeVolume(v))}
        />
      )
    },
    {
      id: 'eq_preset',
      title: 'Equalizer Preset',
      subtitle: 'Dynamic hardware EQ filter frequency curve',
      tab: 'audio',
      element: (
        <select
          value={eqPreset}
          onChange={(e) => updateSetting('sw_eq_preset', e.target.value, () => setEqPreset(e.target.value))}
          className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
        >
          {EQUALIZER_PRESETS.map((p) => (
            <option key={p} value={p} className="bg-zinc-900 text-white">
              {p}
            </option>
          ))}
        </select>
      )
    },
    {
      id: 'theme_selector',
      title: 'Theme & Palette',
      subtitle: 'Choose between 8 distinct gradient styles',
      tab: 'appearance',
      element: (
        <select
          value={currentTheme}
          onChange={(e) => {
            updateSetting('soundwave_theme', e.target.value, () => {
              setCurrentTheme(e.target.value)
              window.dispatchEvent(new Event('theme-change'))
              updateDynamicFavicon()
            })
          }}
          className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
        >
          {AVAILABLE_THEMES.map((t) => (
            <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
              {t.name}
            </option>
          ))}
        </select>
      )
    },
    {
      id: 'visualizer_style',
      title: 'Audio Visualizer Mode',
      subtitle: 'Choose visualizer engine (Waveform, Bars, Nebula)',
      tab: 'appearance',
      element: (
        <select
          value={visualizerStyle}
          onChange={(e) => updateSetting('sw_visualizer_style', e.target.value, () => setVisualizerStyle(e.target.value))}
          className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
        >
          <option value="waveform" className="bg-zinc-900">Waveform</option>
          <option value="bars" className="bg-zinc-900">Neon Bars</option>
          <option value="nebula" className="bg-zinc-900">Circular Nebula</option>
          <option value="off" className="bg-zinc-900">Disabled</option>
        </select>
      )
    },
    {
      id: 'compact_mode',
      title: 'Compact Mode Density',
      subtitle: 'Tighter card spacing and layout',
      tab: 'appearance',
      element: (
        <ToggleSwitch
          checked={compactMode}
          onChange={(v) => updateSetting('sw_compact_mode', v, () => setCompactMode(v))}
        />
      )
    },
    {
      id: 'animated_glows',
      title: 'Animated Theme Glows',
      subtitle: 'Dynamic ambient backdrop lighting',
      tab: 'appearance',
      element: (
        <ToggleSwitch
          checked={animatedGlows}
          onChange={(v) => updateSetting('sw_animated_glows', v, () => setAnimatedGlows(v))}
        />
      )
    },
    {
      id: 'ml_training',
      title: 'Continuous ML Taste Training',
      subtitle: 'Weight recommendations using listen history',
      tab: 'ai',
      element: (
        <ToggleSwitch
          checked={mlTasteTraining}
          onChange={(v) => updateSetting('sw_ml_training', v, () => setMlTasteTraining(v))}
        />
      )
    },
    {
      id: 'private_session',
      title: 'Private Incognito Session',
      subtitle: 'Do not log listening history or influence AI',
      tab: 'ai',
      element: (
        <ToggleSwitch
          checked={privateSession}
          onChange={(v) => updateSetting('sw_private_session', v, () => setPrivateSession(v))}
        />
      )
    },
    {
      id: 'infinite_feed',
      title: 'Infinite Flow Autoplay',
      subtitle: 'Automatically queue similar music when playlist ends',
      tab: 'ai',
      element: (
        <ToggleSwitch
          checked={infiniteFeed}
          onChange={(v) => updateSetting('sw_infinite_feed', v, () => setInfiniteFeed(v))}
        />
      )
    },
    {
      id: 'reset_vectors',
      title: 'Reset AI Taste Vectors',
      subtitle: 'Clear learned taste vectors and history',
      tab: 'ai',
      element: (
        <button
          onClick={handleResetMLVectors}
          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/20 transition-all"
        >
          Reset
        </button>
      )
    },
    {
      id: 'clear_storage',
      title: 'Clear Offline Storage',
      subtitle: 'Delete cached audio tracks from IndexedDB',
      tab: 'storage',
      element: (
        <button
          onClick={handleClearOfflineStorage}
          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all"
        >
          Clear
        </button>
      )
    },
    {
      id: 'export_json',
      title: 'Export JSON Backup',
      subtitle: 'Download complete backup of playlists and likes',
      tab: 'storage',
      element: (
        <button
          onClick={handleExportBackup}
          className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all"
        >
          Export
        </button>
      )
    },
    {
      id: 'lockscreen_media',
      title: 'Lock Screen Media Session',
      subtitle: 'Native controls on Windows / Android lock screen',
      tab: 'integrations',
      element: (
        <ToggleSwitch
          checked={mediaSession}
          onChange={(v) => updateSetting('sw_media_session', v, () => setMediaSession(v))}
        />
      )
    },
    {
      id: 'keep_awake',
      title: 'Keep Screen Awake',
      subtitle: 'Prevent display timeout during playback',
      tab: 'integrations',
      element: (
        <ToggleSwitch
          checked={keepAwake}
          onChange={(v) => updateSetting('sw_keep_awake', v, () => setKeepAwake(v))}
        />
      )
    },
    {
      id: 'discord_webhook',
      title: 'Discord Track Webhook',
      subtitle: 'Send rich embeds when new song starts',
      tab: 'integrations',
      element: (
        <input
          type="password"
          value={discordWebhook}
          onChange={(e) => setDiscordWebhook(e.target.value)}
          onBlur={() => updateSetting('sw_discord_webhook', discordWebhook)}
          placeholder="https://discord.com/api/..."
          className="w-48 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-mono focus:outline-none"
        />
      )
    },
    {
      id: 'gemini_key',
      title: 'Google Gemini API Key',
      subtitle: 'Powers Soundie voice assistant features',
      tab: 'integrations',
      element: (
        <input
          type="password"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
          onBlur={() => updateSetting('sw_gemini_key', geminiKey)}
          placeholder="AIzaSy..."
          className="w-48 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-mono focus:outline-none"
        />
      )
    },
    {
      id: 'reset_password',
      title: 'Reset Password',
      subtitle: 'Send reset authentication link to registered email',
      tab: 'profile',
      element: (
        <button
          onClick={handlePasswordReset}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all"
        >
          Send Email
        </button>
      )
    }
  ]

  // Filter settings matching current search query
  const filteredSettings = searchQuery.trim()
    ? ALL_SEARCHABLE_SETTINGS.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tab.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="flex flex-col h-full overflow-y-auto sw-scroll px-4 md:px-8 py-6 max-w-7xl mx-auto w-full pb-36">
      {/* ── TOP NAV BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors w-fit group"
        >
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
            <ArrowLeft size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Settings
            </h1>
            <p className="text-xs text-white/40 font-light">Preferences & Account Management</p>
          </div>
        </button>

        {/* Global Filter Bar with Live Search & Clear button */}
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search settings (e.g. crossfade, 8d, theme)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH RESULTS VIEW (When search active) ── */}
      {searchQuery.trim().length > 0 ? (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/70">
              Search Results ({filteredSettings.length})
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-cyan-400 hover:underline"
            >
              Clear Search
            </button>
          </div>

          {filteredSettings.length > 0 ? (
            <div className="space-y-3">
              {filteredSettings.map((item) => (
                <SettingRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  badge={item.tab.toUpperCase()}
                >
                  {item.element}
                </SettingRow>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
              <Search size={28} className="mx-auto text-white/30" />
              <p className="text-sm text-white/70">No settings found for "{searchQuery}"</p>
              <p className="text-xs text-white/40">Try searching for keywords like "theme", "audio", "8D", "EQ", or "password".</p>
            </div>
          )}
        </div>
      ) : (
        /* ── MAIN SPLIT-PANE CONTAINER (Normal View) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: NAVIGATION SIDEBAR */}
          <div className="lg:col-span-4 space-y-4">
            {/* User Profile Tile */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/15 bg-zinc-900 shrink-0">
                <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {displayName || 'Soundwave User'}
                  </h3>
                  <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                </div>
                <p className="text-xs text-white/40 truncate">{user?.email || rawAuthUser?.email || 'Lossless Pro Plan'}</p>
              </div>
            </div>

            {/* Navigation Menu Links */}
            <nav className="p-2 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isSelected = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      triggerHaptic()
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={18} className={isSelected ? 'text-black' : 'text-white/60'} />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {item.label}
                        </span>
                        <span className={`block text-[10px] truncate ${isSelected ? 'text-black/70' : 'text-white/40'}`}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className={isSelected ? 'text-black/60' : 'text-white/20'} />
                  </button>
                )
              })}
            </nav>

            {/* Quick Actions Footer */}
            <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <button
                onClick={() => setShowDownloadModal(true)}
                className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} />
                <span>Mobile App</span>
              </button>
              <button
                onClick={() => logout()}
                className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILED SETTINGS PANE */}
          <div className="lg:col-span-8 space-y-8">
            {/* 👤 1. PROFILE & ACCOUNT */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Profile & Account
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Manage your public persona, identifiers, and security credentials.</p>
                </div>

                {/* Profile Card */}
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-5">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Public Profile</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/50 block mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/50 block mb-1.5">Personal Bio / Status</label>
                      <input
                        type="text"
                        value={userBio}
                        onChange={(e) => setUserBio(e.target.value)}
                        placeholder="What are you listening to?"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-2">Preset Avatar Selection</label>
                    <div className="flex flex-wrap gap-2.5">
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCustomAvatarUrl(url)}
                          className={`w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${
                            customAvatarUrl === url ? 'border-white scale-105 shadow-lg' : 'border-white/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1.5">Custom Avatar URL</label>
                    <input
                      type="text"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-white/90 transition-all"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>

                {/* Account Security */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider px-1">Security & Data</h3>

                  <SettingRow title="Account Identifier (UID)" subtitle="Unique immutable account ID">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/60 truncate max-w-[180px]">{displayId}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayId)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Copy UID"
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </SettingRow>

                  <SettingRow title="Reset Password" subtitle="Send an authentication reset link to your registered email">
                    <button
                      onClick={handlePasswordReset}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all"
                    >
                      Send Email
                    </button>
                  </SettingRow>

                  <SettingRow title="Delete Account" subtitle="Permanently delete account, cloud likes, and playlists">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition-all"
                    >
                      Delete Account
                    </button>
                  </SettingRow>
                </div>
              </div>
            )}

            {/* 🎧 2. AUDIO & PLAYBACK QUALITY */}
            {activeTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Audio & Playback Quality
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Configure audio streaming fidelity, spatial panning, and sound processing.</p>
                </div>

                {/* Streaming Quality Selector */}
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Streaming Audio Fidelity</h3>
                      <p className="text-xs text-white/50 mt-0.5">Higher bitrates deliver richer master frequencies</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                      {audioQuality === 'best' ? '320kbps Lossless' : '128kbps Standard'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAudioQualityChange('best')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        audioQuality === 'best'
                          ? 'bg-white text-black border-white shadow-xl'
                          : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-extrabold uppercase tracking-wider">Hi-Fi Lossless (320k)</span>
                      <span className={`block text-[11px] mt-1 ${audioQuality === 'best' ? 'text-black/70' : 'text-white/40'}`}>
                        Studio dynamic range & lossless depth
                      </span>
                    </button>

                    <button
                      onClick={() => handleAudioQualityChange('standard')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        audioQuality === 'standard'
                          ? 'bg-white text-black border-white shadow-xl'
                          : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-extrabold uppercase tracking-wider">Standard (128k)</span>
                      <span className={`block text-[11px] mt-1 ${audioQuality === 'standard' ? 'text-black/70' : 'text-white/40'}`}>
                        Compressed streaming for low bandwidth
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sliders & Processing */}
                <div className="space-y-3">
                  <SettingRow title="Crossfade Duration" subtitle="Blend transitions smoothly between songs">
                    <div className="flex items-center gap-3 w-48">
                      <input
                        type="range"
                        min={0}
                        max={12}
                        step={1}
                        value={crossfade}
                        onChange={(e) => updateSetting('sw_crossfade', Number(e.target.value), () => setCrossfade(Number(e.target.value)))}
                        className="w-full accent-white cursor-pointer"
                      />
                      <span className="text-xs font-mono text-white/80 w-8 text-right">{crossfade === 0 ? 'Off' : `${crossfade}s`}</span>
                    </div>
                  </SettingRow>

                  <SettingRow title="Hardware Equalizer Preset" subtitle="Dynamic EQ curve applied to master output">
                    <select
                      value={eqPreset}
                      onChange={(e) => updateSetting('sw_eq_preset', e.target.value, () => setEqPreset(e.target.value))}
                      className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      {EQUALIZER_PRESETS.map((p) => (
                        <option key={p} value={p} className="bg-zinc-900 text-white">
                          {p}
                        </option>
                      ))}
                    </select>
                  </SettingRow>

                  <SettingRow title="8D Spatial Panning Engine" subtitle="Continuous binaural orbit across stereo spectrum">
                    <ToggleSwitch
                      checked={spatialAudio8D}
                      onChange={(v) => updateSetting('sw_8d_audio', v, () => setSpatialAudio8D(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Volume Normalization" subtitle="Set consistent loudness across all tracks (ReplayGain)">
                    <ToggleSwitch
                      checked={normalizeVolume}
                      onChange={(v) => updateSetting('sw_normalize', v, () => setNormalizeVolume(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Gapless Playback" subtitle="Eliminate silent gaps between continuous album tracks">
                    <ToggleSwitch
                      checked={gaplessPlayback}
                      onChange={(v) => updateSetting('sw_gapless', v, () => setGaplessPlayback(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Mono Audio Output" subtitle="Combine stereo channels into single balanced output">
                    <ToggleSwitch
                      checked={monoAudio}
                      onChange={(v) => updateSetting('sw_mono_audio', v, () => setMonoAudio(v))}
                    />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* 🎨 3. THEMES & VISUALS */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Themes & Visuals
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Customize application color palettes, ambient glows, and visualizer engines.</p>
                </div>

                {/* Theme Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVAILABLE_THEMES.map((theme) => {
                    const isSelected = currentTheme === theme.id
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          updateSetting('soundwave_theme', theme.id, () => {
                            setCurrentTheme(theme.id)
                            window.dispatchEvent(new Event('theme-change'))
                            updateDynamicFavicon()
                          })
                        }}
                        className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group ${
                          isSelected
                            ? 'border-white bg-white/10 shadow-2xl scale-[1.01]'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {theme.name}
                          </span>
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: theme.accent }}
                          />
                        </div>

                        <p className="text-xs text-white/50 font-light mb-4">{theme.desc}</p>

                        <div className={`h-10 w-full rounded-2xl bg-gradient-to-r ${theme.gradient} border border-white/10 flex items-center px-3 justify-between`}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                            <span className="text-[10px] font-mono text-white/70">Preview</span>
                          </div>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Visual Toggles */}
                <div className="space-y-3">
                  <SettingRow title="Audio Visualizer Style" subtitle="Choose real-time audio canvas rendering engine">
                    <select
                      value={visualizerStyle}
                      onChange={(e) => updateSetting('sw_visualizer_style', e.target.value, () => setVisualizerStyle(e.target.value))}
                      className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="waveform" className="bg-zinc-900">Frequency Waveform</option>
                      <option value="bars" className="bg-zinc-900">Cyber Neon Bars</option>
                      <option value="nebula" className="bg-zinc-900">Circular Nebula</option>
                      <option value="off" className="bg-zinc-900">Disabled</option>
                    </select>
                  </SettingRow>

                  <SettingRow title="Animated Ambient Theme Glows" subtitle="Subtle responsive ambient canvas lighting">
                    <ToggleSwitch
                      checked={animatedGlows}
                      onChange={(v) => updateSetting('sw_animated_glows', v, () => setAnimatedGlows(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Compact Mode Density" subtitle="Reduce padding and tile sizes for higher information density">
                    <ToggleSwitch
                      checked={compactMode}
                      onChange={(v) => updateSetting('sw_compact_mode', v, () => setCompactMode(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Reduce Motion Animations" subtitle="Minimize fast zoom and parallax transitions">
                    <ToggleSwitch
                      checked={reduceMotion}
                      onChange={(v) => updateSetting('sw_reduce_motion', v, () => setReduceMotion(v))}
                    />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* 🤖 4. AI & ALGORITHM */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    AI & Taste Algorithm
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Control how Soundwave continuously learns your musical preferences.</p>
                </div>

                <div className="space-y-3">
                  <SettingRow title="Continuous ML Taste Profiling" subtitle="Calculate affinity weights from repeat track listen counts">
                    <ToggleSwitch
                      checked={mlTasteTraining}
                      onChange={(v) => updateSetting('sw_ml_training', v, () => setMlTasteTraining(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Infinite Flow Autoplay" subtitle="Automatically queue matching similar music when queue ends">
                    <ToggleSwitch
                      checked={infiniteFeed}
                      onChange={(v) => updateSetting('sw_infinite_feed', v, () => setInfiniteFeed(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Private Incognito Session" subtitle="Temporarily prevent plays from logging or affecting recommendations">
                    <ToggleSwitch
                      checked={privateSession}
                      onChange={(v) => updateSetting('sw_private_session', v, () => setPrivateSession(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Reset Recommendation Vectors" subtitle="Clear learned musical vectors and restore default mix curation">
                    <button
                      onClick={handleResetMLVectors}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-300 transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      <span>Reset Vectors</span>
                    </button>
                  </SettingRow>
                </div>
              </div>
            )}

            {/* 💾 5. STORAGE & BACKUP */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Storage & Backup
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Manage browser IndexedDB cache and export full library backups.</p>
                </div>

                <div className="space-y-3">
                  <SettingRow title="Clear Offline Cache" subtitle="Delete cached lossless streams & offline downloaded tracks">
                    <button
                      onClick={handleClearOfflineStorage}
                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Clear Storage</span>
                    </button>
                  </SettingRow>

                  <SettingRow title="Export Soundwave Backup" subtitle="Download full JSON file containing playlists, likes, and preferences">
                    <button
                      onClick={handleExportBackup}
                      className="px-4 py-2 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-white/90 transition-all flex items-center gap-1.5"
                    >
                      <FileDown size={14} />
                      <span>Export JSON</span>
                    </button>
                  </SettingRow>

                  <SettingRow title="Restore Library Backup" subtitle="Import and restore your saved playlists & settings from a JSON file">
                    <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center gap-1.5 cursor-pointer">
                      <FileUp size={14} />
                      <span>Import JSON</span>
                      <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                    </label>
                  </SettingRow>
                </div>
              </div>
            )}

            {/* ⚡ 6. INTEGRATIONS & NATIVE */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Integrations & Native Controls
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">OS integration, lockscreen media controls, and API configurations.</p>
                </div>

                <div className="space-y-3">
                  <SettingRow title="Media Session Lockscreen Controls" subtitle="Display track artwork and playback controls on OS lockscreen">
                    <ToggleSwitch
                      checked={mediaSession}
                      onChange={(v) => updateSetting('sw_media_session', v, () => setMediaSession(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Keep Screen Awake" subtitle="Prevent screen sleep when fullscreen player/visualizer is active">
                    <ToggleSwitch
                      checked={keepAwake}
                      onChange={(v) => updateSetting('sw_keep_awake', v, () => setKeepAwake(v))}
                    />
                  </SettingRow>

                  <SettingRow title="Haptic Vibration Feedback" subtitle="Physical tactile response on playback actions (Mobile)">
                    <ToggleSwitch
                      checked={hapticsEnabled}
                      onChange={(v) => updateSetting('sw_haptics', v, () => setHapticsEnabled(v))}
                    />
                  </SettingRow>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Soundie AI Assistant Keys</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Google Gemini API Key</label>
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        onBlur={() => updateSetting('sw_gemini_key', geminiKey)}
                        placeholder="AIzaSy..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/50 block mb-1">Discord Track Webhook URL</label>
                      <input
                        type="password"
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        onBlur={() => updateSetting('sw_discord_webhook', discordWebhook)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ℹ️ 7. ABOUT SOUNDWAVE */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    About Soundwave
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">High-Fidelity Lossless Audio Streaming System.</p>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black border border-white/15 p-2 shadow-xl shrink-0">
                    <img src={Logo} alt="Soundwave" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Soundwave
                    </h3>
                    <p className="text-xs text-white/50">Version 1.5.0 • Lossless Hi-Fi Audio Engine</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-white/40 uppercase block">Engine</span>
                    <span className="text-xs font-bold text-white mt-1 block">WebAudio 8D Panning</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-white/40 uppercase block">Platform</span>
                    <span className="text-xs font-bold text-white mt-1 block">
                      {Capacitor.isNativePlatform() ? 'Android Native' : 'Modern Web'}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono text-white/40 uppercase block">License</span>
                    <span className="text-xs font-bold text-cyan-400 mt-1 block">Open Soundwave Pro</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <DownloadModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
      )}

      {/* Delete Account Modal Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-zinc-950 border border-red-500/30 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Delete Account?</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              This will permanently delete your account, saved liked tracks, custom playlists, and listening history. This action cannot be undone.
            </p>
            {deleteError && <p className="text-xs text-red-400 font-mono">{deleteError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountSettingsPage
