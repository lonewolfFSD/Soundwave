// Synced Lyrics Engine supporting Unison (BetterLyrics), LRCLIB (with duration matching), and Multi-Provider Fallbacks

export interface LyricLine {
  time: number // in seconds
  text: string
  index: number
}

const lyricsCache = new Map<string, string>()

// Clean track title (removes YouTube video tags, remastered tags, feat tags, etc.)
export const cleanTitle = (title: string): string => {
  if (!title) return ''
  return title
    .replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|hd|4k|visualizer)?|audio|lyrics?|visualizer|remastered|explicit|clean|radio\s*edit|extended|deluxe|bonus\s*track)(\)|\])/gi, '')
    .replace(/feat\..*|ft\..*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Clean artist name
export const cleanArtist = (artist: string): string => {
  if (!artist) return ''
  return artist
    .replace(/- Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/,.*$/, '') // take primary artist
    .trim()
}

/**
 * Parses LRC formatted text with support for:
 * - Millisecond timestamps: [01:23.45] and [01:23.456]
 * - LRC [offset:+/-ms] tag adjustment
 * - Clean lyric lines without metadata
 */
export const parseLrc = (lrc: string): LyricLine[] => {
  if (!lrc || typeof lrc !== 'string') return []

  const lines = lrc.split(/\r?\n/)
  const rawResults: { time: number; text: string }[] = []
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g
  const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i

  let globalOffsetSeconds = 0
  let hasTimestamp = false

  // 1. Check for global [offset: +/-ms]
  for (const line of lines) {
    const offsetMatch = line.match(offsetRegex)
    if (offsetMatch) {
      const offsetMs = parseInt(offsetMatch[1], 10)
      if (!isNaN(offsetMs)) {
        globalOffsetSeconds = offsetMs / 1000
      }
    }
  }

  // 2. Parse timestamps
  lines.forEach((line) => {
    // Ignore metadata tags like [ti:], [ar:], [al:], [by:], etc.
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(line)) return

    const matches = [...line.matchAll(timeRegex)]
    const text = line.replace(timeRegex, '').trim()

    if (matches.length > 0) {
      hasTimestamp = true
      matches.forEach((m) => {
        const minutes = parseInt(m[1], 10)
        const seconds = parseInt(m[2], 10)
        let millis = 0
        if (m[3]) {
          const rawMs = m[3]
          millis = rawMs.length === 2 ? parseInt(rawMs, 10) * 10 : parseInt(rawMs.slice(0, 3), 10)
        }
        const totalSeconds = minutes * 60 + seconds + millis / 1000 + globalOffsetSeconds

        if (text) {
          rawResults.push({
            time: Math.max(0, totalSeconds),
            text: text || '♪',
          })
        }
      })
    } else if (text) {
      rawResults.push({
        time: -1,
        text,
      })
    }
  })

  if (hasTimestamp) {
    const timed = rawResults.filter((r) => r.time !== -1)
    timed.sort((a, b) => a.time - b.time)
    return timed.map((item, idx) => ({ ...item, index: idx }))
  }

  return rawResults.map((item, idx) => ({ ...item, index: idx }))
}

