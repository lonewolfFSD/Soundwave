// YouTube Music Service: 100% CORS-Safe Production Metadata & Audio Stream Discovery
import type { Song } from '../context/PlayerContext'

// In-memory cache for video IDs and resolved audio streams
const videoIdCache = new Map<string, string>()
const streamCache = new Map<string, string>()

// Public Invidious & Piped instances
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

const COBALT_INSTANCES = [
  'https://cobalt-api.kwiatekm.tokyo',
  'https://api.cobalt.tools',
  'https://co.wuk.sh/api/json'
]

/**
 * Universal CORS-safe fetcher: tries direct, then falls back to trusted CORS proxy tunnels
 */
export const corsSafeFetch = async (url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> => {
  // 1. Direct fetch attempt
  try {
    const directRes = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) })
    if (directRes.ok) return directRes
  } catch {}

  // 2. CORS Proxy Tunnel: corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`
    const proxyRes = await fetch(proxyUrl, { ...options, signal: AbortSignal.timeout(timeoutMs) })
    if (proxyRes.ok) return proxyRes
  } catch {}

  // 3. CORS Proxy Tunnel: allorigins.win
  try {
    const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const allRes = await fetch(allOriginsUrl, { ...options, signal: AbortSignal.timeout(timeoutMs) })
    if (allRes.ok) return allRes
  } catch {}

  throw new Error(`CORS-safe fetch failed for ${url}`)
}

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
 * Search YouTube Video ID with CORS-safe proxy fallback
 */
export const findYouTubeVideoId = async (title: string, artist: string): Promise<string> => {
  const cleanQ = `${sanitizeTitle(title)} ${sanitizeTitle(artist)} official audio`.trim()
  const cacheKey = cleanQ.toLowerCase()
  if (videoIdCache.has(cacheKey)) return videoIdCache.get(cacheKey)!

  const isLocalHost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  )

  // 1. If on localhost dev server, use local /api/yt-search
  if (isLocalHost) {
    try {
      const res = await fetch(`/api/yt-search?q=${encodeURIComponent(cleanQ)}`, { signal: AbortSignal.timeout(3000) })
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

  // 2. Try Invidious instances with CORS-safe tunnel
  for (const instance of PUBLIC_INVIDIOUS_INSTANCES.slice(0, 3)) {
    try {
      const targetUrl = `${instance}/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`
      const res = await corsSafeFetch(targetUrl, {}, 3000)
      if (res.ok) {
        const data = await res.json()
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

  // 3. Try Piped instances with CORS-safe tunnel
  for (const piped of PUBLIC_PIPED_INSTANCES.slice(0, 2)) {
    try {
      const targetUrl = `${piped}/search?q=${encodeURIComponent(cleanQ)}&filter=videos`
      const res = await corsSafeFetch(targetUrl, {}, 3000)
      if (res.ok) {
        const pData = await res.json()
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

  if (streamCache.has(videoId)) return streamCache.get(videoId)!

  const isLocalHost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  )

  // On localhost dev server, use the local yt-dlp backend
  if (isLocalHost) {
    const localUrl = `/api/yt-stream?id=${videoId}&quality=${quality}`
    streamCache.set(videoId, localUrl)
    return localUrl
  }

  // In production deployment (e.g. soundwave.lonewolffsd.in):
  // 1. Try Cobalt API (CORS-friendly direct audio stream)
  for (const cobalt of COBALT_INSTANCES) {
    try {
      const res = await fetch(cobalt, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          isAudioOnly: true,
          audioFormat: 'mp3'
        }),
        signal: AbortSignal.timeout(3500)
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url && typeof data.url === 'string') {
          streamCache.set(videoId, data.url)
          return data.url
        }
      }
    } catch {}
  }

  // 2. Try Invidious Video Info API via CORS-safe tunnel
  for (const instance of PUBLIC_INVIDIOUS_INSTANCES.slice(0, 3)) {
    try {
      const targetUrl = `${instance}/api/v1/videos/${videoId}`
      const streamRes = await corsSafeFetch(targetUrl, {}, 3000)
      if (streamRes.ok) {
        const videoData = await streamRes.json()
        const audioFormats = (videoData.adaptiveFormats || []).filter((f: any) =>
          f.type?.includes('audio') || f.mimeType?.includes('audio')
        )
        if (audioFormats.length > 0) {
          audioFormats.sort((a: any, b: any) => (b.bitrate || b.audioSampleRate || 0) - (a.bitrate || a.audioSampleRate || 0))
          const chosen = audioFormats[0]
          if (chosen.url) {
            streamCache.set(videoId, chosen.url)
            return chosen.url
          }
        }
        const formatStreams = videoData.formatStreams || []
        if (formatStreams.length > 0 && formatStreams[0]?.url) {
          streamCache.set(videoId, formatStreams[0].url)
          return formatStreams[0].url
        }
      }
    } catch {}
  }

  // 3. Fallback to direct public Invidious audio proxy
  const fallbackUrl = `https://inv.nadeko.net/latest_version?id=${videoId}&itag=140`
  streamCache.set(videoId, fallbackUrl)
  return fallbackUrl
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
            youtubeUrl: `https://www.youtube.com/watch?v=${item.trackId}`
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
          youtubeUrl: `https://www.youtube.com/watch?v=${trackId}`
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
            youtubeUrl: `https://www.youtube.com/watch?v=${item.trackId}`
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
