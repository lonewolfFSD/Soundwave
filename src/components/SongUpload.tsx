import React, { useRef, useState, useEffect } from 'react'
import { Upload, X, CheckCircle, Music, Image as ImageIcon, AlertCircle, User, Plus, Library } from 'lucide-react'
import { db } from '../utils/firebase'
import { useAuth } from '../context/AuthContext'
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore'

// --- CONFIGURATION ---
const CLOUD_NAME = "dhaymyifo"; 
const UPLOAD_PRESET = "ml_default"; 
const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50MB
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac']

interface SongUploadProps {
  playlistId: string
  onClose: () => void
}

interface UploadItem {
  id: string
  audioFile: File
  coverFile: File | null
  coverPreview: string | null
  title: string
  artist: string 
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
}

const SongUpload: React.FC<SongUploadProps> = ({ playlistId, onClose }) => {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // States
  const [items, setItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [librarySongs, setLibrarySongs] = useState<any[]>([])
  const [existingSongUrls, setExistingSongUrls] = useState<Set<string>>(new Set())
  const [loadingLibrary, setLoadingLibrary] = useState(true)

  // 1. Fetch Global Library and Current Playlist Tracks
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      setLoadingLibrary(true)
      try {
        // Fetch current playlist songs to avoid duplicates
        const playlistSongsSnap = await getDocs(collection(db, 'playlists', playlistId, 'songs'))
        const existingUrls = new Set(playlistSongsSnap.docs.map(doc => doc.data().url))
        setExistingSongUrls(existingUrls)

        // Fetch global library
        const librarySnap = await getDocs(collection(db, 'users', user.id, 'uploads'))
        const songs = librarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setLibrarySongs(songs)
      } catch (err) {
        console.error("Error fetching library:", err)
      } finally {
        setLoadingLibrary(false)
      }
    }
    fetchData()
  }, [user?.id, playlistId])

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string); reader.onerror = e => reject(e)
    })
  }

  // Helper: Cloudinary Upload
  const uploadToCloudinary = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file); formData.append('upload_preset', UPLOAD_PRESET); formData.append('resource_type', 'video') 
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`)
      xhr.upload.onprogress = (e) => onProgress(Math.round((e.loaded / e.total) * 100))
      xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject()
      xhr.onerror = () => reject(); xhr.send(formData)
    })
  }

  // Logic: Add existing library song to playlist
  const handleAddFromLibrary = async (song: any) => {
    if (existingSongUrls.has(song.url)) return;
    try {
      await addDoc(collection(db, 'playlists', playlistId, 'songs'), {
        ...song,
        addedAt: serverTimestamp()
      })
      
      const playlistRef = doc(db, 'playlists', playlistId)
      const snap = await getDoc(playlistRef)
      if (snap.exists()) {
        await updateDoc(playlistRef, { songCount: (snap.data().songCount || 0) + 1 })
      }
      
      setExistingSongUrls(prev => new Set(prev).add(song.url))
    } catch (err) {
      alert("Failed to add song")
    }
  }

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newItems = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      audioFile: file, coverFile: null, coverPreview: null,
      title: file.name.replace(/\.[^/.]+$/, ''), artist: '', status: 'pending', progress: 0
    }))
    setItems(prev => [...prev, ...newItems])
  }

  const handleUploadAll = async () => {
    const incomplete = items.filter(i => !i.coverFile || !i.artist.trim())
    if (incomplete.length > 0) return alert("Artist and Cover Art required for new uploads.")

    setIsUploading(true)
    for (const item of items) {
      if (item.status === 'success') continue
      try {
        const audioUrl = await uploadToCloudinary(item.audioFile, (p) => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: p } : i))
        })
        const coverBase64 = await fileToBase64(item.coverFile!)

        const songData = {
          title: item.title.trim(),
          artist: item.artist.trim(),
          url: audioUrl,
          coverArtBase64: coverBase64,
          addedAt: serverTimestamp(),
          duration: 0 
        }

        // Add to Playlist
        await addDoc(collection(db, 'playlists', playlistId, 'songs'), songData)
        
        // Add to Global Library too
        await addDoc(collection(db, 'users', user!.id, 'uploads'), songData)

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', progress: 100 } : i))
      } catch (error) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i))
      }
    }
    setIsUploading(false)
    setTimeout(onClose, 800)
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Add Music to Playlist</h2>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Upload new or select from library</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Global Library Section */}
          <div className="w-full border-r border-white/5 flex flex-col bg-black/20">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 text-zinc-400">
              <Library size={16} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Your Global Library</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {loadingLibrary ? (
                <div className="animate-pulse space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
                </div>
              ) : librarySongs.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm italic">Library is empty</div>
              ) : (
                librarySongs.map(song => {
                  const alreadyIn = existingSongUrls.has(song.url);
                  return (
                    <div 
                      key={song.id} 
                      onClick={() => !alreadyIn && handleAddFromLibrary(song)}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${alreadyIn ? 'opacity-30 border-transparent cursor-default' : 'bg-white/5 border-white/5 hover:border-indigo-500/50 cursor-pointer hover:bg-white/10'}`}
                    >
                      <img src={song.coverArtBase64} className="w-12 h-12 rounded-lg object-cover bg-zinc-800" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{song.artist}</p>
                      </div>
                      {alreadyIn ? <CheckCircle size={18} className="text-emerald-500 shrink-0" /> : <Plus size={18} className="text-indigo-400 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Upload Section */}
          
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end">
  <div className="flex items-center gap-6">
    <button 
      onClick={onClose} 
      className="text-zinc-400 hover:text-white font-bold text-sm transition-colors"
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      Cancel
    </button>
    <button 
      onClick={handleUploadAll} 
      disabled={items.length === 0 || isUploading} 
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/10"
    >
      {isUploading ? 'Uploading...' : 'Finish & Sync'}
    </button>
  </div>
</div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_AUDIO_FORMATS.map(f => `.${f}`).join(',')} onChange={handleAudioSelect} className="hidden" />
    </div>
  )
}

export default SongUpload