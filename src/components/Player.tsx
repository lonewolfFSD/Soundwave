import React, { useRef, useEffect, useState, useMemo } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Volume1,
  VolumeX,
  Music,
  Repeat,
  Shuffle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Mic2,
  X // Added X icon for closing sidebar
} from 'lucide-react'

// --- HELPER: Parse LRC Lyrics ---
const parseLyrics = (lyrics: string) => {
  if (!lyrics) return [];
  const lines = lyrics.split('\n');
  const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  
  const parsed = lines.map((line, index) => {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();
      return { time, text, index };
    }
    return { time: -1, text: line.trim(), index };
  }).filter(line => line.text !== '');

  return parsed;
};

const Player: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    pauseSong,
    resumeSong,
    previousSong,
    nextSong,
    setCurrentTime,
    setVolume,
    isShuffle, 
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    queue,
    playSong 
  } = usePlayer()

  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null); 
  
  const [playedHistory, setPlayedHistory] = useState<any[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  // --- NEW: Desktop Lyrics State ---
  const [isDesktopLyricsOpen, setIsDesktopLyricsOpen] = useState(false);

  // --- LYRICS LOGIC ---
  const parsedLyrics = useMemo(() => {
    return currentSong?.lyrics ? parseLyrics(currentSong.lyrics) : [];
  }, [currentSong]);

  const activeLineIndex = useMemo(() => {
    if (parsedLyrics.length === 0 || parsedLyrics[0].time === -1) return -1;
    const index = parsedLyrics.findIndex((line, i) => {
      const nextLine = parsedLyrics[i + 1];
      return line.time <= currentTime && (!nextLine || nextLine.time > currentTime);
    });
    return index;
  }, [currentTime, parsedLyrics]);

  // Auto-scroll logic (Updated to handle both views)
  useEffect(() => {
    if ((showLyrics || isDesktopLyricsOpen) && activeLineIndex !== -1 && lyricsContainerRef.current) {
      const activeElement = document.getElementById(`lyric-line-${activeLineIndex}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex, showLyrics, isDesktopLyricsOpen]);

  if (!currentSong) return null

  // --- PLAYER LOGIC ---
  const currentIndex = queue.findIndex(s => s.id === currentSong.id);
  const hasNext = isShuffle || currentIndex < queue.length - 1 || repeatMode !== 'none';
  const hasPrev = playedHistory.length > 0 || currentIndex > 0;

  const handleNext = () => {
    if (!hasNext) return;
    setPlayedHistory(prev => [...prev, currentSong]);
    if (isShuffle) {
      const otherSongs = queue.filter(s => s.id !== currentSong.id);
      const randomSong = otherSongs[Math.floor(Math.random() * otherSongs.length)] || currentSong;
      playSong(randomSong);
    } else if (currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      playSong(queue[0]);
    }
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      setCurrentTime(0);
      return;
    }
    if (playedHistory.length > 0) {
      const lastSong = playedHistory[playedHistory.length - 1];
      setPlayedHistory(prev => prev.slice(0, -1));
      playSong(lastSong);
    } else if (currentIndex > 0) {
      playSong(queue[currentIndex - 1]);
    }
  };

  // --- PiP Logic ---
  const updateCanvas = async () => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = 640; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (currentSong.coverArtBase64) {
      const img = new Image();
      img.src = currentSong.coverArtBase64;
      await new Promise((res) => (img.onload = res));
      ctx.drawImage(img, 0, 0, 640, 640);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 480, 640, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(currentSong.title, 30, 540);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '24px sans-serif';
    ctx.fillText(currentSong.artist || 'Unknown Artist', 30, 580);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Monospace';
    ctx.fillText(`${formatTime(currentTime)} / ${formatTime(duration)}`, 30, 620);
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); } 
      else {
        await updateCanvas();
        if (hiddenVideoRef.current && canvasRef.current) {
          const stream = canvasRef.current.captureStream(10); 
          hiddenVideoRef.current.srcObject = stream;
          await hiddenVideoRef.current.play();
          await hiddenVideoRef.current.requestPictureInPicture();
        }
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (currentTime >= duration && duration > 0) {
      if (repeatMode === 'one') { setCurrentTime(0); resumeSong(); } 
      else { handleNext(); }
    }
  }, [currentTime, duration]);

  useEffect(() => { if (document.pictureInPictureElement) updateCanvas(); }, [currentTime]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0

  return (
    <>
      {/* --- NEW: DESKTOP LYRICS SIDEBAR --- */}
      <div 
        className={`
          hidden md:flex fixed top-0 right-0 bottom-24 w-96 bg-black/95 border-l border-white/10 z-40 flex-col
          transition-transform duration-300 ease-in-out shadow-2xl backdrop-blur-xl
          ${isDesktopLyricsOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="py-3 px-6 mt-[70px] border-b border-white/10 flex items-center justify-between" >
          <h3 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Lyrics</h3>
          <button onClick={() => setIsDesktopLyricsOpen(false)} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div 
          ref={isDesktopLyricsOpen ? lyricsContainerRef : null}
          className="flex-1 overflow-y-auto scrollbar-hide p-6 text-center mask-image-gradient"
        >
          {parsedLyrics.length > 0 ? (
            parsedLyrics[0].time !== -1 ? (
              <div className="space-y-6">
                {parsedLyrics.map((line, i) => (
                  <p 
                    key={i} 
                    id={`lyric-line-${i}`}
                    className={`
                      text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer
                      ${i === activeLineIndex ? 'text-white scale-105 opacity-100' : 'text-white/40 scale-100 hover:text-white/60'}
                    `}
                    onClick={() => { if (line.time !== -1) setCurrentTime(line.time); }}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-lg text-left font-bold text-white/90 leading-relaxed whitespace-pre-wrap font-sans">
                {currentSong.lyrics}
              </p>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <Mic2 size={40} className="opacity-30" />
              <p className="text-sm font-medium">Lyrics not available</p>
            </div>
          )}
          <div className="h-[20vh]"></div>
        </div>
      </div>

      {/* --- MOBILE FULL SCREEN PLAYER --- */}
      <div className={`
        fixed inset-0 z-[60] bg-black flex flex-col
        transition-transform duration-300 ease-in-out md:hidden
        ${isFullScreen ? 'translate-y-0' : 'translate-y-full'}
      `}>
        
        {/* Background Blur */}
        {currentSong.coverArtBase64 && (
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <img src={currentSong.coverArtBase64} className="w-full h-full object-cover blur-3xl" alt="" />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-6 pb-12">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <button onClick={() => setIsFullScreen(false)} className="text-white hover:text-gray-300 p-2">
              <ChevronDown size={32} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-widest font-bold text-gray-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {showLyrics ? 'Lyrics' : 'Now Playing'}
              </span>
            </div>
            
            {/* Lyrics Toggle Button */}
            <button 
              onClick={() => setShowLyrics(!showLyrics)} 
              className={`p-2 rounded-full transition-all ${showLyrics ? 'text-indigo-400 bg-white/10' : 'text-white hover:bg-white/10'}`}
            >
              <Mic2 size={24} fill={showLyrics ? "currentColor" : "none"} />
            </button>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex items-center justify-center mb-8 overflow-hidden relative">
            
            {showLyrics ? (
              // --- SCROLLING LYRICS VIEW ---
              <div 
                ref={isFullScreen ? lyricsContainerRef : null}
                className="w-full h-full overflow-y-auto scrollbar-hide text-center px-4 py-8 mask-image-gradient"
              >
                {parsedLyrics.length > 0 ? (
                  parsedLyrics[0].time !== -1 ? (
                    // SYNCHRONIZED LYRICS
                    <div className="space-y-6">
                      {parsedLyrics.map((line, i) => (
                        <p 
                          key={i} 
                          id={`lyric-line-${i}`}
                          className={`
                            text-xl md:text-2xl font-bold transition-all duration-300 ease-in-out cursor-pointer
                            ${i === activeLineIndex ? 'text-white scale-105 opacity-100' : 'text-white/40 scale-100 blur-[1px]'}
                          `}
                          onClick={() => {
                            if (line.time !== -1) setCurrentTime(line.time);
                          }}
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    // STATIC LYRICS (Fallback)
                    <p className="text-xl text-left font-bold text-white/90 leading-relaxed whitespace-pre-wrap font-sans" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {currentSong.lyrics}
                    </p>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                    <Mic2 size={48} className="opacity-50" />
                    <p className="text-lg font-medium">Lyrics not available</p>
                  </div>
                )}
                <div className="h-[50vh]"></div>
              </div>
            ) : (
              // --- COVER ART VIEW ---
              <div className="w-full aspect-square max-w-sm bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-300">
                {currentSong.coverArtBase64 ? (
                  <img src={currentSong.coverArtBase64} alt={currentSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music size={80} className="text-zinc-700" /></div>
                )}
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="mb-8 px-2 shrink-0">
            <h2 className="text-2xl font-black text-white mb-2 line-clamp-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {currentSong.title}
            </h2>
            <p className="text-base text-gray-400 line-clamp-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {currentSong.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 px-2 shrink-0">
            <div className="w-full h-1.5 bg-white/20 rounded-full mb-2 relative group">
              <div 
                className="absolute h-full bg-white rounded-full transition-all duration-100 ease-linear" 
                style={{ width: `${progressPercent}%` }} 
              />
              <input 
                type="range" 
                min="0" 
                max={duration || 0} 
                value={currentTime} 
                onChange={(e) => setCurrentTime(Number(e.target.value))} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-8 shrink-0">
            <button onClick={toggleShuffle} className={`transition ${isShuffle ? 'text-indigo-500' : 'text-gray-400'}`}>
              <Shuffle size={24} />
            </button>
            <button onClick={handlePrev} disabled={!hasPrev} className="text-white disabled:text-gray-700">
              <SkipBack size={36} fill="currentColor" />
            </button>
            <button 
              onClick={isPlaying ? pauseSong : resumeSong} 
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-xl active:scale-95 transition"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={handleNext} disabled={!hasNext} className="text-white disabled:text-gray-700">
              <SkipForward size={36} fill="currentColor" />
            </button>
            <button onClick={toggleRepeat} className={`transition ${repeatMode !== 'none' ? 'text-indigo-500' : 'text-gray-400'} relative`}>
              <Repeat size={24} />
              {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-black bg-white text-black rounded-full px-1">1</span>}
            </button>
          </div>
        </div>
      </div>

      {/* --- MINI PLAYER BAR (Bottom Fixed) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 md:bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 text-white h-20 md:h-24 flex items-center shadow-2xl transition-all duration-300">
        <video ref={hiddenVideoRef} className="hidden" muted playsInline />
        
        {/* Progress Bar (Mobile Only) */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800 md:hidden pointer-events-none">
          <div className="h-full bg-white transition-all duration-300 ease-linear" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between px-4 md:px-6 gap-4">
          
          {/* Song Info (Left) */}
          <div 
            className="flex items-center gap-3 md:gap-4 flex-1 md:flex-initial md:w-[30%] min-w-0 cursor-pointer md:cursor-default"
            onClick={() => setIsFullScreen(true)}
          >
            <div className="relative group shrink-0">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-800 rounded-md overflow-hidden shadow-lg border border-white/5 flex items-center justify-center">
                {currentSong.coverArtBase64 ? <img src={currentSong.coverArtBase64} alt={currentSong.title} className="w-full h-full object-cover" /> : <Music className="w-5 h-5 md:w-6 md:h-6 text-zinc-500" />}
              </div>
            </div>
            <div className="flex flex-col min-w-0 justify-center overflow-hidden">
              <h3 className="font-bold text-sm md:text-base text-white truncate hover:underline">{currentSong.title}</h3>
              <p className="text-xs md:sm text-gray-400 truncate transition">{currentSong.artist || 'Unknown Artist'}</p>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-4">
            <button onClick={handlePrev} disabled={!hasPrev} className="text-gray-300 hover:text-white transition disabled:opacity-20 block"><SkipBack size={22} fill="currentColor" /></button>
              <button onClick={isPlaying ? pauseSong : resumeSong} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black active:scale-95 transition shadow-lg">
                 {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={handleNext} disabled={!hasNext} className="text-gray-300 hover:text-white transition disabled:opacity-20"><SkipForward size={22} fill="currentColor" /></button>
              <button onClick={() => setIsFullScreen(true)} className="text-gray-300 active:text-white p-1">
                  <ChevronUp size={28} />
              </button>
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex flex-col items-center max-w-2xl w-[40%] md:w-[40%] gap-1">
            <div className="flex items-center gap-6 mb-1">
               <button onClick={toggleShuffle} className={`transition ${isShuffle ? 'text-indigo-500 ' : 'text-gray-400 hover:text-white'}`}><Shuffle size={16} /></button>
               <button onClick={handlePrev} disabled={!hasPrev} className="text-gray-300 hover:text-white transition disabled:opacity-20 block"><SkipBack size={22} fill="currentColor" /></button>
               <button onClick={isPlaying ? pauseSong : resumeSong} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition shadow-lg">{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}</button>
               <button onClick={handleNext} disabled={!hasNext} className="text-gray-300 hover:text-white transition disabled:opacity-20"><SkipForward size={22} fill="currentColor" /></button>
               <button onClick={toggleRepeat} className={`relative transition block ${repeatMode !== 'none' ? 'text-indigo-500' : 'text-gray-400 hover:text-white'}`}>
                 <Repeat size={16} />
                 {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[9px] font-black bg-black rounded-full px-0.5">1</span>}
               </button>
            </div>
            <div className="w-full flex items-center gap-2 text-xs font-mono text-gray-400">
              <span className="w-10 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 group h-4 flex items-center">
                 <input type="range" min="0" max={duration || 0} value={currentTime} step="1" onChange={(e) => setCurrentTime(Number(e.target.value))} className="absolute w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer z-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden relative">
                  <div className="h-full bg-white rounded-full group-hover:bg-indigo-500 transition-colors" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <span className="w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Desktop Volume / PiP / Lyrics */}
          <div className="hidden md:flex items-center justify-end w-[30%] gap-4">
            
            {/* NEW: DESKTOP LYRICS BUTTON */}
            <button 
              onClick={() => setIsDesktopLyricsOpen(!isDesktopLyricsOpen)} 
              className={`transition p-1 rounded-md ${isDesktopLyricsOpen ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
              title="Lyrics"
            >
              <Mic2 size={18} />
            </button>

            <button onClick={togglePiP} className="text-gray-400 hover:text-white transition p-1"><ExternalLink size={18} /></button>
            <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="text-gray-400 hover:text-white">{volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
            <div className="w-24 group relative flex items-center h-4">
               <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="absolute w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer z-20" />
               <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden relative">
                  <div className="h-full bg-white group-hover:bg-indigo-500 transition-colors" style={{ width: `${volume * 100}%` }} />
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Player