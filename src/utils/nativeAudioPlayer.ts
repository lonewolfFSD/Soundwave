import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core'

export interface NativeAudioPlayOptions {
  url: string
  title: string
  artist: string
  coverArt?: string
  position?: number
}

export interface NativePlaybackStateData {
  isPlaying: boolean
  playbackState: number
  currentTime: number
  duration: number
}

export interface NativeTimeUpdateData {
  currentTime: number
  duration: number
}

export interface NativeAudioPlayerInterface {
  play(options: NativeAudioPlayOptions): Promise<{ success: boolean }>
  pause(): Promise<{ success: boolean }>
  resume(): Promise<{ success: boolean }>
  seekTo(options: { position: number }): Promise<{ success: boolean }>
  setVolume(options: { volume: number }): Promise<{ success: boolean }>
  getStatus(): Promise<{ isPlaying: boolean; currentTime: number; duration: number }>
  addListener(
    eventName: 'onPlaybackStateChange',
    listenerFunc: (data: NativePlaybackStateData) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'onTimeUpdate',
    listenerFunc: (data: NativeTimeUpdateData) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'onTrackEnded',
    listenerFunc: (data: Record<string, never>) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'onError',
    listenerFunc: (data: { error: string }) => void
  ): Promise<PluginListenerHandle>
}

const NativeAudioPlayer = registerPlugin<NativeAudioPlayerInterface>('NativeAudioPlayer')

export const isNativePlatform = Capacitor.isNativePlatform()

export { NativeAudioPlayer }
