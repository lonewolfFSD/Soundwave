import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Play, Pause, X, Loader2, Check, Scissors, Volume2, Sparkles, Smartphone } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
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
      const res = reader.result as string;
      resolve(res);
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
  const [durationLength, setDurationLength] = useState<number>(30); // 15, 30, 45, or full
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isSetting, setIsSetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const previewTimerRef = useRef<any>(null);

  const totalSongDuration = song?.duration && song.duration > 0 ? song.duration : 180;
  const effectiveLength = durationLength === 0 ? Math.max(15, totalSongDuration - startTime) : durationLength;
  const maxStartTime = Math.max(0, totalSongDuration - (durationLength === 0 ? 15 : durationLength));

  // Clean up playback on unmount or close
  const stopPreview = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setIsPreviewing(false);
    setPreviewProgress(0);
  };

  useEffect(() => {
    if (!isOpen) {
      stopPreview();
      setIsSuccess(false);
      setIsSetting(false);
      setAudioBuffer(null);
    }
  }, [isOpen]);

  // Load and decode audio data for preview & trimming
  useEffect(() => {
    if (!isOpen || !song) return;

    let isMounted = true;
    setIsLoadingAudio(true);

    const loadAudio = async () => {
      try {
        let arrayBuffer: ArrayBuffer | null = null;

        // 1. Offline storage check
        try {
          const offline = await getOfflineSongById(song.id);
          if (offline && (offline as any).audioBase64) {
            const base64 = (offline as any).audioBase64.replace(/^data:audio\/\w+;base64,/, '');
            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            arrayBuffer = bytes.buffer;
          }
        } catch {}

        // 2. Direct user upload
        if (!arrayBuffer && song.url && (song.url.startsWith('data:') || song.url.startsWith('blob:'))) {
          const resp = await fetch(song.url);
          arrayBuffer = await resp.arrayBuffer();
        }

        // 3. Online stream / YouTube stream endpoint
        if (!arrayBuffer) {
          let videoId = extractYoutubeVideoId(song.id) ||
                        extractYoutubeVideoId((song as any).youtubeId) ||
                        extractYoutubeVideoId(song.youtubeUrl) ||
                        extractYoutubeVideoId(song.url);
          if (!videoId) {
            videoId = await findYouTubeVideoId(song.title, song.artist);
          }
          if (videoId) {
            const rawUrl = await getAudioStreamUrl(videoId, song.title, song.artist, 'best');
            if (rawUrl) {
              const resp = await fetch(rawUrl);
              arrayBuffer = await resp.arrayBuffer();
            }
          }
        }

        if (arrayBuffer && isMounted) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = ctx;
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          if (isMounted) {
            setAudioBuffer(decoded);
          }
        }
      } catch (err) {
        console.warn('Failed to decode audio buffer in browser for preview:', err);
      } finally {
        if (isMounted) setIsLoadingAudio(false);
      }
    };

    loadAudio();

    return () => {
      isMounted = false;
      stopPreview();
    };
  }, [isOpen, song]);

  const handleTogglePreview = () => {
    if (isPreviewing) {
      stopPreview();
      return;
    }

    if (!audioBuffer) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      const offset = Math.min(startTime, audioBuffer.duration - 1);
      const playDur = durationLength === 0 ? audioBuffer.duration - offset : Math.min(durationLength, audioBuffer.duration - offset);

      source.start(0, offset, playDur);
      sourceNodeRef.current = source;
      setIsPreviewing(true);

      const startTimestamp = Date.now();
      previewTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimestamp) / 1000;
        if (elapsed >= playDur) {
          stopPreview();
        } else {
          setPreviewProgress(elapsed / playDur);
        }
      }, 50);

      source.onended = () => {
        stopPreview();
      };
    } catch (e) {
      console.warn('Preview playback failed:', e);
      stopPreview();
    }
  };

  const handleSetRingtone = async () => {
    if (!song) return;
    try {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    } catch {}

    setIsSetting(true);
    stopPreview();

    try {
      let finalBase64: string | undefined;

      // Slice audioBuffer into exact trimmed WAV if loaded
      if (audioBuffer) {
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const numSamples = Math.floor(effectiveLength * sampleRate);
        const actualSamples = Math.min(numSamples, audioBuffer.length - startSample);

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const trimmedBuffer = ctx.createBuffer(
          audioBuffer.numberOfChannels,
          actualSamples,
          sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel);
          const targetData = trimmedBuffer.getChannelData(channel);
          for (let i = 0; i < actualSamples; i++) {
            targetData[i] = sourceData[startSample + i];
          }
        }

        const wavBlob = audioBufferToWav(trimmedBuffer);
        finalBase64 = await blobToBase64(wavBlob);
      }

      const res = await Ringtone.setRingtone({
        base64Data: finalBase64,
        title: `${song.title} (${durationLength === 0 ? 'Full' : `${durationLength}s`})`,
        artist: song.artist,
        mimeType: 'audio/wav'
      });

      if (res?.success) {
        setIsSuccess(true);
        try {
          Haptics.notification({ type: 'SUCCESS' as any }).catch(() => {});
        } catch {}
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err: any) {
      console.error('Set ringtone error:', err);
      if (err?.message?.includes('WRITE_SETTINGS_REQUIRED') || err?.code === 'PERMISSION_DENIED') {
        Toast.show({
          text: '⚠️ Please toggle "Allow modify system settings" in the opened screen to set your ringtone.',
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Set as Ringtone</h3>
              <p className="text-xs text-white/50">Preview & choose segment length</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Track preview banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0 border border-white/10">
            {song.coverArtBase64 ? (
              <img src={song.coverArtBase64} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <Volume2 size={22} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
            <p className="text-xs text-white/50 truncate">{song.artist}</p>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold shrink-0">
            {durationLength === 0 ? 'Full' : `${durationLength}s`}
          </div>
        </div>

        {/* Ringtone Length Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
            <Scissors size={13} className="text-indigo-400" />
            Ringtone Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 45, 0].map((len) => (
              <button
                key={len}
                onClick={() => {
                  stopPreview();
                  setDurationLength(len);
                  if (startTime > Math.max(0, totalSongDuration - (len === 0 ? 15 : len))) {
                    setStartTime(Math.max(0, totalSongDuration - (len === 0 ? 15 : len)));
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  durationLength === len
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                    : 'bg-white/[0.04] text-white/60 border-white/5 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {len === 0 ? 'Full' : `${len}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Start Offset Scrubber */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-white/70">Start Segment</span>
            <span className="text-indigo-400 font-mono font-bold">
              {formatTime(startTime)} - {formatTime(Math.min(totalSongDuration, startTime + effectiveLength))}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxStartTime}
            value={startTime}
            onChange={(e) => {
              stopPreview();
              setStartTime(Number(e.target.value));
            }}
            className="w-full h-2 bg-white/10 rounded-full appearance-none outline-none accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/40 font-mono">
            <span>0:00</span>
            <span>{formatTime(totalSongDuration)}</span>
          </div>
        </div>

        {/* Live Preview Button */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
          <button
            onClick={handleTogglePreview}
            disabled={isLoadingAudio}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${
              isPreviewing ? 'bg-indigo-600 text-white' : 'bg-white text-black hover:bg-white/90'
            } shrink-0`}
          >
            {isLoadingAudio ? (
              <Loader2 size={20} className="animate-spin text-black" />
            ) : isPreviewing ? (
              <Pause size={20} />
            ) : (
              <Play size={20} className="translate-x-0.5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
              <span>{isPreviewing ? 'Playing Preview...' : 'Preview Segment'}</span>
              <span className="text-[11px] text-white/50">
                {isLoadingAudio ? 'Loading...' : isPreviewing ? `${Math.round(previewProgress * effectiveLength)}s` : `${effectiveLength}s`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-75"
                style={{ width: `${previewProgress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Confirmation Buttons */}
        <div className="flex items-center gap-3 pt-2">
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
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30'
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
