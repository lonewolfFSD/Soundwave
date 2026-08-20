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
 * Search YouTube Video ID by title and artist
 */
export const findYouTubeVideoId = async (title: string, artist: string): Promise<string> => {
  const cleanQ = `${sanitizeTitle(title)} ${sanitizeTitle(artist)} official audio`.trim()
  const cacheKey = cleanQ.toLowerCase()
  if (videoIdCache.has(cacheKey)) return videoIdCache.get(cacheKey)!

  // 1. Check local/production /api/yt-search endpoint
  const searchEndpoints = [
    `/api/yt-search?q=${encodeURIComponent(cleanQ)}`,
    `https://soundwave.lonewolffsd.in/api/yt-search?q=${encodeURIComponent(cleanQ)}`
  ]

  for (const endpoint of searchEndpoints) {
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(3500) })
      if (res.ok) {
        const items = await res.json()
        if (Array.isArray(items) && items.length > 0 && items[0]?.id) {
          const id = items[0].id.replace('yt_', '')
          if (isYoutubeVideoId(id)) {
            videoIdCache.set(cacheKey, id)
            return id
          }
        }
      }
    } catch {}
  }

  // 2. Fallback: Search direct YouTube metadata endpoint
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}&sp=EgIQAQ%253D%253D`
    const res = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(4000)
    })
    if (res.ok) {
      const html = await res.text()
      const matches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g)
      if (matches && matches.length > 0) {
        for (const m of matches) {
          const id = m.replace('"videoId":"', '').replace('"', '')
          if (isYoutubeVideoId(id)) {
            videoIdCache.set(cacheKey, id)
            return id
          }
        }
      }
    }
  } catch {}

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
  return videoId ? `/api/yt-stream?id=${videoId}&quality=${quality}` : ''
}

/**
 * Resolve Song to Full-Length Playable Stream
 */
export const resolveFullLengthSong = async (
  song: Song,
  quality: 'best' | 'standard' = 'best'
): Promise<Song> => {
  if (!song) return song
  const updatedSong = { ...song }

  if (updatedSong.url?.startsWith('blob:') || updatedSong.url?.startsWith('data:')) {
    return updatedSong
  }

  if (
    updatedSong.playlistId === 'global' ||
    updatedSong.url?.includes('cloudinary') ||
    updatedSong.url?.includes('firebasestorage')
  ) {
    return updatedSong
  }

  let videoId = ''
  if (isYoutubeVideoId(updatedSong.id.replace('yt_', ''))) {
    videoId = updatedSong.id.replace('yt_', '')
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

  // 1. Primary: Search YouTube directly via /api/yt-search
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        return items
      }
    }
  } catch (err) {
    console.warn('API yt-search error, attempting iTunes catalog fallback:', err)
  }

  // 2. Fallback: Search iTunes catalog
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&media=music&entity=song&limit=25`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        return data.results.map((item: any) => {
          const highResCover = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
            : item.artworkUrl60
          return {
            id: `track_${item.trackId}`,
            title: sanitizeTitle(item.trackName || 'Unknown Title'),
            artist: sanitizeTitle(item.artistName || 'Unknown Artist'),
            duration: Math.floor((item.trackTimeMillis || 0) / 1000) || 210,
            url: item.previewUrl || '',
            previewUrl: item.previewUrl || '',
            playlistId: 'online_search',
            coverArtBase64: highResCover,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`
          }
        })
      }
    }
  } catch (err) {
    console.error('Search error:', err)
  }

  return []
}

/**
 * Fetch Top Trending Online Tracks
 */
export const getTrendingYouTubeMusic = async (): Promise<Song[]> => {
  // 1. Try YouTube Search for top hits
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent('Top Hits 2024 Popular Songs')}`, { signal: AbortSignal.timeout(3500) })
    if (res.ok) {
      const items = await res.json()
      if (Array.isArray(items) && items.length > 0) {
        return items.map((song: any) => ({ ...song, playlistId: 'trending' }))
      }
    }
  } catch {}

  // 2. Fallback to iTunes Top Charts
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
        const preview = entry?.link?.[1]?.attributes?.href || ''

        return {
          id: `top_${trackId}`,
          title: sanitizeTitle(title),
          artist: sanitizeTitle(artist),
          duration: 210,
          url: preview || '',
          previewUrl: preview || '',
          playlistId: 'trending',
          coverArtBase64: cover,
          youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`
        }
      })

      return [...songs].sort(() => 0.5 - Math.random())
    }
  } catch (err) {
    console.error('Trending fetch error:', err)
  }
  return []
}

/**
 * Fetch search suggestions for Google/YouTube autocomplete
 */
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  if (!query || !query.trim()) return []
  const cleanQ = query.trim()

  try {
    const res = await fetch(`/api/yt-suggest?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(2000) })
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
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(searchQuery + ' audio')}`, { signal: AbortSignal.timeout(3500) })
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
            url: item.previewUrl || '',
            previewUrl: item.previewUrl || '',
            playlistId: 'category',
            coverArtBase64: highResCover,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`
          }
        })
        return [...songs].sort(() => 0.5 - Math.random())
      }
    }
  } catch (err) {
    console.error("Category fetch error:", err)
  }
  return []
}
