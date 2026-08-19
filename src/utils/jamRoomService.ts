// Listen Together (Jam Rooms) Real-Time Synchronization Service
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore'
import { db } from './firebase'
import type { Song } from '../context/PlayerContext'

export interface JamParticipant {
  uid: string
  displayName: string
  photoURL: string
  isHost: boolean
  joinedAt: number
  lastActive: number
}

export interface JamReaction {
  id: string
  emoji: string
  user: string
  timestamp: number
}

export interface JamChatMessage {
  id: string
  user: string
  avatar: string
  message: string
  timestamp: number
  isSystem?: boolean
}

export interface JamRoom {
  id: string
  code: string
  name: string
  hostUid: string
  hostName: string
  hostAvatar: string
  isPublic: boolean
  openDjMode: boolean // true = anyone can seek/play/pause/queue; false = DJ only
  currentSong: Song | null
  isPlaying: boolean
  position: number // In seconds
  lastUpdatedTimestamp: number // Client/server timestamp for latency compensation
  queue: (Song & { addedBy?: string })[]
  participants: Record<string, JamParticipant>
  reactions: JamReaction[]
  chat: JamChatMessage[]
  createdAt: number
}

/**
 * Generate clean 6-character room code (e.g. "GROOVE", "VIBE77")
 */
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create a new Listen Together Jam Room
 */
export const createJamRoom = async (
  name: string,
  code: string,
  hostUser: { uid: string; displayName?: string; photoURL?: string },
  initialSong: Song | null = null,
  isPublic = true,
  openDjMode = true
): Promise<JamRoom> => {
  const cleanCode = (code || generateRoomCode()).toUpperCase().trim()
  const roomId = `room_${cleanCode}`
  const now = Date.now()

  const hostParticipant: JamParticipant = {
    uid: hostUser.uid,
    displayName: hostUser.displayName || 'Host DJ',
    photoURL: hostUser.photoURL || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(hostUser.displayName || 'Host')}`,
    isHost: true,
    joinedAt: now,
    lastActive: now
  }

  const newRoom: JamRoom = {
    id: roomId,
    code: cleanCode,
    name: name.trim() || `${hostUser.displayName || 'DJ'}'s Jam Room`,
    hostUid: hostUser.uid,
    hostName: hostUser.displayName || 'Host DJ',
    hostAvatar: hostParticipant.photoURL,
    isPublic,
    openDjMode,
    currentSong: initialSong,
    isPlaying: !!initialSong,
    position: 0,
    lastUpdatedTimestamp: now,
    queue: initialSong ? [initialSong] : [],
    participants: {
      [hostUser.uid]: hostParticipant
    },
    reactions: [],
    chat: [
      {
        id: `sys_${now}`,
        user: 'Soundwave Bot',
        avatar: 'https://i.ibb.co/732ZpjB/rounded.png',
        message: `Welcome to "${name}"! Play a track and share room code ${cleanCode} with your friends.`,
        timestamp: now,
        isSystem: true
      }
    ],
    createdAt: now
  }

  const roomRef = doc(db, 'rooms', roomId)
  await setDoc(roomRef, newRoom)
  return newRoom
}

/**
 * Join an existing Jam Room with code
 */
