import React, { useRef, useState, useEffect } from 'react'
import { Upload, X, CheckCircle, Music, Image as ImageIcon, User, Plus, AlertCircle, FileText } from 'lucide-react'
import { db } from '../utils/firebase'
import { useAuth } from '../context/AuthContext' 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const CLOUD_NAME = "dhaymyifo"; 
const UPLOAD_PRESET = "ml_default"; 
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac']

interface GlobalSongUploadProps {
  onClose: () => void
}

interface UploadItem {
  id: string
  audioFile: File
  coverFile: File | null
  coverPreview: string | null
  title: string
  artist: string 
  lyrics: string // New Lyrics Field
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
}

const GlobalSongUpload: React.FC<GlobalSongUploadProps> = ({ onClose }) => {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Track which item has the lyrics editor open
  const [openLyricsId, setOpenLyricsId] = useState<string | null>(null);

  useEffect(() => {
    console.log("Current Auth User:", user);
  }, [user]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); 
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string); 
      reader.onerror = e => reject(e)
    })
  }

  const uploadToCloudinary = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('resource_type', 'video') 

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`)
      xhr.upload.onprogress = (e) => onProgress(Math.round((e.loaded / e.total) * 100))
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url)
        else reject(new Error("Cloudinary Failed"))
      }
      xhr.onerror = () => reject(new Error("Network Error"))
      xhr.send(formData)
    })
  }

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newItems: UploadItem[] = selectedFiles
      .filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        return ext && SUPPORTED_AUDIO_FORMATS.includes(ext)
      })
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        audioFile: file, 
        coverFile: null, 
        coverPreview: null,
        title: file.name.replace(/\.[^/.]+$/, ''), 
        artist: '', 
        lyrics: '', // Initialize empty lyrics
        status: 'pending', 
        progress: 0
      }))
    setItems(prev => [...prev, ...newItems])
  }

  const handleUploadAll = async () => {
    const userId = user?.uid || user?.id;

    if (!userId) {
      alert("Error: No active user session. Please log out and log back in.")
      return
    }

    const incomplete = items.filter(i => !i.coverFile || !i.artist.trim() || !i.title.trim())
    if (incomplete.length > 0) {
      alert("All fields (Title, Artist, Cover) are required.")
      return
    }

    setIsUploading(true)
    let successCount = 0

    for (const item of items) {
      if (item.status === 'success') { successCount++; continue; }

      try {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 5 } : i))
        
        const audioUrl = await uploadToCloudinary(item.audioFile, (p) => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: Math.floor(p * 0.9) } : i))
        })

        const coverBase64 = await fileToBase64(item.coverFile!)

        await addDoc(collection(db, 'users', userId, 'uploads'), {
          title: item.title.trim(),
          artist: item.artist.trim(),
          lyrics: item.lyrics, // Save Lyrics with line breaks
          url: audioUrl,
          coverArtBase64: coverBase64,
          addedAt: serverTimestamp(),
          duration: 0 
        })

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', progress: 100 } : i))
        successCount++
      } catch (error) {
        console.error("Upload error:", error)
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', progress: 0 } : i))
      }
    }
    setIsUploading(false)
    if (successCount === items.length) {
        setTimeout(onClose, 800)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Library Sync</h2>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">Upload to Global Collection</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-md transition-colors text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-black/20">
          {!user ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4" />
              <p className="text-zinc-400">Verifying user session...</p>
            </div>
          ) : items.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="h-60 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01] cursor-pointer hover:bg-white/[0.03] hover:border-indigo-500/40 transition-all group"
            >
              <div className="w-16 h-16 bg-indigo-600/5 rounded-lg flex items-center justify-center mb-5 transition-transform">
                <Upload className="text-indigo-500" size={28} />
              </div>
              <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Click to select music</p>
              <p className="text-zinc-500 text-sm mt-2 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Global Library Upload</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 flex flex-col transition-all hover:bg-zinc-900/60">
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="shrink-0 mx-auto md:mx-0">
                    <label className={`w-24 h-24 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed transition-all ${item.coverPreview ? 'border-transparent' : 'border-white/10 hover:border-indigo-500/50 bg-black/40'}`}>
                      {item.coverPreview ? (
                        <img src={item.coverPreview} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <ImageIcon className="text-zinc-600" size={24} />
                          <span className="text-[9px] text-indigo-400 font-black uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Required</span>
                        </div>
                      )}
                      <input type="file" hidden accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0]; 
                        if (f) setItems(prev => prev.map(i => i.id === item.id ? { ...i, coverFile: f, coverPreview: URL.createObjectURL(f) } : i))
                      }} />
                    </label>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-1">
                      <label style={{ fontFamily: 'Space Grotesk, sans-serif' }} className='text-sm hidden md:block'>Music Title</label>
                      <label style={{ fontFamily: 'Space Grotesk, sans-serif' }} className='mx-3 text-sm hidden md:block'>Artist Name</label>
                      <input 
                        type="text" 
                        value={item.title} 
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: e.target.value } : i))} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all" 
                        placeholder="Song Title" 
                      />
                      <input 
                        type="text" 
                        value={item.artist} 
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, artist: e.target.value } : i))} 
                        className="w-full bg-black/50 md:mx-2 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all" 
                        placeholder="Artist" 
                      />
                    </div>

                    {/* Lyrics Toggle Button */}
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={() => setOpenLyricsId(openLyricsId === item.id ? null : item.id)}
                        className={`text-xs flex items-center gap-2 font-bold px-3 py-1.5 rounded-md transition-colors ${item.lyrics ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        <FileText size={14} />
                        {item.lyrics ? 'Edit Lyrics' : 'Add Lyrics'}
                      </button>
                    </div>

                    {/* Progress Bar */}
                    {item.status !== 'pending' && (
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.status === 'error' && <p className="text-xs text-red-500 flex items-center gap-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}><AlertCircle size={12}/> Upload failed</p>}
                  </div>
                  
                  {/* Remove Button */}
                  <div className="flex items-center justify-center">
                    {item.status === 'success' ? (
                      <CheckCircle className="text-emerald-500" size={24} />
                    ) : (
                      <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="p-2.5 text-zinc-600 hover:text-red-400 transition-colors">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lyrics Editor (Collapsible) */}
                {openLyricsId === item.id && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold tracking-wider">Song Lyrics</label>
                    <textarea 
                      value={item.lyrics}
                      onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, lyrics: e.target.value } : i))}
                      placeholder="Paste lyrics here..."
                      className="w-full h-40 bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white/90 focus:outline-none focus:border-indigo-500/50 resize-none font-sans leading-relaxed whitespace-pre-wrap"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-black flex flex-col sm:flex-row gap-4 items-center">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={18} /> Add More
          </button>
          
          <div className="flex-1 flex gap-4 w-full sm:w-auto justify-end">
            <button style={{ fontFamily: 'Space Grotesk, sans-serif' }} onClick={onClose} disabled={isUploading} className="px-4 py-3 text-zinc-200 hover:text-white hover:underline font-bold transition-colors">Cancel</button>
            <button 
              onClick={handleUploadAll} 
              disabled={items.length === 0 || isUploading || !user} 
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-black transition-all uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-indigo-600/10"
            >
              {isUploading ? 'Uploading...' : 'Sync All'}
            </button>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_AUDIO_FORMATS.map(f => `.${f}`).join(',')} onChange={handleAudioSelect} className="hidden" />
    </div>
  )
}

export default GlobalSongUpload