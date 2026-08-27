// YouTube Music Service: Clean Metadata & Accurate Video Discovery
import type { Song } from '../context/PlayerContext'

// In-memory cache for video IDs
const videoIdCache = new Map<string, string>()

/**
 * Clean track title
 */
export const sanitizeTitle = (title: string): string => {
  return (title || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/**
 * Accurately extract real Song Name and real Artist Name from search results and video titles
 */
export const parseCleanSongMeta = (rawTitle: string, rawArtist: string): { title: string; artist: string } => {
  let title = sanitizeTitle(rawTitle || '').trim()
  let artist = sanitizeTitle(rawArtist || '').trim()

  // 1. Remove common video metadata tags from title
  title = title
    .replace(/\s*[\(\[]\s*(official\s*(music\s*)?video|official\s*audio|official\s*hd\s*video|official\s*lyric\s*video|lyric\s*video|lyrics\s*video|lyrics|audio\s*track|audio|visualizer|music\s*video|video\s*clip|4k|hd|hq|remastered|explicit|full\s*song)\s*[\)\]]/gi, '')
    .replace(/\s*\|\s*Official\s*(Music\s*)?Video/gi, '')
    .replace(/\s*\/\/\s*Official\s*(Music\s*)?Video/gi, '')
    .replace(/\s*\|\s*Official\s*Audio/gi, '')
    .replace(/\s*\|\s*Lyrics/gi, '')
    .replace(/\s*\|\s*Visualizer/gi, '')
    .trim()

  // 2. Clean channel tags from artist
  artist = artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*vevo$/i, '')
    .replace(/official\s*channel/i, '')
    .trim()

  // 3. Check if title is structured as "Artist - Song Title" or "Artist: Song Title"
  const hyphenMatches = title.match(/^(.+?)\s*(?:-|_|–|—|:)\s*(.+)$/)
  if (hyphenMatches && hyphenMatches[1] && hyphenMatches[2]) {
    const candidateArtist = hyphenMatches[1].trim()
    const candidateTitle = hyphenMatches[2].trim()

    const isGenericArtist = !artist || /^(youtube\s*music|various\s*artists|auto-generated|topic|music|soundtrack)$/i.test(artist)
    const artistMatchesChannel = artist.toLowerCase().includes(candidateArtist.toLowerCase()) ||
                                 candidateArtist.toLowerCase().includes(artist.toLowerCase())

    if (isGenericArtist || artistMatchesChannel) {
      artist = candidateArtist
      title = candidateTitle
    }
  }

  // 4. Remove leading/trailing quotes
  title = title.replace(/^["'“”](.*)["'“”]$/, '$1').trim()

  if (!artist || artist.toLowerCase() === 'youtube music') {
    artist = 'Unknown Artist'
  }

  return { title, artist }
}

/**
 * Comprehensive YouTube Video ID extractor from any string, URL, or ID
 */
export const extractYoutubeVideoId = (input?: string | null): string => {
  if (!input || typeof input !== 'string') return ''
  const str = input.trim()
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str
  // yt_ prefix
  if (str.startsWith('yt_') && /^[a-zA-Z0-9_-]{11}$/.test(str.substring(3))) {
    return str.substring(3)
  }
  // URL containing ?v= or &v= or ?id= or &id= or /embed/ or /watch?v= or youtu.be/
  const match = str.match(/(?:[?&](?:v|id)=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i)
  if (match && match[1]) return match[1]
  return ''
}

/**
 * Check if string is a valid 11-char YouTube Video ID
 */
export const isYoutubeVideoId = (id: string): boolean => {
  return !!extractYoutubeVideoId(id)
}

/**
 * Search YouTube Video ID by title and artist with lightning-fast caching and CORS-safe multi-fallback
 */
export const findYouTubeVideoId = async (title: string, artist: string): Promise<string> => {
  if (!title && !artist) return ''
  const cleanQ = `${sanitizeTitle(title)} ${sanitizeTitle(artist)}`.trim()
  const cacheKey = `sw_yt_${cleanQ.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

  // 1. In-memory cache
  if (videoIdCache.has(cacheKey)) return videoIdCache.get(cacheKey)!

  // 2. Persistent LocalStorage cache (0ms instant lookup)
  try {
    const stored = localStorage.getItem(cacheKey)
    if (stored && isYoutubeVideoId(stored)) {
      videoIdCache.set(cacheKey, stored)
      return stored
    }
  } catch {}

  // 3. Local Vite API (works in dev or full-stack environments)
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const id = extractYoutubeVideoId(item?.id) || extractYoutubeVideoId(item?.youtubeUrl) || extractYoutubeVideoId(item?.url)
          if (id && isYoutubeVideoId(id)) {
            videoIdCache.set(cacheKey, id)
            try { localStorage.setItem(cacheKey, id) } catch {}
            return id
          }
        }
      }
    }
  } catch {}

  // 4. CORS-Safe YouTube HTML Scraping via Free Open CORS Proxies
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(ytSearchUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(ytSearchUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytSearchUrl)}`
  ]

  for (const proxyUrl of corsProxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const text = await res.text()
        const match = text.match(/"videoId":"([a-zA-Z0-9_-]{11})"/i) || text.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/i)
        if (match && match[1] && isYoutubeVideoId(match[1])) {
          const id = match[1]
          videoIdCache.set(cacheKey, id)
          try { localStorage.setItem(cacheKey, id) } catch {}
          return id
        }
      }
    } catch {}
  }

  // 5. CORS-Enabled Public Endpoints (Safe error handling)
  const publicApis = [
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://vid.pugarchive.org/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://invidious.lunar.icu/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://piped-api.garudalinux.org/search?q=${encodeURIComponent(cleanQ)}&filter=music_songs`
  ]

  for (const apiUrl of publicApis) {
    try {
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        for (const item of items) {
          const id = extractYoutubeVideoId(item?.videoId) || extractYoutubeVideoId(item?.url) || extractYoutubeVideoId(item?.id)
          if (id && isYoutubeVideoId(id)) {
            videoIdCache.set(cacheKey, id)
            try { localStorage.setItem(cacheKey, id) } catch {}
            return id
          }
        }
      }
    } catch {}
  }

  return ''
}

