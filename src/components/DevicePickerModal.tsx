import React, { useState, useEffect } from 'react'
import {
  Laptop,
  Smartphone,
  Tablet,
  Speaker,
  X,
  Cast,
  Check,
  Edit2,
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

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

  // Clean theme accent mappings
  const themeAccents: Record<string, {
    activeText: string
    activeBg: string
    activeBorder: string
    btnBg: string
    barColor: string
  }> = {
    default: {
      activeText: 'text-indigo-400',
      activeBg: 'bg-indigo-500/10',
      activeBorder: 'border-indigo-500/30',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      barColor: 'bg-indigo-400'
    },
    sunset: {
      activeText: 'text-orange-400',
      activeBg: 'bg-orange-500/10',
      activeBorder: 'border-orange-500/30',
      btnBg: 'bg-orange-600 hover:bg-orange-500 text-white',
      barColor: 'bg-orange-400'
    },
    valentine: {
      activeText: 'text-pink-400',
      activeBg: 'bg-pink-500/10',
      activeBorder: 'border-pink-500/30',
      btnBg: 'bg-pink-600 hover:bg-pink-500 text-white',
      barColor: 'bg-pink-400'
    },
    jungle: {
      activeText: 'text-emerald-400',
      activeBg: 'bg-emerald-500/10',
      activeBorder: 'border-emerald-500/30',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      barColor: 'bg-emerald-400'
    },
    ocean: {
      activeText: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10',
      activeBorder: 'border-cyan-500/30',
      btnBg: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      barColor: 'bg-cyan-400'
    },
    cyberpunk: {
      activeText: 'text-fuchsia-400',
      activeBg: 'bg-fuchsia-500/10',
      activeBorder: 'border-fuchsia-500/30',
      btnBg: 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white',
      barColor: 'bg-fuchsia-400'
    },
    midnight: {
      activeText: 'text-violet-400',
      activeBg: 'bg-violet-500/10',
      activeBorder: 'border-violet-500/30',
      btnBg: 'bg-violet-600 hover:bg-violet-500 text-white',
      barColor: 'bg-violet-400'
    },
    coffee: {
      activeText: 'text-amber-400',
      activeBg: 'bg-amber-600/10',
      activeBorder: 'border-amber-600/30',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      barColor: 'bg-amber-400'
    }
  }

  const activeTheme = themeAccents[theme] || themeAccents['default']

  const triggerHaptic = async () => {
    if (localStorage.getItem('sw_haptics') !== 'false' && Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style: ImpactStyle.Light }) } catch {}
    }
  }

  const getDeviceIcon = (type: DeviceInfo['type'], size = 18) => {
    switch (type) {
      case 'smartphone':
        return <Smartphone size={size} />
      case 'tablet':
        return <Tablet size={size} />
      case 'speaker':
        return <Speaker size={size} />
      default:
        return <Laptop size={size} />
    }
  }

  const isLocalActive = activeDeviceId === currentDeviceId || !activeDeviceId

  const handleTransfer = async (device: DeviceInfo) => {
    triggerHaptic()
    await transferPlaybackToDevice(device.deviceId, device.name)
  }

  const handleSaveNickname = (deviceId: string) => {
    if (nameInput.trim()) {
      localStorage.setItem('sw_custom_device_name', nameInput.trim())
      setEditingId(null)
      window.location.reload()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#111116] border border-white/10 sm:rounded-2xl rounded-t-2xl p-5 shadow-2xl flex flex-col text-white animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ fontFamily: 'Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Cast size={18} className={activeTheme.activeText} />
            <h3 className="font-bold text-sm tracking-tight">Connect to a device</h3>
          </div>
          <button
            onClick={() => { triggerHaptic(); onClose(); }}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Playback Banner */}
        <div className="my-3.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? `${activeTheme.barColor} animate-pulse` : 'bg-white/30'}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">
                {isLocalActive ? 'Listening on this device' : `Playing on ${activeDeviceName || 'Remote Device'}`}
              </p>
              {currentSong && (
                <p className="text-[11px] text-white/40 truncate">
                  {currentSong.title} · {currentSong.artist}
                </p>
              )}
            </div>
          </div>

          {!isLocalActive && (
            <button
              onClick={() => {
                const local = connectedDevices.find(d => d.deviceId === currentDeviceId)
                if (local) handleTransfer(local)
              }}
              className={`px-2.5 py-1 rounded-lg ${activeTheme.btnBg} text-[11px] font-bold shrink-0 transition-transform active:scale-95`}
            >
              Play Here
            </button>
          )}
        </div>

        {/* Device List */}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 px-0.5">
          Select a device
        </div>

        <div className="space-y-1 overflow-y-auto max-h-60">
          {connectedDevices.map((device) => {
            const isCurrent = device.deviceId === currentDeviceId
            const isActive = device.deviceId === activeDeviceId || (!activeDeviceId && isCurrent)

            return (
              <div
                key={device.deviceId}
                onClick={() => !isActive && handleTransfer(device)}
                className={`w-full p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  isActive
                    ? `${activeTheme.activeBg} ${activeTheme.activeBorder}`
                    : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`shrink-0 ${isActive ? activeTheme.activeText : 'text-white/40'}`}>
                    {getDeviceIcon(device.type, 18)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === device.deviceId ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Device name"
                          className="px-2 py-0.5 rounded bg-black/60 border border-white/20 text-xs text-white outline-none w-32"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNickname(device.deviceId)}
                          className="p-1 rounded bg-white/10 text-white"
                        >
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-semibold truncate ${isActive ? activeTheme.activeText : 'text-white/90'}`}>
                          {device.name}
                        </p>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-white/40 bg-white/[0.06] px-1.5 py-0.5 rounded">
                            This device
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-white/30 truncate mt-0.5">
                      {isActive ? 'Current playback' : 'Tap to switch'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isCurrent && editingId !== device.deviceId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(device.deviceId)
                        setNameInput(device.name)
                      }}
                      title="Rename device"
                      className="p-1 text-white/20 hover:text-white/60 transition-colors"
                    >
                      <Edit2 size={11} />
                    </button>
                  )}

                  {isActive && (
                    <div className="flex items-end gap-0.5 h-3 px-1">
                      <span className={`w-0.5 rounded-full animate-[sw-waveform_0.8s_ease-in-out_infinite] ${activeTheme.barColor}`} style={{ height: '60%' }} />
                      <span className={`w-0.5 rounded-full animate-[sw-waveform_1.1s_ease-in-out_infinite_0.2s] ${activeTheme.barColor}`} style={{ height: '100%' }} />
                      <span className={`w-0.5 rounded-full animate-[sw-waveform_0.9s_ease-in-out_infinite_0.4s] ${activeTheme.barColor}`} style={{ height: '75%' }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {connectedDevices.length <= 1 && (
          <p className="text-[11px] text-white/30 text-center mt-3 pt-2.5 border-t border-white/[0.06]">
            Open SoundWave on another phone or computer to seamlessly transfer playback.
          </p>
        )}
      </div>
    </div>
  )
}

export default DevicePickerModal
