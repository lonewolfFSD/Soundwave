import { registerPlugin, Capacitor } from '@capacitor/core'
import { Toast } from '@capacitor/toast'
import type { Song } from '../context/PlayerContext'
import { extractYoutubeVideoId, findYouTubeVideoId, getAudioStreamUrl } from './ytMusic'
import { getOfflineSongById } from './offlineStorage'

export interface RingtonePluginInterface {
  hasPermission(): Promise<{ hasPermission: boolean }>
  openSettings(): Promise<void>
  setRingtone(options: {
    url?: string
    filePath?: string
    base64Data?: string
    title: string
    artist?: string
  }): Promise<{ success: boolean; uri: string; title: string }>
}

export const Ringtone = registerPlugin<RingtonePluginInterface>('Ringtone')

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export const setSongAsDeviceRingtone = async (song: Song): Promise<boolean> => {
  if (!isNativeAndroid()) {
    await Toast.show({
      text: '📱 Setting ringtones is only available in the Soundwave Android app.',
      duration: 'long'
    })
    return false
  }

  if (!song) return false

  try {
    await Toast.show({
      text: `Setting "${song.title}" as device ringtone...`,
      duration: 'short'
    })

    // 1. Check if cached offline first
    let localBase64: string | undefined
    let streamUrl: string | undefined
    try {
      const offline = await getOfflineSongById(song.id)
      if (offline && (offline as any).audioBase64) {
        localBase64 = (offline as any).audioBase64
      } else if (offline && offline.url && (offline.url.startsWith('data:') || offline.url.startsWith('blob:'))) {
        localBase64 = offline.url
      }
    } catch {}

    // 2. Direct user uploaded tracks
    if (!localBase64 && song.url && (song.url.startsWith('data:') || song.url.startsWith('blob:'))) {
      localBase64 = song.url
    }

    // 3. Remote mp3 / stream URL
    if (!localBase64 && song.url && song.url.startsWith('http') && (song.url.includes('.mp3') || song.url.includes('.m4a') || song.url.includes('firebasestorage') || song.url.includes('cloudinary'))) {
      streamUrl = song.url
    }

    // 4. Online track resolution
    if (!localBase64 && !streamUrl) {
      let videoId = extractYoutubeVideoId(song.id) ||
                    extractYoutubeVideoId((song as any).youtubeId) ||
                    extractYoutubeVideoId(song.youtubeUrl) ||
                    extractYoutubeVideoId(song.url)
      if (!videoId) {
        videoId = await findYouTubeVideoId(song.title, song.artist)
      }
      if (videoId) {
        const rawStream = await getAudioStreamUrl(videoId, song.title, song.artist, 'best')
        if (rawStream) {
          streamUrl = rawStream.startsWith('/') ? `${window.location.origin}${rawStream}` : rawStream
        }
      }
    }

    const res = await Ringtone.setRingtone({
      url: streamUrl,
      base64Data: localBase64,
      title: song.title,
      artist: song.artist
    })

    return !!res?.success
  } catch (err: any) {
    console.error('Failed to set ringtone:', err)
    if (err?.message?.includes('WRITE_SETTINGS_REQUIRED') || err?.code === 'PERMISSION_DENIED') {
      await Toast.show({
        text: '⚠️ Please enable "Allow modify system settings" permission to set ringtones.',
        duration: 'long'
      })
    } else {
      await Toast.show({
        text: `Failed to set ringtone: ${err?.message || 'Unknown error'}`,
        duration: 'short'
      })
    }
    return false
  }
}