/**
 * Resolve Direct Stream URL for Video ID
 */
export const getAudioStreamUrl = async (
  videoIdOrQuery: string,
  title?: string,
  artist?: string,
  quality: 'best' | 'standard' = 'best'
): Promise<string> => {
  let videoId = (videoIdOrQuery || '').replace('yt_', '').trim()
  if (!isYoutubeVideoId(videoId) && title) {
    videoId = await findYouTubeVideoId(title, artist || '')
  }
  if (!videoId) return ''

  // On native Android hit Piped/Invidious directly for a streamable audio URL
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  if (isNative) {
    const streamEndpoints = [
      `https://pa.il.ax/streams/${videoId}`,
      `https://piped-api.garudalinux.org/streams/${videoId}`,
      `https://inv.nadeko.net/api/v1/videos/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`
    ]

    for (const ep of streamEndpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(6000) })
        if (res.ok) {
          const data = await res.json()
          const audioStreams: any[] = data.audioStreams || data.adaptiveFormats || []
          const best = audioStreams
            .filter((s: any) => s.url && (s.mimeType?.includes('audio') || s.type?.includes('audio')))
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]
          if (best?.url) return best.url
        }
      } catch {}
    }
  }

  return `/api/yt-stream?id=${videoId}&quality=${quality}`
}

/**
 * Resolve Song to Full-Length Playable Stream (100% Lossless, 0 Previews)
 */
