import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { db } from '../utils/firebase'
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  where,
  getDocs
} from 'firebase/firestore'
import { 
  Play, 
  Pause,
  Music, 
  MoreHorizontal, 
  Trash2, 
  Plus, 
  Download,
  XCircle,
  Edit3,
  Loader2
} from 'lucide-react'
import type { Song } from '../context/PlayerContext'

import SongUpload from './SongUpload'

interface SongListProps {
  playlistId: string | null
}

interface PlaylistData {
  name: string
  description?: string
  coverArtBase64?: string | null
  userId?: string
}

const SongList: React.FC<SongListProps> = ({ playlistId }) => {
  const { user } = useAuth()
  const { playSong, pauseSong, setQueue, currentSong, isPlaying } = usePlayer()
  
  const [songs, setSongs] = useState<Song[]>([])
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false) // Loading state for delete actions

  const [isEditing, setIsEditing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  const [activeSongMenu, setActiveSongMenu] = useState<string | null>(null);
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)
  const songMenuRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Data
  useEffect(() => {
    if (!playlistId || !user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch Playlist Info
    const fetchPlaylistDetails = async () => {
      try {
        const docRef = doc(db, 'playlists', playlistId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data() as PlaylistData
          setPlaylist(data)
          setEditName(data.name)
          setEditDesc(data.description || '')
        }
      } catch (err) { console.error(err) }
    }

    // Fetch Songs
    const songsCollection = collection(db, 'playlists', playlistId, 'songs')
    const q = query(songsCollection, orderBy('addedAt', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Song[]

      fetchPlaylistDetails().then(() => {
        setSongs(songsData)
        setLoading(false)
      })
    })

    return () => unsubscribe()
  }, [playlistId, user?.id])

  // --- ACTIONS ---

  const handleSavePlaylist = async () => {
    if (!playlistId) return
    try {
      const docRef = doc(db, 'playlists', playlistId)
      await updateDoc(docRef, { name: editName, description: editDesc })
      setPlaylist(prev => prev ? { ...prev, name: editName, description: editDesc } : null)
      setIsEditing(false)
    } catch (err) { alert("Failed to update playlist") }
  }

  const handleDeletePlaylist = async () => {
    if (!playlistId) return
    if (window.confirm("Are you sure you want to delete this ENTIRE playlist?")) {
      try {
        await deleteDoc(doc(db, 'playlists', playlistId))
        window.location.reload() 
      } catch (err) { alert("Failed to delete playlist") }
    }
  }

  const handleDownload = async (song: Song) => {
    try {
      const response = await fetch(song.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { alert("Failed to download song") }
  };

  // --- ROBUST REMOVE FROM PLAYLIST ---
  const handleRemoveFromPlaylist = async (songId: string) => {
    if (!playlistId) return
    if (!window.confirm("Remove this song from the playlist?")) return;

    try {
      setProcessing(true);
      // 1. Delete the specific document in this playlist
      await deleteDoc(doc(db, 'playlists', playlistId, 'songs', songId))
      
      // 2. Update the song count
      const playlistRef = doc(db, 'playlists', playlistId)
      const snap = await getDoc(playlistRef)
      if (snap.exists()) {
        const currentCount = snap.data().songCount || 0
        if (currentCount > 0) {
          await updateDoc(playlistRef, { songCount: currentCount - 1 })
        }
      }
      setProcessing(false);
    } catch (err) { 
      console.error("Error deleting song:", err);
      alert("Error removing song. Check console.");
      setProcessing(false);
    }
  }

  // --- ROBUST DELETE EVERYWHERE (By URL) ---
  const handleDeleteEverywhere = async (song: Song) => {
    if (!user?.id) return;
    if (!window.confirm(`PERMANENTLY delete "${song.title}" from your library and ALL playlists?`)) return;

    try {
      setProcessing(true);
      
      // 1. Find and delete from GLOBAL uploads (Query by URL to be safe)
      const uploadsRef = collection(db, 'users', user.id, 'uploads');
      const qUploads = query(uploadsRef, where('url', '==', song.url));
      const uploadsSnap = await getDocs(qUploads);
      
      const uploadDeletePromises = uploadsSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(uploadDeletePromises);

      // 2. Find and delete from ALL PLAYLISTS (Query by URL)
      // Note: We first find all playlists, then query songs inside them. 
      // Firestore collection group queries would be better, but requires an index. 
      // This loop method is safer without index configuration.
      const playlistsRef = collection(db, 'playlists');
      const qPlaylists = query(playlistsRef, where('userId', '==', user.id));
      const playlistsSnap = await getDocs(qPlaylists);

      const playlistDeletePromises = playlistsSnap.docs.map(async (pDoc) => {
         const songsSubRef = collection(db, 'playlists', pDoc.id, 'songs');
         const qSongs = query(songsSubRef, where('url', '==', song.url));
         const songsSnap = await getDocs(qSongs);
         
         const deletes = songsSnap.docs.map(sDoc => deleteDoc(sDoc.ref));
         return Promise.all(deletes);
      });

      await Promise.all(playlistDeletePromises);
      
      setProcessing(false);
      alert("Song deleted everywhere.");
    } catch (err) { 
      console.error(err);
      alert("Failed to delete everywhere. Check console.");
      setProcessing(false);
    }
  };

  const handleRowClick = (song: Song) => {
    if (currentSong?.id === song.id) {
        if (isPlaying) pauseSong()
        else playSong(song)
    } else {
        setQueue(songs);
        playSong(song)
    }
  }

  // Click Outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (songMenuRef.current && !songMenuRef.current.contains(event.target as Node)) {
        setActiveSongMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) return <div className="p-10 text-white animate-pulse" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Loading...</div>
  if (!playlist) return <div className="p-10 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Playlist not found</div>

  return (
    <div className="relative flex flex-col h-full overflow-y-auto bg-black scrollbar-hide">
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0; 
        }
      `}</style>

      {/* Global Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl flex flex-col items-center gap-4 border border-white/10 shadow-2xl">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <span className="text-white font-bold animate-pulse">Processing...</span>
          </div>
        </div>
      )}

      {playlist.coverArtBase64 && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none animate-enter"
          style={{
            backgroundImage: `url(${playlist.coverArtBase64})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) brightness(0.35)',
            transform: 'scale(1.2)',
            animationDelay: '0ms'
          }}
        />
      )}

      <div className="relative z-10 flex flex-col min-h-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-8 pb-6 bg-black/20 animate-enter" style={{ animationDelay: '100ms' }}>
          <div className="relative group shrink-0 shadow-2xl">
            <div className="w-48 h-48 md:w-60 md:h-60 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center ">
              {playlist.coverArtBase64 ? (
                <img src={playlist.coverArtBase64} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <Music className="w-24 h-24 text-zinc-600" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center md:text-left flex-1 min-w-0 w-full">
            <span className="uppercase tracking-widest text-xs font-bold text-white/80">Playlist</span>
            {isEditing ? (
              <div className="w-full max-w-lg space-y-3 bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <input 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-xl font-bold text-white focus:outline-none"
                  placeholder="Playlist Name"
                  autoFocus
                />
                <textarea 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  className="w-full bg-white/10 border border-white/20 text-base rounded-lg px-4 py-2 text-white/90 focus:outline-none resize-none h-20"
                  placeholder="Description"
                />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10">Cancel</button>
                  <button onClick={handleSavePlaylist} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="px-4 py-2 bg-indigo-600 rounded-md text-sm font-bold flex items-center gap-2"> Save Details</button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-lg">
                  {playlist.name}
                </h1>
                <p style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-white/70 text-base font-medium max-w-2xl line-clamp-2 mb-4 drop-shadow-md">
                  {playlist.description || "No description provided."}
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-white/80 font-medium">
                  <span className="font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{user?.displayName}</span>
                  <span className="w-1 h-1 bg-white/60 rounded-full"></span>
                  <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{songs.length} songs</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="px-8 py-5 flex items-center justify-between sticky top-0 bg-black/40 backdrop-blur-xl z-30 border-b border-white/5 animate-enter" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => songs.length > 0 && handleRowClick(songs[0])}
              disabled={songs.length === 0}
              className="w-14 h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:scale-105 transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying && songs.some(s => s.id === currentSong?.id) ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
            </button>

            <button 
              onClick={() => setShowUploadModal(true)}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/20 hover:border-white text-sm font-bold text-gray-300 hover:text-white transition uppercase tracking-wider"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Plus size={18} /> Add Songs
            </button>

            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-white transition p-2">
                <MoreHorizontal className="w-8 h-8" />
              </button>
              {showMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 rounded-lg shadow-2xl border border-white/5 overflow-hidden z-[100]">
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3">
                    <Edit3 size={16} /> Edit Details
                  </button>
                  <button onClick={handleDeletePlaylist} style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 flex items-center gap-3 border-t border-white/5">
                    <Trash2 size={16} /> Delete Playlist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SONGS TABLE */}
        <div className="flex-1 px-4 md:px-8 pb-32 animate-enter" style={{ animationDelay: '300ms' }}>
          {songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-70">
              <Music className="w-16 h-16 text-gray-600 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Your playlist is empty</h3>
              <button onClick={() => setShowUploadModal(true)} className="mt-6 px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition">Add Songs</button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse mt-4">
              <thead className="text-gray-400 text-xs uppercase border-b border-white/10 sticky top-[89px] bg-black/0 z-20">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Title</th>
                  <th className="px-4 py-3 hidden md:table-cell" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Artist</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song, index) => {
                  const isCurrent = currentSong?.id === song.id;
                  const isMenuOpen = activeSongMenu === song.id;
                  const delay = 350 + (index * 30) + 'ms'; 
                  
                  return (
                    <tr 
                      key={song.id} 
                      style={{ fontFamily: 'Space Grotesk, sans-serif', animationDelay: delay }}
                      className={`
                        group hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 animate-enter
                        ${isCurrent ? 'bg-white/10' : 'bg-transparent'}
                      `}
                      onClick={() => handleRowClick(song)}
                    >
                      <td className="px-4 py-3 text-sm text-center w-12">
                        <span className={`font-medium ${isCurrent ? 'text-green-500' : 'text-gray-400'}`}>
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <div className="relative w-10 h-10 md:w-12 md:h-12 shrink-0 group/cover overflow-hidden bg-zinc-800 shadow-sm rounded-md">
                              {song.coverArtBase64 ? (
                                  <img src={song.coverArtBase64} className="w-full h-full object-cover" alt="" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                      <Music size={16} className="text-zinc-600" />
                                  </div>
                              )}
                              <div 
                                  className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity
                                      ${isCurrent ? 'opacity-100' : 'opacity-0 md:group-hover/cover:opacity-100'}
                                  `}
                              >
                                  {isCurrent && isPlaying ? <Pause size={20} className="text-white fill-white" /> : <Play size={20} className="text-white fill-white ml-0.5" />}
                              </div>
                          </div>
                          <div className="flex flex-col">
                              <span style={{ fontFamily: 'Space Grotesk, sans-serif' }} className={`font-medium text-base truncate max-w-[200px] md:max-w-md ${isCurrent ? 'text-green-500' : 'text-white'}`}>
                                  {song.title}
                              </span>
                              <span className="text-xs text-gray-400 md:hidden">{song.artist || 'Unknown'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell hover:text-white transition-colors">
                          {song.artist || 'Unknown Artist'}
                      </td>

                      <td className="px-4 py-3 text-right relative">
                          <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveSongMenu(isMenuOpen ? null : song.id); 
                              }}
                              className={`
                                p-2 rounded-full transition-all
                                ${isMenuOpen ? 'text-white bg-white/10' : 'text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100'}
                              `}
                          >
                              <MoreHorizontal size={20} />
                          </button>

                          {isMenuOpen && (
                            <div 
                              ref={songMenuRef}
                              className="absolute right-10 top-0 mr-2 w-56 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-[100] py-1 overflow-hidden animate-enter"
                              style={{ animationDelay: '0ms' }}
                              onClick={(e) => e.stopPropagation()} 
                            >
                              <button 
                                onClick={() => { handleDownload(song); setActiveSongMenu(null); }}
                                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-indigo-600 flex items-center gap-3 transition-colors"
                              >
                                <Download size={16} /> Download
                              </button>
                              
                              <button 
                                onClick={() => { handleRemoveFromPlaylist(song.id); setActiveSongMenu(null); }}
                                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5"
                              >
                                <XCircle size={16} /> Remove from Playlist
                              </button>
                              
                              <button 
                                onClick={() => { handleDeleteEverywhere(song); setActiveSongMenu(null); }}
                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-3 transition-colors border-t border-white/5"
                              >
                                <Trash2 size={16} /> Delete Everywhere
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUploadModal && playlistId && (
        <SongUpload playlistId={playlistId} onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  )
}

export default SongList