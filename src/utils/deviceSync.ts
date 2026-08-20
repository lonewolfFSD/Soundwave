import {
  collection,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore'
import { db } from './firebase'
import { Capacitor } from '@capacitor/core'
import type { Song } from '../context/PlayerContext'

export type DeviceType = 'computer' | 'smartphone' | 'tablet' | 'speaker'

export interface DeviceInfo {
  deviceId: string
  name: string
  type: DeviceType
  platform: 'web' | 'android' | 'ios' | 'windows' | 'mac' | 'linux'
  lastSeen: number
  isOnline: boolean
}

export interface PlaybackState {
  activeDeviceId: string
  activeDeviceName: string
  currentSong: Song | null
  isPlaying: boolean
  position: number // in seconds
  duration: number
  updatedAt: number // epoch ms for latency compensation
  queue: Song[]
  isShuffle: boolean
  repeatMode: 'none' | 'one' | 'all'
  volume?: number
}

// Generate or retrieve persistent unique device ID
export const getOrCreateDeviceId = (): string => {
  let id = localStorage.getItem('sw_device_id')
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36)
    localStorage.setItem('sw_device_id', id)
  }
  return id
}

// Automatically detect friendly device name and type
export const detectDeviceInfo = (): DeviceInfo => {
  const deviceId = getOrCreateDeviceId()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isNative = Capacitor.isNativePlatform()
  const capPlatform = Capacitor.getPlatform()

  let type: DeviceType = 'computer'
  let name = 'Web Player'
  let platform: DeviceInfo['platform'] = 'web'

  if (isNative) {
    if (capPlatform === 'android') {
      type = 'smartphone'
      platform = 'android'
      name = 'Android · SoundWave App'
    } else if (capPlatform === 'ios') {
      type = 'smartphone'
      platform = 'ios'
      name = 'iPhone · SoundWave App'
    } else {
      type = 'computer'
      platform = 'windows'
      name = 'SoundWave Native App'
    }
  } else {
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isTablet = /iPad|Tablet|PlayBook/i.test(ua) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))

    if (isTablet) {
      type = 'tablet'
      name = /iPad/.test(ua) ? 'iPad · Safari' : 'Tablet Device'
      platform = /iPad/.test(ua) ? 'ios' : 'android'
    } else if (isMobile) {
      type = 'smartphone'
      if (/iPhone/.test(ua)) {
        name = 'iPhone · Safari'
        platform = 'ios'
      } else if (/Android/.test(ua)) {
        name = 'Android · Chrome'
        platform = 'android'
      } else {
        name = 'Mobile Browser'
      }
    } else {
      type = 'computer'
      if (/Windows/i.test(ua)) {
        platform = 'windows'
        name = 'Windows PC · ' + (ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : 'Browser')
      } else if (/Macintosh/i.test(ua)) {
        platform = 'mac'
        name = 'Mac · ' + (ua.includes('Chrome') ? 'Chrome' : 'Safari')
      } else if (/Linux/i.test(ua)) {
        platform = 'linux'
        name = 'Linux PC · Browser'
      } else {
        name = 'Computer · Web'
      }
    }
  }

  // Check if custom device nickname was set in localStorage
  const customNickname = localStorage.getItem('sw_custom_device_name')
  if (customNickname && customNickname.trim()) {
    name = customNickname.trim()
  }

  return {
    deviceId,
    name,
    type,
    platform,
    lastSeen: Date.now(),
    isOnline: true,
  }
}

// Register local device in Firestore
export const registerDevice = async (userId: string): Promise<DeviceInfo> => {
  const info = detectDeviceInfo()
  try {
    const deviceRef = doc(db, 'users', userId, 'devices', info.deviceId)
    await setDoc(deviceRef, {
      ...info,
      lastSeen: Date.now(),
      isOnline: true,
    }, { merge: true })
  } catch (err) {
    console.warn('Failed to register device:', err)
  }
  return info
}

// Update device heartbeat in Firestore
export const updateDeviceHeartbeat = async (userId: string, deviceId: string) => {
  try {
    const deviceRef = doc(db, 'users', userId, 'devices', deviceId)
    await setDoc(deviceRef, {
      lastSeen: Date.now(),
      isOnline: true,
    }, { merge: true })
  } catch (err) {
    // silent heartbeat fail
  }
}

// Mark device offline on signout/window close
export const unregisterDevice = async (userId: string, deviceId: string) => {
  try {
    const deviceRef = doc(db, 'users', userId, 'devices', deviceId)
    await setDoc(deviceRef, {
      isOnline: false,
      lastSeen: Date.now(),
    }, { merge: true })
  } catch (err) {
    // silent
  }
}

// Subscribe to all connected devices for this user
export const subscribeToUserDevices = (
  userId: string,
  onDevicesUpdate: (devices: DeviceInfo[]) => void
) => {
  const devicesCol = collection(db, 'users', userId, 'devices')
  return onSnapshot(devicesCol, (snapshot: any) => {
    const now = Date.now()
    const devices: DeviceInfo[] = []
    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data() as DeviceInfo
      // Filter devices seen in the last 2 minutes
      if (data && data.deviceId && (now - (data.lastSeen || 0) < 120000)) {
        devices.push({
          ...data,
          isOnline: data.isOnline !== false,
        })
      }
    })
    // Sort so most recently seen devices appear first
    devices.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    onDevicesUpdate(devices)
  }, (err: any) => {
    console.warn('Devices subscription error:', err)
  })
}

// Subscribe to real-time playback state in Firestore
export const subscribeToPlaybackState = (
  userId: string,
  onStateUpdate: (state: PlaybackState | null) => void
) => {
  const playbackDoc = doc(db, 'users', userId, 'playback', 'current')
  return onSnapshot(playbackDoc, (snapshot: any) => {
    if (snapshot.exists()) {
      onStateUpdate(snapshot.data() as PlaybackState)
    } else {
      onStateUpdate(null)
    }
  }, (err: any) => {
    console.warn('Playback state subscription error:', err)
  })
}

// Broadcast playback state updates to Firestore
export const syncPlaybackState = async (
  userId: string,
  state: Partial<PlaybackState>
) => {
  try {
    const playbackDoc = doc(db, 'users', userId, 'playback', 'current')
    await setDoc(playbackDoc, {
      ...state,
      updatedAt: Date.now(),
    }, { merge: true })
  } catch (err) {
    console.warn('Failed to sync playback state:', err)
  }
}

// Transfer playback to another device
export const transferPlaybackToTarget = async (
  userId: string,
  targetDeviceId: string,
  targetDeviceName: string,
  currentState: Partial<PlaybackState>
) => {
  try {
    const playbackDoc = doc(db, 'users', userId, 'playback', 'current')
    await setDoc(playbackDoc, {
      ...currentState,
      activeDeviceId: targetDeviceId,
      activeDeviceName: targetDeviceName,
      isPlaying: true,
      updatedAt: Date.now(),
    }, { merge: true })
  } catch (err) {
    console.warn('Failed to transfer playback:', err)
  }
}