export const resolveFullLengthSong = async (
  song: Song,
  quality: 'best' | 'standard' = 'best'
): Promise<Song> => {
  if (!song) return song
  const updatedSong = { ...song }

  // Custom user uploads
  if (
    updatedSong.url?.startsWith('blob:') ||
    updatedSong.url?.startsWith('data:') ||
    updatedSong.playlistId === 'global' ||
    updatedSong.url?.includes('cloudinary') ||
    updatedSong.url?.includes('firebasestorage')
  ) {
    return updatedSong
  }

  // Strip any legacy 30-second iTunes preview URLs
  if (updatedSong.url?.includes('apple.com') || updatedSong.url?.includes('itunes')) {
    updatedSong.url = ''
    updatedSong.previewUrl = ''
  }

  let videoId = ''
  const extractedId = extractYoutubeVideoId(updatedSong.id) ||
                      extractYoutubeVideoId((updatedSong as any).youtubeId) ||
                      extractYoutubeVideoId(updatedSong.youtubeUrl)
  if (extractedId) {
    videoId = extractedId
  } else {
    videoId = await findYouTubeVideoId(updatedSong.title, updatedSong.artist)
  }

  if (videoId) {
    updatedSong.id = `yt_${videoId}`
    updatedSong.url = `/api/yt-stream?id=${videoId}&quality=${quality}`
    updatedSong.youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
  }

  return updatedSong
}

/**
 * Search Online Music Catalog (Exact YouTube Music tracks)
 */