export const joinJamRoom = async (
  code: string,
  user: { uid: string; displayName?: string; photoURL?: string }
): Promise<JamRoom> => {
  const cleanCode = code.toUpperCase().trim()
  const roomId = `room_${cleanCode}`
  const roomRef = doc(db, 'rooms', roomId)
  const snap = await getDoc(roomRef)

  if (!snap.exists()) {
    throw new Error(`Room with code "${cleanCode}" was not found.`)
  }

  const room = snap.data() as JamRoom
  const now = Date.now()

  const participant: JamParticipant = {
    uid: user.uid,
    displayName: user.displayName || 'Listener',
    photoURL: user.photoURL || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(user.displayName || 'User')}`,
    isHost: room.hostUid === user.uid,
    joinedAt: now,
    lastActive: now
  }

  const joinMsg: JamChatMessage = {
    id: `join_${user.uid}_${now}`,
    user: 'Soundwave',
    avatar: participant.photoURL,
    message: `${participant.displayName} joined the Jam!`,
    timestamp: now,
    isSystem: true
  }

  await updateDoc(roomRef, {
    [`participants.${user.uid}`]: participant,
    chat: arrayUnion(joinMsg)
  })

  return {
    ...room,
    participants: {
      ...room.participants,
      [user.uid]: participant
    }
  }
}

/**
 * Leave a Jam Room
 */
export const leaveJamRoom = async (roomId: string, uid: string, displayName?: string) => {
  try {
    const roomRef = doc(db, 'rooms', roomId)
    const snap = await getDoc(roomRef)
    if (!snap.exists()) return

    const room = snap.data() as JamRoom
    const updatedParticipants = { ...room.participants }
    delete updatedParticipants[uid]

    // If room is empty, delete room
    if (Object.keys(updatedParticipants).length === 0) {
      await deleteDoc(roomRef).catch(() => {})
      return
    }

    let newHostUid = room.hostUid
    let newHostName = room.hostName
    let newHostAvatar = room.hostAvatar

    // If host left, promote the next oldest participant
    if (room.hostUid === uid) {
      const remainingUsers = Object.values(updatedParticipants).sort((a, b) => a.joinedAt - b.joinedAt)
      if (remainingUsers.length > 0) {
        newHostUid = remainingUsers[0].uid
        newHostName = remainingUsers[0].displayName
        newHostAvatar = remainingUsers[0].photoURL
        updatedParticipants[newHostUid].isHost = true
      }
    }

    const leaveMsg: JamChatMessage = {
      id: `leave_${uid}_${Date.now()}`,
      user: 'Soundwave',
      avatar: 'https://i.ibb.co/732ZpjB/rounded.png',
      message: `${displayName || 'A participant'} left the Jam.`,
      timestamp: Date.now(),
      isSystem: true
    }

    await updateDoc(roomRef, {
      participants: updatedParticipants,
      hostUid: newHostUid,
      hostName: newHostName,
      hostAvatar: newHostAvatar,
      chat: arrayUnion(leaveMsg)
    }).catch(() => {})
  } catch (e) {
    console.warn('Error leaving room:', e)
  }
}

/**
 * Real-time Subscription to a Jam Room
 */
export const subscribeToJamRoom = (
  roomId: string,
  onUpdate: (room: JamRoom) => void,
  onError?: (err: any) => void
) => {
  const roomRef = doc(db, 'rooms', roomId)
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as JamRoom)
      }
    },
    (err) => {
      if (onError) onError(err)
    }
  )
}

/**
 * Update playback state, position, or current song
 */
export const updateJamPlayback = async (
  roomId: string,
  payload: {
    isPlaying?: boolean
    position?: number
    currentSong?: Song | null
    queue?: Song[]
  }
) => {
  const roomRef = doc(db, 'rooms', roomId)
  const updateData: any = {
    lastUpdatedTimestamp: Date.now()
  }

  if (payload.isPlaying !== undefined) updateData.isPlaying = payload.isPlaying
  if (payload.position !== undefined) updateData.position = payload.position
  if (payload.currentSong !== undefined) updateData.currentSong = payload.currentSong
  if (payload.queue !== undefined) updateData.queue = payload.queue

  await updateDoc(roomRef, updateData).catch(() => {})
}

/**
 * Add a song to the shared Jam Queue
 */
export const addSongToJamQueue = async (
  roomId: string,
  song: Song,
  addedByName?: string
) => {
  const roomRef = doc(db, 'rooms', roomId)
  const snap = await getDoc(roomRef)
  if (!snap.exists()) return

  const room = snap.data() as JamRoom
  const songWithCredit = {
    ...song,
    addedBy: addedByName || 'Listener'
  }

  const updatedQueue = [...(room.queue || []), songWithCredit]
  const updateData: any = { queue: updatedQueue }

  // If no song currently playing, start playing this song
  if (!room.currentSong) {
    updateData.currentSong = songWithCredit
    updateData.isPlaying = true
    updateData.position = 0
    updateData.lastUpdatedTimestamp = Date.now()
  }

  const activityMsg: JamChatMessage = {
    id: `queue_${Date.now()}`,
    user: 'Soundwave',
    avatar: 'https://i.ibb.co/732ZpjB/rounded.png',
    message: `${addedByName || 'Someone'} queued "${song.title}"`,
    timestamp: Date.now(),
    isSystem: true
  }

  updateData.chat = arrayUnion(activityMsg)
  await updateDoc(roomRef, updateData).catch(() => {})
}

/**
 * Remove a song from the shared Jam Queue
 */
export const removeSongFromJamQueue = async (
  roomId: string,
  songIndex: number
) => {
  const roomRef = doc(db, 'rooms', roomId)
  const snap = await getDoc(roomRef)
  if (!snap.exists()) return

  const room = snap.data() as JamRoom
  const updatedQueue = [...(room.queue || [])]
  updatedQueue.splice(songIndex, 1)

  await updateDoc(roomRef, { queue: updatedQueue }).catch(() => {})
}

/**
 * Send real-time emoji reaction burst
 */
export const sendJamReaction = async (
  roomId: string,
  emoji: string,
  userName: string
) => {
  const roomRef = doc(db, 'rooms', roomId)
  const reaction: JamReaction = {
    id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    emoji,
    user: userName,
    timestamp: Date.now()
  }

  // Append reaction and keep only the latest 30 reactions
  const snap = await getDoc(roomRef)
  if (!snap.exists()) return
  const room = snap.data() as JamRoom
  const updatedReactions = [...(room.reactions || []).slice(-29), reaction]

  await updateDoc(roomRef, { reactions: updatedReactions }).catch(() => {})
}

/**
 * Send a chat message in the Jam Room
 */
export const sendJamChatMessage = async (
  roomId: string,
  message: string,
  user: { displayName?: string; photoURL?: string }
) => {
  if (!message || !message.trim()) return
  const roomRef = doc(db, 'rooms', roomId)
  const msg: JamChatMessage = {
    id: `msg_${Date.now()}`,
    user: user.displayName || 'Listener',
    avatar: user.photoURL || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(user.displayName || 'User')}`,
    message: message.trim(),
    timestamp: Date.now()
  }

  await updateDoc(roomRef, {
    chat: arrayUnion(msg)
  }).catch(() => {})
}