const fetchJsonWithFallback = async (url: string): Promise<any> => {
  try {
    const res = await fetch(url)
    if (res.ok) return await res.json()
  } catch {
    // Attempt CORS proxy fallback
    try {
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      const res = await fetch(proxied)
      if (res.ok) {
        const text = await res.text()
        return JSON.parse(text)
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Fetches lyrics from Unison / BetterLyrics API
 */
const fetchUnisonLyrics = async (title: string, artist: string, videoId?: string): Promise<string | null> => {
  try {
    if (videoId) {
      const data = await fetchJsonWithFallback(`https://lyrics-api.boidu.dev/getLyrics?v=${encodeURIComponent(videoId)}`)
      if (data?.lyrics && typeof data.lyrics === 'string') return data.lyrics
      if (data?.syncedLyrics) return data.syncedLyrics
    }
    const data = await fetchJsonWithFallback(`https://lyrics-api.boidu.dev/getLyrics?s=${encodeURIComponent(title)}&a=${encodeURIComponent(artist)}`)
    if (data?.lyrics && typeof data.lyrics === 'string') return data.lyrics
    if (data?.syncedLyrics) return data.syncedLyrics
  } catch {}
  return null
}

/**
 * Fetches lyrics from LRCLIB API with exact duration matching
 */
const fetchLrclibLyrics = async (title: string, artist: string, duration?: number): Promise<string | null> => {
  // 1. Exact match /api/get
  try {
    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    })
    if (duration && duration > 0) {
      params.append('duration', Math.round(duration).toString())
    }

    const data = await fetchJsonWithFallback(`https://lrclib.net/api/get?${params.toString()}`)
    if (data?.syncedLyrics || data?.plainLyrics) {
      return data.syncedLyrics || data.plainLyrics
    }
  } catch {}

  // 2. Search /api/search with duration distance sorting
  try {
    const query = `${title} ${artist}`.trim()
    const results = await fetchJsonWithFallback(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`)

    if (Array.isArray(results) && results.length > 0) {
      // Find synced lyrics with the closest duration
      const syncedMatches = results.filter((r: any) => r.syncedLyrics)
      if (syncedMatches.length > 0) {
        if (duration && duration > 0) {
          syncedMatches.sort((a: any, b: any) => {
            const diffA = Math.abs((a.duration || 0) - duration)
            const diffB = Math.abs((b.duration || 0) - duration)
            return diffA - diffB
          })
        }
        return syncedMatches[0].syncedLyrics
      }
      const plain = results.find((r: any) => r.plainLyrics)
      if (plain) return plain.plainLyrics
    }
  } catch {}

  // 3. Fallback title only
  try {
    const results = await fetchJsonWithFallback(`https://lrclib.net/api/search?q=${encodeURIComponent(title)}`)
    if (Array.isArray(results) && results.length > 0) {
      const best = results.find((r: any) => r.syncedLyrics) || results[0]
      return best?.syncedLyrics || best?.plainLyrics || null
    }
  } catch {}

  return null
}

/**
 * Fetches lyrics from Netease Cloud Music Synced API
 */
const fetchNeteaseLyrics = async (title: string, artist: string): Promise<string | null> => {
  try {
    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(`${title} ${artist}`)}&type=1&offset=0&total=true&limit=1`
    const searchData = await fetchJsonWithFallback(searchUrl)
    const songId = searchData?.result?.songs?.[0]?.id
    if (songId) {
      const lyricUrl = `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`
      const lyricData = await fetchJsonWithFallback(lyricUrl)
      if (lyricData?.lrc?.lyric) {
        return lyricData.lrc.lyric
      }
    }
  } catch {}
  return null
}

/**
 * Master multi-provider lyrics fetcher (Unison -> LRCLIB duration-matched -> Netease)
 */
export const fetchLyrics = async (
  title: string,
  artist: string,
  duration?: number,
  videoId?: string
): Promise<string> => {
  if (!title) return ''

  // Normalize title and artist
  let cleanedTitle = cleanTitle(title)
  let cleanedArtist = cleanArtist(artist || '')

  // Handle "Artist - Title" embedded in title
  if (!cleanedArtist && cleanedTitle.includes(' - ')) {
    const parts = cleanedTitle.split(' - ')
    cleanedArtist = cleanArtist(parts[0])
    cleanedTitle = cleanTitle(parts.slice(1).join(' - '))
  }

  const cacheKey = `${cleanedTitle.toLowerCase()}___${cleanedArtist.toLowerCase()}___${Math.round(duration || 0)}`
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!
  }

  // 1. Try Unison (BetterLyrics API)
  const unisonLyrics = await fetchUnisonLyrics(cleanedTitle, cleanedArtist, videoId)
  if (unisonLyrics) {
    lyricsCache.set(cacheKey, unisonLyrics)
    return unisonLyrics
  }

  // 2. Try LRCLIB with duration matching
  const lrclibLyrics = await fetchLrclibLyrics(cleanedTitle, cleanedArtist, duration)
  if (lrclibLyrics) {
    lyricsCache.set(cacheKey, lrclibLyrics)
    return lrclibLyrics
  }

  // 3. Try Netease Synced API
  const neteaseLyrics = await fetchNeteaseLyrics(cleanedTitle, cleanedArtist)
  if (neteaseLyrics) {
    lyricsCache.set(cacheKey, neteaseLyrics)
    return neteaseLyrics
  }

  return ''
}
