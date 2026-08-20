import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface NativePlayOptions {
  url: string;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
  position?: number;
}

export interface NativePlayerState {
  isPlaying: boolean;
  position: number;
  duration: number;
}

export interface SoundwaveNativePlayerPlugin {
  play(options: NativePlayOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(options: { position: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  getState(): Promise<NativePlayerState>;

  addListener(
    eventName: 'onPlaybackStateChange',
    listenerFunc: (state: { isPlaying: boolean }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'onPositionUpdate',
    listenerFunc: (state: { position: number; duration: number }) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'onTrackEnd',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'onPlaybackError',
    listenerFunc: (error: { error: string }) => void
  ): Promise<PluginListenerHandle>;
}

const NativePlayerBridge = registerPlugin<SoundwaveNativePlayerPlugin>('SoundwaveNativePlayer');

export const isNativeAudioSupported = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const nativePlayer = {
  async play(options: NativePlayOptions): Promise<boolean> {
    if (!isNativeAudioSupported()) return false;
    try {
      await NativePlayerBridge.play(options);
      return true;
    } catch (e) {
      console.warn('[NativePlayer] play error:', e);
      return false;
    }
  },

  async pause(): Promise<void> {
    if (!isNativeAudioSupported()) return;
    try {
      await NativePlayerBridge.pause();
    } catch (e) {
      console.warn('[NativePlayer] pause error:', e);
    }
  },

  async resume(): Promise<void> {
    if (!isNativeAudioSupported()) return;
    try {
      await NativePlayerBridge.resume();
    } catch (e) {
      console.warn('[NativePlayer] resume error:', e);
    }
  },

  async seek(position: number): Promise<void> {
    if (!isNativeAudioSupported()) return;
    try {
      await NativePlayerBridge.seek({ position });
    } catch (e) {
      console.warn('[NativePlayer] seek error:', e);
    }
  },

  async setVolume(volume: number): Promise<void> {
    if (!isNativeAudioSupported()) return;
    try {
      await NativePlayerBridge.setVolume({ volume });
    } catch (e) {
      console.warn('[NativePlayer] setVolume error:', e);
    }
  },

  async getState(): Promise<NativePlayerState | null> {
    if (!isNativeAudioSupported()) return null;
    try {
      return await NativePlayerBridge.getState();
    } catch (e) {
      return null;
    }
  },

  onPlaybackStateChange(callback: (isPlaying: boolean) => void): Promise<PluginListenerHandle> | null {
    if (!isNativeAudioSupported()) return null;
    return NativePlayerBridge.addListener('onPlaybackStateChange', (data) => callback(data.isPlaying));
  },

  onPositionUpdate(callback: (pos: number, dur: number) => void): Promise<PluginListenerHandle> | null {
    if (!isNativeAudioSupported()) return null;
    return NativePlayerBridge.addListener('onPositionUpdate', (data) => callback(data.position, data.duration));
  },

  onTrackEnd(callback: () => void): Promise<PluginListenerHandle> | null {
    if (!isNativeAudioSupported()) return null;
    return NativePlayerBridge.addListener('onTrackEnd', callback);
  }
};
