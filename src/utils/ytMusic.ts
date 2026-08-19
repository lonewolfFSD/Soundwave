// YouTube Music Service: Production Resilient Metadata & Audio Stream Discovery
import type { Song } from '../context/PlayerContext'

// In-memory cache for video IDs
const videoIdCache = new Map<string, string>()

// Public Invidious & Piped CORS-friendly instances for production fallback
const PUBLIC_INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yt.drgnz.club',
  'https://vid.priv.au',
  'https://invidious.jing.rocks',
  'https://iv.nboeck.de',
  'https://invidious.flokinet.to'
]

const PUBLIC_PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacy.com.de',
  'https://piped-api.garudalinux.org'
]

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
 * Check if string is a valid 11-char YouTube Video ID
 */
export const isYoutubeVideoId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false
  const clean = id.replace('yt_', '').replace('/watch?v=', '').trim()
  return /^[a-zA-Z0-9_-]{11}$/.test(clean)
}

/**
 * Search YouTube Video ID with multi-tier CORS-compliant fallbacks
 */
export const findYouTubeVideoId = async (title: string, artist: string): Promise<string> => {
  const cleanQ = `${sanitizeTitle(title)} ${sanitizeTitle(artist)} official audio`.trim()
  const cacheKey = cleanQ.toLowerCase()
  if (videoIdCache.has(cacheKey)) return videoIdCache.get(cacheKey)!

  // 1. Try local dev backend search if on localhost or proxy available
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(3500) })
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

  // 2. Try Invidious Public APIs (CORS-friendly, works in production browsers)
  for (const instance of PUBLIC_INVIDIOUS_INSTANCES) {
    try {
      const invRes = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`, {
        signal: AbortSignal.timeout(3500)
      })
      if (invRes.ok) {
        const data = await invRes.json()
        if (Array.isArray(data) && data.length > 0) {
          const first = data.find((item: any) => item.videoId && isYoutubeVideoId(item.videoId)) || data[0]
          if (first && first.videoId && isYoutubeVideoId(first.videoId)) {
            videoIdCache.set(cacheKey, first.videoId)
            return first.videoId
          }
        }
      }
    } catch {}
  }

  // 3. Try Piped Public APIs
  for (const piped of PUBLIC_PIPED_INSTANCES) {
    try {
      const pRes = await fetch(`${piped}/search?q=${encodeURIComponent(cleanQ)}&filter=videos`, {
        signal: AbortSignal.timeout(3500)
      })
      if (pRes.ok) {
        const pData = await pRes.json()
        const items = pData.items || []
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0]
          const id = (first.url || '').replace('/watch?v=', '').trim() || first.id
          if (id && isYoutubeVideoId(id)) {
            videoIdCache.set(cacheKey, id)
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

  const isLocalHost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  )

  // On localhost dev server, use the local yt-dlp backend
  if (isLocalHost) {
    return `/api/yt-stream?id=${videoId}&quality=${quality}`
  }

  // In production deployment (e.g. soundwave.lonewolffsd.in), query direct stream endpoints
  for (const instance of PUBLIC_INVIDIOUS_INSTANCES.slice(0, 4)) {
    try {
      const streamRes = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(3000)
      })
      if (streamRes.ok) {
        const videoData = await streamRes.json()
        // Check adaptive audio formats (m4a, webm, mp4)
        const audioFormats = (videoData.adaptiveFormats || []).filter((f: any) =>
          f.type?.includes('audio') || f.mimeType?.includes('audio')
        )
        if (audioFormats.length > 0) {
          // Sort by highest bitrate/quality
          audioFormats.sort((a: any, b: any) => (b.bitrate || b.audioSampleRate || 0) - (a.bitrate || a.audioSampleRate || 0))
          const chosen = audioFormats[0]
          if (chosen.url) return chosen.url
        }

        // Direct format streams fallback
        const formatStreams = videoData.formatStreams || []
        if (formatStreams.length > 0 && formatStreams[0]?.url) {
          return formatStreams[0].url
        }
      }
    } catch {}
  }

  // Fallback to Invidious audio proxy stream
  return `https://inv.nadeko.net/latest_version?id=${videoId}&itag=140`
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
    const isLocalHost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.')
    )

    if (isLocalHost) {
      updatedSong.url = `/api/yt-stream?id=${videoId}&quality=${quality}`
    } else {
      const streamUrl = await getAudioStreamUrl(videoId, updatedSong.title, updatedSong.artist, quality)
      updatedSong.url = streamUrl || updatedSong.previewUrl || `https://inv.nadeko.net/latest_version?id=${videoId}&itag=140`
    }
    updatedSong.youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
  } else if (updatedSong.previewUrl) {
    // If no video ID found, fall back to iTunes preview stream
    updatedSong.url = updatedSong.previewUrl
  }

  return updatedSong
}

/**
 * Search Online Music Catalog (100% clean metadata, exact titles & artists for accurate lyrics)
 */
export const searchYouTubeMusic = async (query: string): Promise<Song[]> => {
  if (!query || query.trim().length === 0) return []
  const cleanQ = query.trim()

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
            url: item.previewUrl || `yt_online://${item.trackId}`,
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
          url: preview || `yt_online://${trackId}`,
          previewUrl: preview,
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
    const res = await fetch(`/api/yt-suggest?q=${encodeURIComponent(cleanQ)}`)
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
            url: item.previewUrl || `yt_online://${item.trackId}`,
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
