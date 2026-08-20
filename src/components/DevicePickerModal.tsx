import React, { useState, useEffect } from 'react'
import {
  Laptop,
  Smartphone,
  Tablet,
  Speaker,
  X,
  Volume2,
  Sparkles,
  Cast,
  Check,
  Edit2,
  RefreshCw,
  Radio
} from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import { DeviceInfo } from '../utils/deviceSync'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

interface DevicePickerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DevicePickerModal: React.FC<DevicePickerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    connectedDevices,
    currentDeviceId,
    activeDeviceId,
    activeDeviceName,
    transferPlaybackToDevice,
    isPlaying,
    currentSong,
  } = usePlayer()

  const [theme, setTheme] = useState(() => localStorage.getItem('soundwave_theme') || 'default')
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
  const [customNameInput, setCustomNameInput] = useState('')
  const [isTransferringId, setIsTransferringId] = useState<string | null>(null)

  useEffect(() => {
    const handleThemeUpdate = () => {
      setTheme(localStorage.getItem('soundwave_theme') || 'default')
    }
    window.addEventListener('theme-change', handleThemeUpdate)
    window.addEventListener('sw-settings-updated', handleThemeUpdate)
    return () => {
      window.removeEventListener('theme-change', handleThemeUpdate)
      window.removeEventListener('sw-settings-updated', handleThemeUpdate)
    }
  }, [])

  if (!isOpen) return null

  // Theme-aware styles matching SoundWave design
  const themeStyles: Record<string, {
    modalBg: string
    border: string
    accentBg: string
    accentText: string
    accentBorder: string
    activeCard: string
    glowShadow: string
    btnBg: string
    badgeBg: string
  }> = {
    default: {
      modalBg: 'bg-[#09090e]/95',
      border: 'border-indigo-500/20',
      accentBg: 'bg-indigo-500/10',
      accentText: 'text-indigo-400',
      accentBorder: 'border-indigo-500/30',
      activeCard: 'bg-indigo-950/40 border-indigo-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(99,102,241,0.15)]',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    sunset: {
      modalBg: 'bg-[#180805]/95',
      border: 'border-orange-500/20',
      accentBg: 'bg-orange-500/10',
      accentText: 'text-orange-400',
      accentBorder: 'border-orange-500/30',
      activeCard: 'bg-orange-950/40 border-orange-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]',
      btnBg: 'bg-orange-600 hover:bg-orange-500 text-white',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    },
    valentine: {
      modalBg: 'bg-[#1a0611]/95',
      border: 'border-pink-500/20',
      accentBg: 'bg-pink-500/10',
      accentText: 'text-pink-400',
      accentBorder: 'border-pink-500/30',
      activeCard: 'bg-pink-950/40 border-pink-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(236,72,153,0.15)]',
      btnBg: 'bg-pink-600 hover:bg-pink-500 text-white',
      badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    },
    jungle: {
      modalBg: 'bg-[#03150a]/95',
      border: 'border-emerald-500/20',
      accentBg: 'bg-emerald-500/10',
      accentText: 'text-emerald-400',
      accentBorder: 'border-emerald-500/30',
      activeCard: 'bg-emerald-950/40 border-emerald-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    ocean: {
      modalBg: 'bg-[#04121a]/95',
      border: 'border-cyan-500/20',
      accentBg: 'bg-cyan-500/10',
      accentText: 'text-cyan-400',
      accentBorder: 'border-cyan-500/30',
      activeCard: 'bg-cyan-950/40 border-cyan-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(6,182,212,0.15)]',
      btnBg: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    cyberpunk: {
      modalBg: 'bg-[#120420]/95',
      border: 'border-fuchsia-500/20',
      accentBg: 'bg-fuchsia-500/10',
      accentText: 'text-fuchsia-400',
      accentBorder: 'border-fuchsia-500/30',
      activeCard: 'bg-fuchsia-950/40 border-fuchsia-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(217,70,239,0.15)]',
      btnBg: 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white',
      badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
    },
    midnight: {
      modalBg: 'bg-[#0a0517]/95',
      border: 'border-violet-500/20',
      accentBg: 'bg-violet-500/10',
      accentText: 'text-violet-400',
      accentBorder: 'border-violet-500/30',
      activeCard: 'bg-violet-950/40 border-violet-500/40',
      glowShadow: 'shadow-[0_0_30px_rgba(139,92,246,0.15)]',
      btnBg: 'bg-violet-600 hover:bg-violet-500 text-white',
      badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    },
    coffee: {
      modalBg: 'bg-[#140a04]/95',
      border: 'border-amber-600/20',
      accentBg: 'bg-amber-600/10',
      accentText: 'text-amber-400',
      accentBorder: 'border-amber-600/30',
      activeCard: 'bg-amber-950/40 border-amber-600/40',
      glowShadow: 'shadow-[0_0_30px_rgba(217,119,6,0.15)]',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      badgeBg: 'bg-amber-600/20 text-amber-300 border-amber-600/30'
    }
  }

  const currentThemeStyle = themeStyles[theme] || themeStyles['default']

  const triggerHaptic = async (style = ImpactStyle.Light) => {
    if (localStorage.getItem('sw_haptics') !== 'false' && Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }) } catch {}
    }
  }

  const getDeviceIcon = (type: DeviceInfo['type'], size = 20, className = '') => {
    switch (type) {
      case 'smartphone':
        return <Smartphone size={size} className={className} />
      case 'tablet':
        return <Tablet size={size} className={className} />
      case 'speaker':
        return <Speaker size={size} className={className} />
      default:
        return <Laptop size={size} className={className} />
    }
  }

  const isLocalDeviceActive = activeDeviceId === currentDeviceId || !activeDeviceId

  const handleDeviceClick = async (device: DeviceInfo) => {
    triggerHaptic(ImpactStyle.Medium)
    setIsTransferringId(device.deviceId)
    try {
      await transferPlaybackToDevice(device.deviceId, device.name)
    } finally {
      setTimeout(() => setIsTransferringId(null), 800)
    }
  }

  const saveCustomNickname = () => {
    if (!customNameInput.trim()) return
    localStorage.setItem('sw_custom_device_name', customNameInput.trim())
    setEditingDeviceId(null)
    window.location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md ${currentThemeStyle.modalBg} border ${currentThemeStyle.border} ${currentThemeStyle.glowShadow} rounded-t-3xl md:rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col text-white backdrop-blur-2xl`}
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${currentThemeStyle.accentBg} ${currentThemeStyle.accentText} border ${currentThemeStyle.accentBorder}`}>
              <Cast size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Connect a Device</h2>
              <p className="text-xs text-white/50">Cross-Device Seamless Audio Handoff</p>
            </div>
          </div>
          <button
            onClick={() => { triggerHaptic(); onClose(); }}
            className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Output Showcase */}
        <div className={`my-4 p-4 rounded-2xl border ${currentThemeStyle.activeCard} flex items-center justify-between gap-3 shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative p-3 rounded-xl ${currentThemeStyle.accentBg} ${currentThemeStyle.accentText}`}>
              <Speaker size={22} />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentThemeStyle.btnBg.split(' ')[0]}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${currentThemeStyle.btnBg.split(' ')[0]}`}></span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentThemeStyle.badgeBg}`}>
                  {isLocalDeviceActive ? 'Playing on this device' : 'Playing on remote'}
                </span>
              </div>
              <p className="font-bold text-sm text-white truncate mt-1">
                {isLocalDeviceActive ? 'This Device' : (activeDeviceName || 'Remote Device')}
              </p>
              <p className={`text-xs ${currentThemeStyle.accentText} truncate opacity-80`}>
                {currentSong ? `"${currentSong.title}" by ${currentSong.artist}` : 'Ready to stream'}
              </p>
            </div>
          </div>

          {!isLocalDeviceActive && (
            <button
              onClick={() => {
                const localDev = connectedDevices.find(d => d.deviceId === currentDeviceId)
                if (localDev) handleDeviceClick(localDev)
              }}
              disabled={isTransferringId === currentDeviceId}
              className={`px-3.5 py-2 rounded-xl ${currentThemeStyle.btnBg} text-xs font-bold shrink-0 active:scale-95 transition-all shadow-lg flex items-center gap-1.5`}
            >
              {isTransferringId === currentDeviceId ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Radio size={14} />
              )}
              Play Here
            </button>
          )}
        </div>

        {/* Device List Header */}
        <div className="px-1 mb-2 shrink-0 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">
            Available Devices ({connectedDevices.length})
          </span>
          <span className="text-[11px] text-white/40 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${currentThemeStyle.btnBg.split(' ')[0]}`}></span> Real-time Sync
          </span>
        </div>

        {/* Scrollable Device List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {connectedDevices.map((device) => {
            const isCurrent = device.deviceId === currentDeviceId
            const isActivePlayback = device.deviceId === activeDeviceId || (!activeDeviceId && isCurrent)
            const isTransferring = isTransferringId === device.deviceId

            return (
              <div
                key={device.deviceId}
                className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                  isActivePlayback
                    ? `${currentThemeStyle.activeCard}`
                    : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div
                  className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => handleDeviceClick(device)}
                >
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      isActivePlayback
                        ? `${currentThemeStyle.btnBg}`
                        : 'bg-white/5 text-white/50 group-hover:text-white'
                    }`}
                  >
                    {getDeviceIcon(device.type, 20)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {editingDeviceId === device.deviceId ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={customNameInput}
                            onChange={(e) => setCustomNameInput(e.target.value)}
                            placeholder="Device nickname"
                            className="px-2 py-0.5 rounded bg-black/60 border border-white/20 text-xs text-white outline-none w-36"
                            autoFocus
                          />
                          <button
                            onClick={saveCustomNickname}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <p className={`font-bold text-sm truncate ${isActivePlayback ? currentThemeStyle.accentText : 'text-white/90'}`}>
                          {device.name}
                        </p>
                      )}
                      {isCurrent && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                          This Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {isActivePlayback ? 'Audio currently outputting here' : 'Tap to transfer playback here'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  {isCurrent && !editingDeviceId && (
                    <button
                      onClick={() => {
                        setEditingDeviceId(device.deviceId)
                        setCustomNameInput(device.name)
                      }}
                      title="Rename this device"
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}

                  {isTransferring ? (
                    <RefreshCw size={16} className="animate-spin text-white/60 mx-2" />
                  ) : isActivePlayback ? (
                    <div className="flex items-end gap-0.5 h-4 px-2">
                      <span className={`w-1 rounded-full animate-[sw-waveform_0.8s_ease-in-out_infinite] ${currentThemeStyle.btnBg.split(' ')[0]}`} style={{ height: '60%' }} />
                      <span className={`w-1 rounded-full animate-[sw-waveform_1.1s_ease-in-out_infinite_0.2s] ${currentThemeStyle.btnBg.split(' ')[0]}`} style={{ height: '100%' }} />
                      <span className={`w-1 rounded-full animate-[sw-waveform_0.9s_ease-in-out_infinite_0.4s] ${currentThemeStyle.btnBg.split(' ')[0]}`} style={{ height: '80%' }} />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeviceClick(device)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-xs font-semibold transition-colors"
                    >
                      Transfer
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {connectedDevices.length <= 1 && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center mt-3">
              <Sparkles size={24} className={`mx-auto mb-2 opacity-60 ${currentThemeStyle.accentText}`} />
              <p className="text-xs font-bold text-white/80 mb-1">Open SoundWave on another device</p>
              <p className="text-[11px] text-white/40 max-w-xs mx-auto">
                Sign in on your phone or laptop. Music will seamlessly transfer at the exact second you left off.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center shrink-0">
          <p className="text-[11px] text-white/40">
            Playing on one device pauses playback on all other devices automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DevicePickerModal
