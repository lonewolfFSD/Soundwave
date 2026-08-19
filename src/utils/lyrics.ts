// Synced Lyrics Service using LRCLIB API

export interface LyricLine {
  time: number // in seconds
  text: string
  index: number
}

const lyricsCache = new Map<string, string>()

// Clean track title (remove (Official Video), [Audio], feat., etc. for better search match)
export const cleanTitle = (title: string): string => {
  return title
    .replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|hd|4k)?|audio|lyrics?|visualizer|remastered|explicit)(\)|\])/gi, '')
    .replace(/feat\..*|ft\..*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Clean artist name
export const cleanArtist = (artist: string): string => {
  return artist
    .replace(/- Topic$/i, '')
    .replace(/VEVO$/i, '')
    .trim()
}

export const parseLrc = (lrc: string): LyricLine[] => {
  if (!lrc || typeof lrc !== 'string') return []

  const lines = lrc.split(/\r?\n/)
  const result: LyricLine[] = []
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g

  let hasTimestamp = false

  lines.forEach((line) => {
    const matches = [...line.matchAll(timeRegex)]
    const text = line.replace(timeRegex, '').trim()

    if (matches.length > 0) {
      hasTimestamp = true
      matches.forEach((m) => {
        const minutes = parseInt(m[1], 10)
        const seconds = parseInt(m[2], 10)
        const millis = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0
        const totalSeconds = minutes * 60 + seconds + millis / 1000

        result.push({
          time: totalSeconds,
          text: text || '♪',
          index: result.length
        })
      })
    } else if (text) {
      result.push({
        time: -1,
        text,
        index: result.length
      })
    }
  })

  if (hasTimestamp) {
    // Keep only timestamped lines if synced timestamps are present
    const timed = result.filter(r => r.time !== -1)
    return timed.sort((a, b) => a.time - b.time).map((item, idx) => ({ ...item, index: idx }))
  }

  return result.map((item, idx) => ({ ...item, index: idx }))
}

/**
 * Fetches lyrics from LRCLIB API with CORS fallback
 */
export const fetchLyrics = async (title: string, artist: string, duration?: number): Promise<string> => {
  if (!title) return ''

  const cleanedTitle = cleanTitle(title)
  const cleanedArtist = cleanArtist(artist || '')
  const cacheKey = `${cleanedTitle.toLowerCase()}___${cleanedArtist.toLowerCase()}`

  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!
  }

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
    } catch {
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

  // 1. Try exact match using /api/get
  try {
    const params = new URLSearchParams({
      track_name: cleanedTitle,
      artist_name: cleanedArtist,
    })
    if (duration && duration > 0) {
      params.append('duration', Math.round(duration).toString())
    }

    const data = await fetchJson(`https://lrclib.net/api/get?${params.toString()}`)
    if (data) {
      const lyrics = data.syncedLyrics || data.plainLyrics || ''
      if (lyrics) {
        lyricsCache.set(cacheKey, lyrics)
        return lyrics
      }
    }
  } catch (e) {
    // Fallthrough to search
  }

  // 2. Try search using /api/search with title and artist
  try {
    const query = `${cleanedTitle} ${cleanedArtist}`.trim()
    const results = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`)

    if (Array.isArray(results) && results.length > 0) {
      const bestMatch = results.find((r: any) => r.syncedLyrics) || results[0]
      const lyrics = bestMatch?.syncedLyrics || bestMatch?.plainLyrics || ''
      if (lyrics) {
        lyricsCache.set(cacheKey, lyrics)
        return lyrics
      }
    }
  } catch (e) {
    // Fallthrough to title search
  }

  // 3. Fallback search using only track title
  try {
    const results = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle)}`)
    if (Array.isArray(results) && results.length > 0) {
      const bestMatch = results.find((r: any) => r.syncedLyrics) || results[0]
      const lyrics = bestMatch?.syncedLyrics || bestMatch?.plainLyrics || ''
      if (lyrics) {
        lyricsCache.set(cacheKey, lyrics)
        return lyrics
      }
    }
  } catch (e) {
    console.warn('Lyrics fallback search failed:', e)
  }

  return ''
}
