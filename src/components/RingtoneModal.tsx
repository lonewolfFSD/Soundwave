import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Play, Pause, X, Loader2, Check, Scissors, Volume2, Sparkles, Smartphone, Music } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';
import type { Song } from '../context/PlayerContext';
import { Ringtone, isNativeAndroid } from '../utils/ringtone';
import { extractYoutubeVideoId, findYouTubeVideoId, getAudioStreamUrl } from '../utils/ytMusic';
import { getOfflineSongById } from '../utils/offlineStorage';

interface RingtoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
}

// Convert AudioBuffer to 16-bit PCM WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const RingtoneModal: React.FC<RingtoneModalProps> = ({ isOpen, onClose, song }) => {
  const [startTime, setStartTime] = useState(0);
  const [durationLength, setDurationLength] = useState<number>(30); // 15, 30, 45, or 0 (full)
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isSetting, setIsSetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>('');
  const [theme, setTheme] = useState(() => localStorage.getItem('soundwave_theme') || 'default');

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync theme
  useEffect(() => {
    const handleTheme = () => setTheme(localStorage.getItem('soundwave_theme') || 'default');
    window.addEventListener('theme-change', handleTheme);
    window.addEventListener('sw-settings-updated', handleTheme);
    return () => {
      window.removeEventListener('theme-change', handleTheme);
      window.removeEventListener('sw-settings-updated', handleTheme);
    };
  }, []);

  const themeAccents: Record<string, {
    activeText: string;
    activeBg: string;
    activeBorder: string;
    btnBg: string;
    barColor: string;
    pillBg: string;
  }> = {
    default: {
      activeText: 'text-indigo-400',
      activeBg: 'bg-indigo-500/10',
      activeBorder: 'border-indigo-500/30',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      barColor: 'bg-indigo-500',
      pillBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    sunset: {
      activeText: 'text-orange-400',
      activeBg: 'bg-orange-500/10',
      activeBorder: 'border-orange-500/30',
      btnBg: 'bg-orange-600 hover:bg-orange-500 text-white',
      barColor: 'bg-orange-500',
      pillBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    },
    valentine: {
      activeText: 'text-pink-400',
      activeBg: 'bg-pink-500/10',
      activeBorder: 'border-pink-500/30',
      btnBg: 'bg-pink-600 hover:bg-pink-500 text-white',
      barColor: 'bg-pink-500',
      pillBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    },
    jungle: {
      activeText: 'text-emerald-400',
      activeBg: 'bg-emerald-500/10',
      activeBorder: 'border-emerald-500/30',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      barColor: 'bg-emerald-500',
      pillBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    ocean: {
      activeText: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10',
      activeBorder: 'border-cyan-500/30',
      btnBg: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      barColor: 'bg-cyan-500',
      pillBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    cyberpunk: {
      activeText: 'text-fuchsia-400',
      activeBg: 'bg-fuchsia-500/10',
      activeBorder: 'border-fuchsia-500/30',
      btnBg: 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white',
      barColor: 'bg-fuchsia-500',
      pillBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
    },
    midnight: {
      activeText: 'text-violet-400',
      activeBg: 'bg-violet-500/10',
      activeBorder: 'border-violet-500/30',
      btnBg: 'bg-violet-600 hover:bg-violet-500 text-white',
      barColor: 'bg-violet-500',
      pillBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    },
    coffee: {
      activeText: 'text-amber-400',
      activeBg: 'bg-amber-600/10',
      activeBorder: 'border-amber-600/30',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      barColor: 'bg-amber-500',
      pillBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    }
  };

  const activeTheme = themeAccents[theme] || themeAccents['default'];

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style }).catch(() => {});
    }
  };

  const totalSongDuration = song?.duration && song.duration > 0 ? song.duration : 180;
  const effectiveLength = durationLength === 0 ? Math.max(15, totalSongDuration - startTime) : durationLength;
  const maxStartTime = Math.max(0, totalSongDuration - (durationLength === 0 ? 15 : durationLength));

  const stopPreview = () => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
      } catch {}
    }
    setIsPreviewing(false);
    setPreviewProgress(0);
  };

  useEffect(() => {
    if (!isOpen) {
      stopPreview();
      setIsSuccess(false);
      setIsSetting(false);
      setResolvedAudioUrl('');
    }
  }, [isOpen]);

  // Resolve playable audio URL instantly on modal open
  useEffect(() => {
    if (!isOpen || !song) return;

    let isMounted = true;

    const resolveAudio = async () => {
      try {
        // 1. Offline storage check
        try {
          const offline = await getOfflineSongById(song.id);
          if (offline && (offline as any).audioBase64) {
            if (isMounted) setResolvedAudioUrl((offline as any).audioBase64);
            return;
          }
          if (offline && offline.url && (offline.url.startsWith('data:') || offline.url.startsWith('blob:'))) {
            if (isMounted) setResolvedAudioUrl(offline.url);
            return;
          }
        } catch {}

        // 2. Direct user upload
        if (song.url && (song.url.startsWith('data:') || song.url.startsWith('blob:') || song.url.startsWith('http'))) {
          if (isMounted) setResolvedAudioUrl(song.url);
          return;
        }

        // 3. Online streaming resolution
        let videoId = extractYoutubeVideoId(song.id) ||
                      extractYoutubeVideoId((song as any).youtubeId) ||
                      extractYoutubeVideoId(song.youtubeUrl) ||
                      extractYoutubeVideoId(song.url);
        if (!videoId) {
          videoId = await findYouTubeVideoId(song.title, song.artist);
        }
        if (videoId) {
          const rawStream = await getAudioStreamUrl(videoId, song.title, song.artist, 'best');
          if (rawStream && isMounted) {
            setResolvedAudioUrl(rawStream);
          }
        }
      } catch (err) {
        console.warn('Audio stream resolution warning:', err);
      }
    };

    resolveAudio();

    return () => {
      isMounted = false;
      stopPreview();
    };
  }, [isOpen, song]);

  const handleTogglePreview = async () => {
    triggerHaptic(ImpactStyle.Light);

    if (isPreviewing) {
      stopPreview();
      return;
    }

    if (!resolvedAudioUrl || !previewAudioRef.current) return;

    try {
      const audio = previewAudioRef.current;
      audio.currentTime = startTime;
      await audio.play();
      setIsPreviewing(true);
    } catch (e) {
      console.warn('Preview play error:', e);
      stopPreview();
    }
  };

  const handleTimeUpdate = () => {
    if (!previewAudioRef.current || !isPreviewing) return;
    const current = previewAudioRef.current.currentTime;
    const targetEnd = startTime + effectiveLength;

    if (current >= targetEnd || current < startTime) {
      stopPreview();
    } else {
      const progress = Math.max(0, Math.min(1, (current - startTime) / effectiveLength));
      setPreviewProgress(progress);
    }
  };

  const handleSetRingtone = async () => {
    if (!song) return;
    triggerHaptic(ImpactStyle.Heavy);
    setIsSetting(true);
    stopPreview();

    try {
      let finalBase64: string | undefined;
      let streamUrlToPass: string | undefined = resolvedAudioUrl;

      // 1. If we have a stream URL, fetch bytes into Base64 for 100% native offline reliability
      if (resolvedAudioUrl) {
        try {
          const resp = await fetch(resolvedAudioUrl);
          const rawBlob = await resp.blob();

          // Try trimming via Web Audio if duration is sliced
          if (durationLength !== 0) {
            try {
              const arrayBuf = await rawBlob.arrayBuffer();
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const decoded = await ctx.decodeAudioData(arrayBuf);

              const sampleRate = decoded.sampleRate;
              const startSample = Math.floor(startTime * sampleRate);
              const numSamples = Math.floor(effectiveLength * sampleRate);
              const actualSamples = Math.min(numSamples, decoded.length - startSample);

              const trimmed = ctx.createBuffer(decoded.numberOfChannels, actualSamples, sampleRate);
              for (let c = 0; c < decoded.numberOfChannels; c++) {
                trimmed.getChannelData(c).set(decoded.getChannelData(c).subarray(startSample, startSample + actualSamples));
              }

              const wavBlob = audioBufferToWav(trimmed);
              finalBase64 = await blobToBase64(wavBlob);
            } catch (trimErr) {
              console.warn('Web Audio trimming fallback to raw blob:', trimErr);
              finalBase64 = await blobToBase64(rawBlob);
            }
          } else {
            finalBase64 = await blobToBase64(rawBlob);
          }
        } catch (fetchErr) {
          console.warn('Fetch blob warning:', fetchErr);
        }
      }

      // If full URL is http/https, ensure streamUrlToPass is formatted
      if (!finalBase64 && streamUrlToPass && !streamUrlToPass.startsWith('http') && !streamUrlToPass.startsWith('data:')) {
        streamUrlToPass = `https://soundwave.lonewolffsd.in${streamUrlToPass}`;
      }

      const res = await Ringtone.setRingtone({
        url: streamUrlToPass,
        base64Data: finalBase64,
        title: song.title,
        artist: song.artist,
        mimeType: finalBase64?.includes('audio/wav') ? 'audio/wav' : 'audio/mpeg'
      });

      if (res?.success) {
        setIsSuccess(true);
        triggerHaptic(ImpactStyle.Heavy);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Failed to set ringtone:', err);
      if (err?.message?.includes('WRITE_SETTINGS_REQUIRED') || err?.code === 'PERMISSION_DENIED') {
        Toast.show({
          text: '⚠️ Please enable "Allow modify system settings" in the opened screen to set your ringtone.',
          duration: 'long'
        });
      } else {
        Toast.show({
          text: `Failed to set ringtone: ${err?.message || 'Unknown error'}`,
          duration: 'short'
        });
      }
    } finally {
      setIsSetting(false);
    }
  };

  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden Native Audio Element for Instant 0s Lag Preview */}
      <audio
        ref={previewAudioRef}
        src={resolvedAudioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onEnded={stopPreview}
        preload="auto"
      />

      <div className="w-full sm:max-w-md bg-zinc-950/95 border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl relative flex flex-col gap-5 overflow-hidden">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${activeTheme.activeBg} border ${activeTheme.activeBorder} flex items-center justify-center ${activeTheme.activeText}`}>
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Set as Ringtone</h3>
              <p className="text-xs text-white/50">Preview & customize ringtone segment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Track Banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0 border border-white/10">
            {song.coverArtBase64 ? (
              <img src={song.coverArtBase64} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <Music size={22} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
            <p className="text-xs text-white/50 truncate">{song.artist}</p>
          </div>
          <div className={`px-2.5 py-1 rounded-full ${activeTheme.pillBg} text-[11px] font-bold shrink-0`}>
            {durationLength === 0 ? 'Full Track' : `${durationLength}s`}
          </div>
        </div>

        {/* Ringtone Duration Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
            <Scissors size={13} className={activeTheme.activeText} />
            Ringtone Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 45, 0].map((len) => (
              <button
                key={len}
                onClick={() => {
                  stopPreview();
                  triggerHaptic(ImpactStyle.Light);
                  setDurationLength(len);
                  if (startTime > Math.max(0, totalSongDuration - (len === 0 ? 15 : len))) {
                    setStartTime(Math.max(0, totalSongDuration - (len === 0 ? 15 : len)));
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  durationLength === len
                    ? `${activeTheme.btnBg} border-transparent shadow-lg shadow-black/40`
                    : 'bg-white/[0.04] text-white/60 border-white/5 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {len === 0 ? 'Full' : `${len}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Start Position Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-white/70">Start Time</span>
            <span className={`${activeTheme.activeText} font-mono font-bold`}>
              {formatTime(startTime)} - {formatTime(Math.min(totalSongDuration, startTime + effectiveLength))}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxStartTime}
            value={startTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setStartTime(val);
              if (previewAudioRef.current && isPreviewing) {
                previewAudioRef.current.currentTime = val;
              }
            }}
            className="w-full h-2 bg-white/10 rounded-full appearance-none outline-none accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/40 font-mono">
            <span>0:00</span>
            <span>{formatTime(totalSongDuration)}</span>
          </div>
        </div>

        {/* Preview Player Bar */}
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${activeTheme.activeBg} border ${activeTheme.activeBorder}`}>
          <button
            onClick={handleTogglePreview}
            disabled={!resolvedAudioUrl}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${
              isPreviewing ? `${activeTheme.btnBg}` : 'bg-white text-black hover:bg-white/90'
            } shrink-0`}
          >
            {isPreviewing ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
              <span>{isPreviewing ? 'Previewing Ringtone...' : 'Tap to Preview'}</span>
              <span className="text-[11px] text-white/50 font-mono">
                {isPreviewing ? `${Math.round(previewProgress * effectiveLength)}s` : `${effectiveLength}s`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${activeTheme.barColor} transition-all duration-75`}
                style={{ width: `${previewProgress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSetRingtone}
            disabled={isSetting || isSuccess}
            className={`flex-[2] py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isSuccess
                ? 'bg-emerald-600 text-white'
                : `${activeTheme.btnBg} shadow-lg shadow-black/40`
            }`}
          >
            {isSetting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Applying Ringtone...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check size={18} />
                <span>Ringtone Applied!</span>
              </>
            ) : (
              <>
                <Smartphone size={18} />
                <span>Set as Ringtone</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RingtoneModal;
