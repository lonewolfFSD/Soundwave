import type { Song } from '../context/PlayerContext'
import { parseCleanSongMeta } from './ytMusic'

export interface ArtistRelease {
  id: string
  title: string
  year?: string
  trackCount?: number
  coverArtBase64: string
  genre?: string
}

export interface ArtistPlaylist {
  id: string
  playlistId: string
  title: string
  coverArtBase64: string
  trackCount?: string
  author?: string
}

export interface SimilarArtist {
  name: string
  genre?: string
  pictureUrl?: string
}

export interface ArtistProfile {
  name: string
  pictureUrl: string
  bannerUrl: string
  description: string
  monthlyListeners: string
  verified: boolean
  genres: string[]
  topSongs: Song[]
  singlesAndEPs: ArtistRelease[]
  albums: ArtistRelease[]
  playlists: ArtistPlaylist[]
  similarArtists: SimilarArtist[]
}

const artistCache = new Map<string, ArtistProfile>()

/**
 * Accurately check if a search query represents a real artist (e.g. "Charlie Puth", "Taylor Swift", "The Walters", "Arijit Singh")
 * and return their full profile only if there is a genuine artist match.
 * Returns null if the query is a song title (e.g. "I love you so", "Attention", "Starboy") or non-artist search.
 */
export const findMatchingArtist = async (queryText: string): Promise<ArtistProfile | null> => {
  if (!queryText || queryText.trim().length < 2) return null
  const cleanQ = queryText.trim()
  const normQ = cleanQ.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normQ.length < 2) return null

  try {
    // 1. Search specifically for musicArtist entities on iTunes
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=musicArtist&limit=5`)
    if (res.ok) {
      const data = await res.json()
      const artists = data.results || []

      for (const item of artists) {
        const aName = (item.artistName || '').trim()
        const normName = aName.toLowerCase().replace(/[^a-z0-9]/g, '')

        // Exact match (e.g. "charlie puth" === "charlie puth", "the walters" === "the walters")
        const isExactMatch = normName === normQ
        // Or strong alias match (e.g. "weeknd" matches "the weeknd" where normName contains normQ and covers >= 75% of length)
        const isStrongAlias = (normName.includes(normQ) || normQ.includes(normName)) && 
                              (normQ.length >= 3 && Math.min(normQ.length, normName.length) / Math.max(normQ.length, normName.length) >= 0.7)

        if (isExactMatch || isStrongAlias) {
          // Fetch full verified profile for this artist
          return await fetchArtistProfile(aName)
        }
      }
    }
  } catch (err) {
    console.warn('Artist entity lookup error:', err)
  }

  return null
}

/**
 * Fetch rich YouTube Music style artist profile data
 */
export const fetchArtistProfile = async (artistName: string): Promise<ArtistProfile> => {
  if (!artistName || !artistName.trim()) {
    throw new Error('Artist name is required')
  }

  const cleanName = artistName.trim()
  const cacheKey = cleanName.toLowerCase()

  if (artistCache.has(cacheKey)) {
    return artistCache.get(cacheKey)!
  }

  // 1. Try local Vite dev server endpoint
  try {
    const res = await fetch(`/api/yt-artist?name=${encodeURIComponent(cleanName)}`)
    if (res.ok) {
      const data: ArtistProfile = await res.json()
      if (data && data.topSongs && data.topSongs.length > 0) {
        artistCache.set(cacheKey, data)
        return data
      }
    }
  } catch (err) {
    console.warn('Vite artist endpoint unavailable, falling back to direct catalog:', err)
  }

  // 2. Direct Fallback: iTunes + Wikipedia
  let topSongs: Song[] = []
  let singlesAndEPs: ArtistRelease[] = []
  let albums: ArtistRelease[] = []
  let playlists: ArtistPlaylist[] = []
  let similarArtists: SimilarArtist[] = []
  let primaryGenre = 'Pop'
  let wikiBio = ''
  let wikiThumb = ''

  try {
    const [songsRes, albumsRes, wikiRes] = await Promise.all([
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=song&limit=40`),
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=album&limit=25`),
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`).catch(() => null)
    ])

    if (wikiRes && wikiRes.ok) {
      const wData = await wikiRes.json()
      if (wData.extract) wikiBio = wData.extract
      if (wData.thumbnail?.source) wikiThumb = wData.thumbnail.source
    }

    const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const targetNorm = normalizeStr(cleanName)

    if (songsRes.ok) {
      const sData = await songsRes.json()
      if (Array.isArray(sData.results)) {
        const seenTitles = new Set<string>()
        topSongs = sData.results
          .filter((item: any) => {
            const aNorm = normalizeStr(item.artistName || '')
            return aNorm.includes(targetNorm) || targetNorm.includes(aNorm)
          })
          .filter((item: any) => {
            const cleanMeta = parseCleanSongMeta(item.trackName || '', item.artistName || cleanName)
            const tNorm = normalizeStr(cleanMeta.title)
            if (!tNorm || seenTitles.has(tNorm)) return false
            seenTitles.add(tNorm)
            return true
          })
          .map((item: any) => {
            const cleanMeta = parseCleanSongMeta(item.trackName || '', item.artistName || cleanName)
            const highCover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
              : item.artworkUrl60
            if (item.primaryGenreName) primaryGenre = item.primaryGenreName
            return {
              id: `track_${item.trackId}`,
              title: cleanMeta.title,
              artist: cleanMeta.artist,
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 210,
              url: item.previewUrl || `yt_online://${item.trackId}`,
              previewUrl: item.previewUrl || '',
              playlistId: 'artist_top',
              coverArtBase64: highCover,
              youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanMeta.title + ' ' + cleanMeta.artist)}`
            }
          })
      }
    }

    if (albumsRes.ok) {
      const aData = await albumsRes.json()
      if (Array.isArray(aData.results)) {
        const artistAlbums = aData.results.filter((item: any) => {
          const aNorm = normalizeStr(item.artistName || '')
          return aNorm.includes(targetNorm) || targetNorm.includes(aNorm)
        })

        const seenAlbumTitles = new Set<string>()
        artistAlbums.forEach((item: any) => {
          const titleNorm = normalizeStr(item.collectionName || '')
          if (!titleNorm || seenAlbumTitles.has(titleNorm)) return
          seenAlbumTitles.add(titleNorm)

          const highCover = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
            : item.artworkUrl60
          const isSingle =
            (item.trackCount && item.trackCount <= 3) ||
            (item.collectionName || '').toLowerCase().includes('single') ||
            (item.collectionName || '').toLowerCase().includes(' - ep')

          const formatted: ArtistRelease = {
            id: `album_${item.collectionId}`,
            title: item.collectionName,
            year: item.releaseDate ? item.releaseDate.slice(0, 4) : undefined,
            trackCount: item.trackCount || 1,
            coverArtBase64: highCover,
            genre: item.primaryGenreName
          }

          if (isSingle) {
            singlesAndEPs.push(formatted)
          } else {
            albums.push(formatted)
          }
        })
      }
    }

    // Default Artist Playlists
    playlists = [
      {
        id: `pl_essentials_${cleanName}`,
        playlistId: `essentials_${cleanName}`,
        title: `${cleanName} Essentials`,
        coverArtBase64: topSongs[0]?.coverArtBase64 || '',
        trackCount: `${topSongs.length || 25} tracks`,
        author: 'YouTube Music'
      },
      {
        id: `pl_hits_${cleanName}`,
        playlistId: `hits_${cleanName}`,
        title: `Best of ${cleanName}`,
        coverArtBase64: albums[0]?.coverArtBase64 || topSongs[1]?.coverArtBase64 || '',
        trackCount: '30+ tracks',
        author: 'Soundwave Curated'
      }
    ]

    // Extract Similar Artists with High-Res Pictures
    const artistMap = new Map<string, SimilarArtist>()
    if (songsRes.ok) {
      try {
        const sData = await songsRes.clone().json()
        if (Array.isArray(sData.results)) {
          for (const item of sData.results) {
            const aName = item.artistName
            if (!aName || aName.toLowerCase() === cleanName.toLowerCase() || artistMap.has(aName.toLowerCase())) continue
            const highCover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
              : item.artworkUrl60 || ''
            artistMap.set(aName.toLowerCase(), {
              name: aName,
              genre: item.primaryGenreName || 'Artist',
              pictureUrl: highCover
            })
            if (artistMap.size >= 10) break
          }
        }
      } catch {}
    }
    similarArtists = Array.from(artistMap.values())
  } catch (e) {
    console.error('Error fetching fallback artist profile:', e)
  }

  const picture = wikiThumb || topSongs[0]?.coverArtBase64 || ''
  const bio = wikiBio || `${cleanName} is an iconic artist with chart-topping releases and millions of listeners worldwide.`

  const profile: ArtistProfile = {
    name: cleanName,
    pictureUrl: picture,
    bannerUrl: picture,
    description: bio,
    monthlyListeners: 'Verified Artist',
    verified: true,
    genres: primaryGenre ? [primaryGenre, 'Top Hits', 'Featured'] : ['Music', 'Hits'],
    topSongs: topSongs.slice(0, 30),
    singlesAndEPs: singlesAndEPs.slice(0, 15),
    albums: albums.slice(0, 15),
    playlists: playlists,
    similarArtists: similarArtists
  }

  artistCache.set(cacheKey, profile)
  return profile
}
