import React from 'react'
import {
  Laptop,
  Smartphone,
  Tablet,
  Speaker,
  Tv,
  Check,
  X,
  Volume2,
  RefreshCw,
  Sparkles,
  Cast
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

  if (!isOpen) return null

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
    await transferPlaybackToDevice(device.deviceId, device.name)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#121216] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col text-white"
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cast size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Connect to a Device</h2>
              <p className="text-xs text-zinc-400">Spotify-Style Cross-Device Handoff</p>
            </div>
          </div>
          <button
            onClick={() => { triggerHaptic(); onClose(); }}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Device Status Banner */}
        <div className="my-4 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Speaker size={22} />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Current Audio Output
                </span>
              </div>
              <p className="font-bold text-sm text-white truncate mt-0.5">
                {isLocalDeviceActive ? 'This Device' : (activeDeviceName || 'Remote Device')}
              </p>
              <p className="text-xs text-emerald-200/60 truncate">
                {currentSong ? `Playing "${currentSong.title}"` : 'Ready to stream'}
              </p>
            </div>
          </div>

          {!isLocalDeviceActive && (
            <button
              onClick={() => {
                const localDev = connectedDevices.find(d => d.deviceId === currentDeviceId)
                if (localDev) handleDeviceClick(localDev)
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shrink-0 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              Play Here
            </button>
          )}
        </div>

        {/* Device List Header */}
        <div className="px-1 mb-2 shrink-0 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Select a Device ({connectedDevices.length})
          </span>
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Sync
          </span>
        </div>

        {/* Scrollable Device List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {connectedDevices.map((device) => {
            const isCurrent = device.deviceId === currentDeviceId
            const isActivePlayback = device.deviceId === activeDeviceId || (!activeDeviceId && isCurrent)

            return (
              <button
                key={device.deviceId}
                onClick={() => handleDeviceClick(device)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                  isActivePlayback
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                    : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      isActivePlayback
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/5 text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    {getDeviceIcon(device.type, 20)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm truncate ${isActivePlayback ? 'text-emerald-300' : 'text-zinc-200'}`}>
                        {device.name}
                      </p>
                      {isCurrent && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">
                          This Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {isActivePlayback ? 'Audio playing here' : 'Tap to transfer playback'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  {isActivePlayback ? (
                    <div className="flex items-end gap-0.5 h-4 px-2">
                      <span className="w-1 bg-emerald-400 rounded-full animate-[sw-waveform_0.8s_ease-in-out_infinite]" style={{ height: '60%' }} />
                      <span className="w-1 bg-emerald-400 rounded-full animate-[sw-waveform_1.1s_ease-in-out_infinite_0.2s]" style={{ height: '100%' }} />
                      <span className="w-1 bg-emerald-400 rounded-full animate-[sw-waveform_0.9s_ease-in-out_infinite_0.4s]" style={{ height: '80%' }} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/10 transition-colors">
                      <Cast size={16} />
                    </div>
                  )}
                </div>
              </button>
            )
          })}

          {connectedDevices.length <= 1 && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center mt-3">
              <Sparkles size={24} className="mx-auto mb-2 text-indigo-400/60" />
              <p className="text-xs font-bold text-zinc-300 mb-1">Looking for other devices?</p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Log into SoundWave on your PC, laptop, or phone to transfer music seamlessly with instant seek sync.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/5 text-center shrink-0">
          <p className="text-[11px] text-zinc-500">
            Music automatically pauses on former device when transferring.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DevicePickerModal
