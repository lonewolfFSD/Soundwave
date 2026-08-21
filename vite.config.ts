import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { VitePWA } from 'vite-plugin-pwa'

import { execFile } from 'child_process'

import icon_one from './src/images/rounded.png';
import icon_two from './src/images/rounded.png';

const streamUrlCache = new Map<string, { url: string; timestamp: number }>()

function resolveStreamUrlWithYtDlp(videoId: string, quality: 'best' | 'standard' = 'best'): Promise<string> {
  const cacheKey = `${videoId}_${quality}`
  const cached = streamUrlCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return Promise.resolve(cached.url)
  }

  const formatArgs = quality === 'standard'
    ? 'ba[abr<=128][ext=m4a]/ba[abr<=128]/ba[ext=m4a]/ba/b'
    : 'ba[ext=m4a][abr>=160]/ba[abr>=160]/ba[ext=m4a]/ba/b'

  return new Promise((resolve) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    execFile('python', [
      '-m', 'yt_dlp',
      '-g',
      '-f', formatArgs,
      '--extractor-args', 'youtube:player_client=android',
      '--no-warnings',
      url
    ], { timeout: 15000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve('')
      }
      const lines = stdout.trim().split('\n').filter(Boolean)
      const directUrl = lines[lines.length - 1]?.trim() || ''
      if (directUrl.startsWith('http')) {
        streamUrlCache.set(cacheKey, { url: directUrl, timestamp: Date.now() })
        resolve(directUrl)
      } else {
        resolve('')
      }
    })
  })
}

