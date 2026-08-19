import React, { useState, useEffect } from 'react'
import { db } from '../utils/firebase'
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ArrowLeft, Edit3, Trash2, Save, X } from 'lucide-react'
import SongList from './SongList' // Assuming this already exists in your project

interface PlaylistWindowProps {
  playlistId: string
  onBack: () => void
}

const PlaylistWindow: React.FC<PlaylistWindowProps> = ({ playlistId, onBack }) => {
  const [playlist, setPlaylist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // 1. Fetch Data Specific to this Playlist ID
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const docRef = doc(db, 'playlists', playlistId)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          const data = snap.data()
          setPlaylist(data)
          setEditName(data.name)
          setEditDesc(data.description || '')
        }
      } catch (error) {
        console.error("Error fetching playlist:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [playlistId])

  // 2. Handle Rename / Update
  const handleSave = async () => {
    try {
      const docRef = doc(db, 'playlists', playlistId)
      await updateDoc(docRef, {
        name: editName,
        description: editDesc
      })
      // Update local state to reflect changes immediately
      setPlaylist({ ...playlist, name: editName, description: editDesc })
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating playlist:", error)
      alert("Failed to save changes.")
    }
  }

  // 3. Handle Delete
  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this playlist?")) {
      try {
        await deleteDoc(doc(db, 'playlists', playlistId))
        onBack() // Close window after delete
      } catch (error) {
        console.error("Error deleting playlist:", error)
      }
    }
  }

  if (loading) return <div className="p-10 text-white">Loading...</div>
  if (!playlist) return <div className="p-10 text-white">Playlist not found.</div>

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-sm overflow-hidden">
      {/* HEADER SECTION */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">

      </div>

      {/* SONGS LIST SECTION */}
      <div className="flex-1 overflow-auto">
        <SongList playlistId={playlistId} />
      </div>
    </div>
  )
}

export default PlaylistWindow