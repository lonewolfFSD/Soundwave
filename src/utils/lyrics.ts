// Synced Lyrics Engine using LRCLIB API with Multi-Level Search and Fallbacks

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
    .replace(/ft\..*|feat\..*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses LRC formatted text with support for millisecond timestamps
 */
export const parseLrc = (lrc: string): LyricLine[] => {
  if (!lrc || typeof lrc !== 'string') return []

  const lines = lrc.split(/\r?\n/)
  const rawResults: { time: number; text: string }[] = []
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g
  const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i

  let globalOffsetSeconds = 0
  let hasTimestamp = false

  // 1. Check for global [offset: +/-ms] tag
  for (const line of lines) {
    const offsetMatch = line.match(offsetRegex)
    if (offsetMatch) {
      const offsetMs = parseInt(offsetMatch[1], 10)
      if (!isNaN(offsetMs)) {
        globalOffsetSeconds = offsetMs / 1000
      }
    }
  }

  // 2. Parse timestamps and lines
  for (const line of lines) {
    // Skip metadata tags like [ti:], [ar:], [al:], [by:], etc.
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(line)) continue

    const matches = [...line.matchAll(timeRegex)]
    const text = line.replace(timeRegex, '').trim()

    if (matches.length > 0) {
      hasTimestamp = true
      for (const m of matches) {
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
      }
    } else if (text) {
      rawResults.push({
        time: -1,
        text,
      })
    }
  }

  if (hasTimestamp) {
    const timed = rawResults.filter((r) => r.time !== -1)
    timed.sort((a, b) => a.time - b.time)
    return timed.map((item, idx) => ({ ...item, index: idx }))
  }

  return rawResults.map((item, idx) => ({ ...item, index: idx }))
}

const fetchJson = async (url: string): Promise<any> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) return await res.json()
  } catch {}
  return null
}

/**
 * Fetches lyrics from LRCLIB API with exact match and intelligent fallbacks
 */
export const fetchLyrics = async (
  title: string,
  artist: string,
  duration?: number,
  _videoId?: string
): Promise<string> => {
  if (!title) return ''

  // Normalize title and artist
  let cleanT = cleanTitle(title)
  let cleanA = cleanArtist(artist || '')

  // Handle embedded "Artist - Song" in title
  if (!cleanA && cleanT.includes(' - ')) {
    const parts = cleanT.split(' - ')
    cleanA = cleanArtist(parts[0])
    cleanT = cleanTitle(parts.slice(1).join(' - '))
  }

  const cacheKey = `${cleanT.toLowerCase()}___${cleanA.toLowerCase()}`
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!
  }

  // 1. Direct exact match query (/api/get)
  try {
    const params = new URLSearchParams({
      track_name: cleanT,
      artist_name: cleanA,
    })
    if (duration && duration > 0) {
      params.append('duration', Math.round(duration).toString())
    }

    const exact = await fetchJson(`https://lrclib.net/api/get?${params.toString()}`)
    if (exact?.syncedLyrics || exact?.plainLyrics) {
      const lyrics = exact.syncedLyrics || exact.plainLyrics
      lyricsCache.set(cacheKey, lyrics)
      return lyrics
    }
  } catch {}

  // 2. Search by title + artist (/api/search)
  try {
    const query = `${cleanT} ${cleanA}`.trim()
    const results = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`)

    if (Array.isArray(results) && results.length > 0) {
      // Prioritize synced lyrics
      const synced = results.filter((r: any) => r.syncedLyrics)
      if (synced.length > 0) {
        if (duration && duration > 0) {
          synced.sort((a: any, b: any) => Math.abs((a.duration || 0) - duration) - Math.abs((b.duration || 0) - duration))
        }
        const lyrics = synced[0].syncedLyrics
        lyricsCache.set(cacheKey, lyrics)
        return lyrics
      }
      const plain = results.find((r: any) => r.plainLyrics)
      if (plain?.plainLyrics) {
        lyricsCache.set(cacheKey, plain.plainLyrics)
        return plain.plainLyrics
      }
    }
  } catch {}

  // 3. Search by title only
  try {
    const results = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanT)}`)
    if (Array.isArray(results) && results.length > 0) {
      const best = results.find((r: any) => r.syncedLyrics) || results[0]
      const lyrics = best?.syncedLyrics || best?.plainLyrics || ''
      if (lyrics) {
        lyricsCache.set(cacheKey, lyrics)
        return lyrics
      }
    }
  } catch {}

  // 4. Raw title search fallback
  try {
    if (cleanT !== title) {
      const results = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(title)}`)
      if (Array.isArray(results) && results.length > 0) {
        const best = results.find((r: any) => r.syncedLyrics) || results[0]
        const lyrics = best?.syncedLyrics || best?.plainLyrics || ''
        if (lyrics) {
          lyricsCache.set(cacheKey, lyrics)
          return lyrics
        }
      }
    }
  } catch {}

  return ''
}

export interface LyricsSearchResult {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  previewUrl: string
  playlistId: string
  coverArtBase64: string
  youtubeUrl: string
  lyrics?: string
  matchedLyricsSnippet?: string
}

/**
 * Searches for songs matching lyrics from LRCLIB full-text database
 */
export const searchSongsByLyrics = async (queryText: string): Promise<LyricsSearchResult[]> => {
  if (!queryText || queryText.trim().length < 3) return []
  const cleanQ = queryText.trim().toLowerCase()

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(queryText.trim())}`, {
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return []
    const results = await res.json()
    if (!Array.isArray(results) || results.length === 0) return []

    const songs: LyricsSearchResult[] = []
    const seen = new Set<string>()

    for (const item of results) {
      if (!item.trackName || !item.artistName) continue
      const title = cleanTitle(item.trackName)
      const artist = cleanArtist(item.artistName)
      const key = `${title.toLowerCase()}_${artist.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      // Find matching snippet in lyrics
      let snippet = ''
      const allLyrics = (item.plainLyrics || item.syncedLyrics || '').replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')
      if (allLyrics) {
        const queryWords = cleanQ.split(/\s+/).filter(w => w.length > 2)
        const lines = allLyrics.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean)

        for (const line of lines) {
          const lLower = line.toLowerCase()
          if (lLower.includes(cleanQ)) {
            snippet = line
            break
          }
          if (queryWords.length > 1 && queryWords.filter(w => lLower.includes(w)).length >= Math.ceil(queryWords.length * 0.6)) {
            snippet = line
            break
          }
        }
      }

      songs.push({
        id: `lyrics_${item.id || Math.random().toString(36).slice(2, 9)}`,
        title,
        artist,
        duration: Math.round(item.duration || 210),
        url: '',
        previewUrl: '',
        playlistId: 'lyrics_match',
        coverArtBase64: '',
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`,
        lyrics: item.syncedLyrics || item.plainLyrics || '',
        matchedLyricsSnippet: snippet || undefined
      })

      if (songs.length >= 10) break
    }

    return songs
  } catch (err) {
    console.warn('Lyrics search error:', err)
    return []
  }
}