function youtubeMusicPlugin() {
  return {
    name: 'youtube-music-server-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/yt-suggest', async (req: any, res: any) => {
        try {
          const urlObj = new URL(req.url, 'http://localhost:5173')
          const query = urlObj.searchParams.get('q') || ''
          if (!query.trim()) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify([]))
            return
          }

          const gRes = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`)
          if (gRes.ok) {
            const data = await gRes.json()
            const suggestions = Array.isArray(data[1]) ? data[1] : []
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(suggestions.slice(0, 8)))
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify([]))
        } catch {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify([]))
        }
      })

      
      server.middlewares.use('/api/yt-upnext', async (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const urlObj = new URL(req.url, 'http://localhost:5173')
          const videoId = (urlObj.searchParams.get('id') || '').trim()
          if (!videoId) {
            res.end(JSON.stringify([]))
            return
          }

          let songs: any[] = []

          try {
            const innertubeRes = await fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: 'WEB_REMIX',
                    clientVersion: '1.20230522.01.00',
                    hl: 'en',
                    gl: 'US'
                  }
                },
                videoId: videoId,
                playlistId: 'RDAMVM' + videoId
              }),
              signal: AbortSignal.timeout(15000)
            })

            if (innertubeRes.ok) {
              const data = await innertubeRes.json()
              const contents = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
              
              if (Array.isArray(contents)) {
                for (const item of contents) {
                  const track = item.playlistPanelVideoRenderer;
                  if (track && track.videoId) {
                    const vId = track.videoId;
                    if (vId === videoId) continue;

                    const title = track.title?.runs?.[0]?.text || 'Unknown Title';
                    const artist = track.longBylineText?.runs?.[0]?.text || track.shortBylineText?.runs?.[0]?.text || 'Unknown Artist';
                    const durationText = track.lengthText?.runs?.[0]?.text || '3:30';
                    const parts = durationText.split(':').map((p: string) => parseInt(p, 10));
                    const durationSecs = parts.length === 3 ? parts[0]*3600 + parts[1]*60 + parts[2] : (parts.length === 2 ? parts[0]*60 + parts[1] : 210);
                    
                    let thumbnail = track.thumbnail?.thumbnails?.[track.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                    if (thumbnail.includes('w120')) thumbnail = thumbnail.replace('w120-h120', 'w600-h600');

                    songs.push({
                      id: `yt_${vId}`,
                      title,
                      artist,
                      duration: durationSecs,
                      url: `https://www.youtube.com/watch?v=${vId}`,
                      playlistId: 'radio_mix',
                      coverArtBase64: thumbnail,
                      youtubeUrl: `https://www.youtube.com/watch?v=${vId}`
                    })
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Innertube upnext error:', err)
          }

          res.end(JSON.stringify(songs.slice(0, 25)))
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/yt-search', async (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const urlObj = new URL(req.url, 'http://localhost:5173')
          const query = (urlObj.searchParams.get('q') || '').trim()
          if (!query) {
            res.end(JSON.stringify([]))
            return
          }

          const isNonMusicJunk = (title: string, artist: string, durationSecs: number) => {
            const text = `${title} ${artist}`.toLowerCase()
            
            // 1. Blacklist full playlists, compilation mixes, greatest hits albums, DJ mixes
            const playlistOrCompilationRegex = /\b(playlist|songs playlist|greatest hits|full album|best of|top \d+ songs|all songs|billboard hot 100|nonstop|non stop|dj mix|mega mix|party mix|lofi mix|chill mix|mix \d+|1 hour|2 hours|3 hours|10 hours|soundtrack full|ost full|discography|anthology|music mix|mashup collection|album #\d+)\b/i
            if (playlistOrCompilationRegex.test(text)) return true

            // 2. Non-music keywords blacklist (tutorials, origami instructions, sleep sounds, docs, etc.)
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

          let songs: any[] = []
          const seenIds = new Set<string>()

          // 1. Primary Strategy: YouTube Music Innertube Search (WEB_REMIX - Pure Music Catalog)
          try {
            const ytmRes = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Origin': 'https://music.youtube.com',
                'Referer': 'https://music.youtube.com/'
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: 'WEB_REMIX',
                    clientVersion: '1.20240101.01.00',
                    hl: 'en',
                    gl: 'US'
                  }
                },
                query: query,
                params: 'Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D'
              }),
              signal: AbortSignal.timeout(6000)
            })

            if (ytmRes.ok) {
              const data = await ytmRes.json()
              const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                               data?.contents?.sectionListRenderer?.contents || []

              for (const sec of sections) {
                const shelf = sec.musicShelfRenderer || sec.musicCardShelfRenderer
                const items = shelf?.contents || []
                for (const item of items) {
                  const r = item.musicResponsiveListItemRenderer
                  if (!r) continue

                  const flex0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs
                  const flex1 = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs

                  const title = flex0?.[0]?.text || ''
                  let artist = flex1?.[0]?.text || 'YouTube Music'
                  if (artist.toLowerCase() === 'song' || artist.toLowerCase() === 'video') {
                    artist = flex1?.[2]?.text || flex1?.[1]?.text || 'YouTube Music'
                  }

                  let durationSecs = 210
                  if (Array.isArray(flex1)) {
                    for (const run of flex1) {
                      if (/^\d+:\d+(:\d+)?$/.test(run?.text || '')) {
                        const parts = run.text.split(':').map((p: string) => parseInt(p, 10))
                        durationSecs = parts.length === 3 ? parts[0]*3600 + parts[1]*60 + parts[2] : (parts.length === 2 ? parts[0]*60 + parts[1] : 210)
                        break
                      }
                    }
                  }

                  const videoId = r.playlistItemData?.videoId ||
                                  r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                                  flex0?.[0]?.navigationEndpoint?.watchEndpoint?.videoId

                  if (videoId && title && !seenIds.has(videoId)) {
                    if (!isNonMusicJunk(title, artist, durationSecs)) {
                      seenIds.add(videoId)
                      const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
                      const thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

                      songs.push({
                        id: `yt_${videoId}`,
                        title,
                        artist,
                        duration: durationSecs,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        playlistId: 'online_search',
                        coverArtBase64: thumbnail,
                        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
                      })
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn('YouTube Music Innertube dev search error:', err)
          }

          // 2. Secondary Strategy: Standard YouTube API with strict music filters
          if (songs.length < 5) {
            try {
              const musicQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('music')
                ? query
                : `${query} music song`

              const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                },
                body: JSON.stringify({
                  context: {
                    client: {
                      clientName: 'WEB',
                      clientVersion: '2.20240101.00.00',
                      hl: 'en',
                      gl: 'US'
                    }
                  },
                  query: musicQuery,
                  params: 'EgIQAQ%3D%3D'
                }),
                signal: AbortSignal.timeout(5000)
              })

              if (innertubeRes.ok) {
                const data = await innertubeRes.json()
                const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents
                if (Array.isArray(contents)) {
                  for (const item of contents) {
                    const v = item.videoRenderer
                    if (v && v.videoId && v.title?.runs?.[0]?.text) {
                      const videoId = v.videoId
                      if (seenIds.has(videoId)) continue

                      const title = v.title.runs[0].text
                      const artist = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'YouTube Music'
                      const durationText = v.lengthText?.simpleText || '3:30'
                      const parts = durationText.split(':').map((p: string) => parseInt(p, 10))
                      const durationSecs = parts.length === 3 ? parts[0]*3600 + parts[1]*60 + parts[2] : (parts.length === 2 ? parts[0]*60 + parts[1] : 210)

                      if (!isNonMusicJunk(title, artist, durationSecs)) {
                        seenIds.add(videoId)
                        const thumbnail = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

                        songs.push({
                          id: `yt_${videoId}`,
                          title,
                          artist,
                          duration: durationSecs,
                          url: `https://www.youtube.com/watch?v=${videoId}`,
                          playlistId: 'online_search',
                          coverArtBase64: thumbnail,
                          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
                        })
                      }
                    }
                  }
                }
              }
            } catch {}
          }

          res.end(JSON.stringify(songs.slice(0, 30)))
        } catch {
          res.end(JSON.stringify([]))
        }
      })

      server.middlewares.use('/api/yt-artist', async (req: any, res: any) => {
        try {
          const urlObj = new URL(req.url, 'http://localhost:5173')
          const name = urlObj.searchParams.get('name') || ''
          if (!name.trim()) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Missing name param' }))
            return
          }

          const cleanName = name.trim()
          let avatarUrl = ''
          let monthlyListeners = ''
          let channelBio = ''
          let isVerified = false

          try {
            const ytChannelUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanName)}&sp=EgIQAg%253D%253D`
            const ytRes = await fetch(ytChannelUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            })
            if (ytRes.ok) {
              const html = await ytRes.text()
              const jsonMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                                html.match(/ytInitialData\s*=\s*({.+?});/s)
              if (jsonMatch && jsonMatch[1]) {
                const ytData = JSON.parse(jsonMatch[1])
                const channelRenderer = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.channelRenderer
                if (channelRenderer) {
                  const thumbs = channelRenderer.thumbnail?.thumbnails
                  if (Array.isArray(thumbs) && thumbs.length > 0) {
                    avatarUrl = thumbs[thumbs.length - 1]?.url
                    if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl
                  }
                  monthlyListeners = channelRenderer.videoCountText?.simpleText ||
                                     channelRenderer.subscriberCountText?.simpleText || ''
                  channelBio = channelRenderer.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || ''
                  isVerified = Array.isArray(channelRenderer.ownerBadges) && channelRenderer.ownerBadges.length > 0
                }
              }
            }
          } catch {}

          // 2. Fetch Wikipedia Bio & Image fallback
          let wikiBio = ''
          let wikiThumb = ''
          try {
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`)
            if (wikiRes.ok) {
              const wData = await wikiRes.json()
              if (wData.extract) wikiBio = wData.extract
              if (wData.thumbnail?.source) wikiThumb = wData.thumbnail.source
            }
          } catch {}

          // 3. Fetch iTunes Songs & Albums Catalog
          let topSongs: any[] = []
          let singlesAndEPs: any[] = []
          let albums: any[] = []
          let primaryGenre = ''

          try {
            const [songsRes, albumsRes] = await Promise.all([
              fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=song&limit=40`),
              fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=album&limit=25`)
            ])

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
                    const tNorm = normalizeStr(item.trackName || '')
                    if (!tNorm || seenTitles.has(tNorm)) return false
                    seenTitles.add(tNorm)
                    return true
                  })
                  .map((item: any) => {
                    const highCover = item.artworkUrl100
                      ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
                      : item.artworkUrl60
                    if (!primaryGenre && item.primaryGenreName) primaryGenre = item.primaryGenreName
                    return {
                      id: `track_${item.trackId}`,
                      title: item.trackName,
                      artist: item.artistName || cleanName,
                      duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 210,
                      url: `yt_online://${item.trackId}`,
                      playlistId: 'artist_top',
                      coverArtBase64: highCover,
                      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || cleanName))}`
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
                  const isSingle = (item.trackCount && item.trackCount <= 3) || (item.collectionName || '').toLowerCase().includes('single') || (item.collectionName || '').toLowerCase().includes(' - ep')
                  const formatted = {
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
          } catch {}

          // 4. Fetch YouTube Playlists for the Artist
          let playlists: any[] = []
          try {
            const ytPlaylistUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanName + ' playlist')}&sp=EgIQAw%253D%253D`
            const plRes = await fetch(ytPlaylistUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            })
            if (plRes.ok) {
              const html = await plRes.text()
              const jsonMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                                html.match(/ytInitialData\s*=\s*({.+?});/s)
              if (jsonMatch && jsonMatch[1]) {
                const plData = JSON.parse(jsonMatch[1])
                const contents = plData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents
                if (Array.isArray(contents)) {
                  for (const item of contents) {
                    const p = item.playlistRenderer
                    if (p && p.playlistId && p.title) {
                      const title = p.title.simpleText || p.title.runs?.[0]?.text || 'Playlist'
                      const thumb = p.thumbnails?.[0]?.thumbnails?.[p.thumbnails[0].thumbnails.length - 1]?.url ||
                                    p.thumbnails?.[0]?.thumbnails?.[0]?.url || ''
                      const countText = p.videoCount || '20+ tracks'
                      const author = p.shortBylineText?.runs?.[0]?.text || 'YouTube Music'

                      playlists.push({
                        id: `yt_pl_${p.playlistId}`,
                        playlistId: p.playlistId,
                        title,
                        coverArtBase64: thumb,
                        trackCount: countText,
                        author
                      })
                    }
                  }
                }
              }
            }
          } catch {}

          // 5. Fetch Similar Artists with High-Res Pictures
          let similarArtists: any[] = []
          try {
            const searchTerm = primaryGenre || cleanName
            const simRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=40`)
            if (simRes.ok) {
              const sData = await simRes.json()
              if (Array.isArray(sData.results)) {
                const artistMap = new Map<string, { name: string; genre: string; pictureUrl: string }>()
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
                similarArtists = Array.from(artistMap.values())
              }
            }
          } catch {}

          const picture = avatarUrl || wikiThumb || (topSongs[0]?.coverArtBase64) || ''
          const bio = wikiBio || channelBio || `${cleanName} is a popular artist with music streaming on Soundwave.`

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            name: cleanName,
            pictureUrl: picture,
            bannerUrl: picture,
            description: bio,
            monthlyListeners: monthlyListeners ? `${monthlyListeners} • Verified Artist` : '8.5M monthly listeners',
            verified: isVerified || true,
            genres: primaryGenre ? [primaryGenre, 'Top Hits'] : ['Music', 'Hits'],
            topSongs: topSongs.slice(0, 30),
            singlesAndEPs: singlesAndEPs.slice(0, 15),
            albums: albums.slice(0, 15),
            playlists: playlists.slice(0, 15),
            similarArtists: similarArtists
          }))
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/yt-trending', async (req: any, res: any) => {
        try {
          const resItunes = await fetch('https://itunes.apple.com/us/rss/topsongs/limit=50/json')
          if (resItunes.ok) {
            const data = await resItunes.json()
            const entries = data.feed?.entry || []
            const songs = entries.map((entry: any) => {
              const title = entry['im:name']?.label || 'Top Hit'
              const artist = entry['im:artist']?.label || 'Top Artist'
              const rawCover = entry['im:image']?.[2]?.label || entry['im:image']?.[0]?.label
              const cover = rawCover ? rawCover.replace(/170x170bb/g, '600x600bb') : ''
              const trackId = entry.id?.attributes?.['im:id'] || Math.random().toString(36).slice(2, 9)

              return {
                id: `top_${trackId}`,
                title,
                artist,
                duration: 210,
                url: `yt_online://${trackId}`,
                playlistId: 'trending',
                coverArtBase64: cover,
                youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`
              }
            })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(songs))
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify([]))
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/yt-stream', async (req: any, res: any) => {
        try {
          const urlObj = new URL(req.url, 'http://localhost:5173')
          const videoId = urlObj.searchParams.get('id') || ''
          const quality = (urlObj.searchParams.get('quality') as 'best' | 'standard') || 'best'
          if (!videoId) {
            res.statusCode = 400
            res.end('Missing videoId')
            return
          }

          const streamUrl = await resolveStreamUrlWithYtDlp(videoId, quality)
          if (streamUrl) {
            const audioHeaders: Record<string, string> = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            if (req.headers.range) {
              audioHeaders['Range'] = req.headers.range
            }

            const audioRes = await fetch(streamUrl, { headers: audioHeaders })
            if (audioRes.ok || audioRes.status === 206) {
              const headers: Record<string, string> = {
                'Content-Type': audioRes.headers.get('content-type') || 'audio/mp4',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*'
              }

              const cl = audioRes.headers.get('content-length')
              if (cl) headers['Content-Length'] = cl
              const cr = audioRes.headers.get('content-range')
              if (cr) headers['Content-Range'] = cr

              res.writeHead(audioRes.status || 200, headers)
              if (audioRes.body) {
                const { Readable } = await import('stream')
                Readable.fromWeb(audioRes.body as any).pipe(res)
                return
              }
            }
          }

          // Fallback direct spawn stdout piping
          const url = `https://www.youtube.com/watch?v=${videoId}`
          const { spawn } = require('child_process')
          const formatArgs = quality === 'standard'
            ? 'ba[abr<=128][ext=m4a]/ba[abr<=128]/ba[ext=m4a]/ba/b'
            : 'ba[ext=m4a][abr>=160]/ba[abr>=160]/ba[ext=m4a]/ba/b'
          const proc = spawn('python', [
            '-m', 'yt_dlp',
            '-o', '-',
            '-f', formatArgs,
            '--extractor-args', 'youtube:player_client=android',
            '--no-warnings',
            '--no-playlist',
            url
          ])

          res.writeHead(200, {
            'Content-Type': 'audio/mp4',
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          })

          proc.stdout.pipe(res)

          req.on('close', () => {
            try { proc.kill() } catch {}
          })

          proc.on('error', (err: any) => {
            console.error('yt-dlp error:', err)
            if (!res.headersSent) {
              res.statusCode = 500
              res.end('Streaming error')
            }
          })
        } catch (e: any) {
          res.statusCode = 500
          res.end(e.message)
        }
      })
    }
  }
}

export default defineConfig({
  base: "./",
    plugins: [react(), youtubeMusicPlugin(), VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    },
    manifest: {
      name: 'Soundwave',
      short_name: 'Soundwave',
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        { src: icon_one, sizes: '192x192', type: 'image/png' },
        { src: icon_two, sizes: '512x512', type: 'image/png' }
      ]
    }
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/piped-api': {
        target: 'https://pa.il.ax',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/piped-api/, ''),
      },
      '/invidious-api': {
        target: 'https://inv.nadeko.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/invidious-api/, ''),
      },
      '/cobalt-api': {
        target: 'https://cobalt-api.kwiatekm.tokyo',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/cobalt-api/, ''),
      }
    }
  },
})