/**
 * Toggle Open DJ Mode
 */
export const toggleOpenDjMode = async (roomId: string, openDjMode: boolean) => {
  const roomRef = doc(db, 'rooms', roomId)
  await updateDoc(roomRef, { openDjMode }).catch(() => {})
}

/**
 * Transfer Host DJ Role
 */
export const transferJamHost = async (roomId: string, newHostUid: string) => {
  const roomRef = doc(db, 'rooms', roomId)
  const snap = await getDoc(roomRef)
  if (!snap.exists()) return

  const room = snap.data() as JamRoom
  const updatedParticipants = { ...room.participants }

  if (updatedParticipants[room.hostUid]) {
    updatedParticipants[room.hostUid].isHost = false
  }
  if (updatedParticipants[newHostUid]) {
    updatedParticipants[newHostUid].isHost = true
  }

  await updateDoc(roomRef, {
    hostUid: newHostUid,
    hostName: updatedParticipants[newHostUid]?.displayName || 'New Host',
    hostAvatar: updatedParticipants[newHostUid]?.photoURL || '',
    participants: updatedParticipants
  }).catch(() => {})
}

/**
 * Get Active Public Jam Rooms
 */
export const getActivePublicJamRooms = async (): Promise<JamRoom[]> => {
  try {
    const q = query(collection(db, 'rooms'), where('isPublic', '==', true), limit(12))
    const snap = await getDocs(q)
    const rooms = snap.docs.map(d => d.data() as JamRoom)
    // Filter rooms updated in the last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return rooms.filter(r => r.createdAt > oneDayAgo || (r.lastUpdatedTimestamp && r.lastUpdatedTimestamp > oneDayAgo))
  } catch {
    return []
  }
}