export const searchYouTubeMusic = async (query: string): Promise<Song[]> => {
  if (!query || query.trim().length === 0) return []
  const cleanQ = query.trim()

  const isNonMusicJunk = (title: string, artist: string, durationSecs: number) => {
    const text = `${title} ${artist}`.toLowerCase()
    
    // 1. Blacklist full playlists, compilation mixes, greatest hits albums, DJ mixes
    const playlistOrCompilationRegex = /\b(playlist|songs playlist|greatest hits|full album|best of|top \d+ songs|all songs|billboard hot 100|nonstop|non stop|dj mix|mega mix|party mix|lofi mix|chill mix|mix \d+|1 hour|2 hours|3 hours|10 hours|soundtrack full|ost full|discography|anthology|music mix|mashup collection|album #\d+)\b/i
    if (playlistOrCompilationRegex.test(text)) return true

    // 2. Non-music keywords blacklist
    const nonMusicRegex = /\b(how to|tutorial|origami|step by step|diy|craft|sound effect|sfx|asmr|sleep sounds|rain sounds|white noise|anxiety control|stress relief sounds|guided meditation|meditation guide|binaural beats for sleep|documentary|podcast|audiobook|lecture|vlog|reaction|gameplay|walkthrough|unboxing|review|lesson|speech|news report)\b/i
    if (nonMusicRegex.test(text)) {
      const isExplicitSong = /\b(official video|official music video|official audio|audio track|lyric video|music video)\b/i.test(text)
      if (!isExplicitSong) return true
    }

    // 3. Single song duration bounds: 35s to 480s (8 mins)
    if (durationSecs > 480 || durationSecs < 35) {
      return true
    }

    return false
  }

  const songs: Song[] = []
  const seenKeys = new Set<string>()

  // 1. Concurrently query verified track catalog and YouTube Search
  const [ytResult, itunesResult] = await Promise.all([
    fetch(`/api/yt-search?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(8000) })
      .then(async res => (res.ok ? await res.json() : []))
      .catch(() => []),
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&media=music&entity=song&limit=30`)
      .then(async res => (res.ok ? await res.json() : { results: [] }))
      .catch(() => ({ results: [] }))
  ])

  // 2. Process verified song catalog
  if (Array.isArray(itunesResult?.results)) {
    for (const item of itunesResult.results) {
      const clean = parseCleanSongMeta(item.trackName || '', item.artistName || '')
      if (clean.title && clean.artist) {
        const key = `${clean.title} ${clean.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          const highResCover = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
            : item.artworkUrl60
          songs.push({
            id: `track_${item.trackId}`,
            title: clean.title,
            artist: clean.artist,
            duration: Math.floor((item.trackTimeMillis || 0) / 1000) || 210,
            url: '',
            previewUrl: '',
            playlistId: 'online_search',
            coverArtBase64: highResCover,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(clean.title + ' ' + clean.artist)}`
          })
        }
      }
    }
  }

  // 3. Process YouTube Search songs
  if (Array.isArray(ytResult)) {
    for (const item of ytResult) {
      const clean = parseCleanSongMeta(item.title || '', item.artist || '')
      if (clean.title && !isNonMusicJunk(clean.title, clean.artist, item.duration || 210)) {
        const key = `${clean.title} ${clean.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          songs.push({
            ...item,
            title: clean.title,
            artist: clean.artist
          })
        }
      }
    }
  }

  return songs
}

/**
 * Fetch Top Trending Online Tracks
 */
export const getTrendingYouTubeMusic = async (): Promise<Song[]> => {
  // 1. Primary: Verified Top Songs Chart (guaranteed individual single tracks)
  try {
    const res = await fetch('https://itunes.apple.com/us/rss/topsongs/limit=50/json')
    if (res.ok) {
      const data = await res.json()
      const entries = data.feed?.entry || []
      const songs = entries.map((entry: any) => {
        const title = entry['im:name']?.label || 'Top Hit'
        const artist = entry['im:artist']?.label || 'Top Artist'
        const rawCover = entry['im:image']?.[2]?.label || entry['im:image']?.[0]?.label
        const cover = rawCover ? rawCover.replace(/170x170bb/g, '600x600bb') : ''
        const trackId = entry.id?.attributes?.['im:id'] || Math.random().toString(36).slice(2, 9)

        return {
          id: `top_${trackId}`,
          title: sanitizeTitle(title),
          artist: sanitizeTitle(artist),
          duration: 210,
          url: '',
          previewUrl: '',
          playlistId: 'trending',
          coverArtBase64: cover,
          youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`
        }
      })

      if (songs.length > 0) {
        return [...songs].sort(() => 0.5 - Math.random())
      }
    }
  } catch (err) {
    console.error('Trending fetch error:', err)
  }

  // 2. Fallback: YouTube Search
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent('Top Billboard Songs Official Audio')}`, { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        return items.map((song: any) => ({ ...song, playlistId: 'trending' }))
      }
    }
  } catch {}

  return []
}

/**
 * Fetch search suggestions for Google/YouTube autocomplete
 */
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  if (!query || !query.trim()) return []
  const cleanQ = query.trim()

  try {
    const res = await fetch(`/api/yt-suggest?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(2500) })
    if (res.ok) {
      const suggestions = await res.json()
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return suggestions
      }
    }
  } catch {}

  // Fallback to iTunes track names
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&media=music&entity=song&limit=6`
    )
    if (res.ok) {
      const data = await res.json()
      return (data.results || []).map((r: any) => `${r.trackName} - ${r.artistName}`)
    }
  } catch {}

  return []
}

/**
 * Fetch tracks for specific mood/genre categories
 */
export const getCategoryTracks = async (searchQuery: string, limit = 20): Promise<Song[]> => {
  // 1. Try YouTube Search
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(searchQuery + ' audio')}`, { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        return items.slice(0, limit).map((song: any) => ({ ...song, playlistId: 'category' }))
      }
    }
  } catch {}

  // 2. Fallback to iTunes Category Search
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=${limit}`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const songs = data.results.map((item: any) => {
          const highResCover = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
            : item.artworkUrl60
          return {
            id: `cat_${item.trackId}`,
            title: sanitizeTitle(item.trackName || 'Unknown Title'),
            artist: sanitizeTitle(item.artistName || 'Unknown Artist'),
            duration: Math.floor((item.trackTimeMillis || 0) / 1000) || 210,
            url: '',
            previewUrl: '',
            playlistId: 'category',
            coverArtBase64: highResCover,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`
          }
        })
        return songs
      }
    }
  } catch (err) {
    console.error("Category fetch error:", err)
  }

  return []
}
