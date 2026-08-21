export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const query = (req.query?.q || (new URL(req.url, 'http://localhost')).searchParams.get('q') || '').trim()
  if (!query) {
    res.status(200).json([])
    return
  }

  const isNonMusicJunk = (title, artist, durationSecs) => {
    const text = `${title} ${artist}`.toLowerCase()
    // Non-music keywords blacklist (tutorials, origami instructions, sleep sounds, docs, etc.)
    const nonMusicRegex = /\b(how to|tutorial|origami|step by step|diy|craft|sound effect|sfx|asmr|sleep sounds|rain sounds|white noise|anxiety control|stress relief sounds|guided meditation|meditation guide|binaural beats for sleep|documentary|podcast|audiobook|lecture|vlog|reaction|gameplay|walkthrough|unboxing|review|lesson|speech|news report)\b/i
    if (nonMusicRegex.test(text)) {
      // Allow if it's explicitly identified as an official song / music track
      const isExplicitSong = /\b(official video|official music video|official audio|audio track|song|lyric video|music video)\b/i.test(text)
      if (!isExplicitSong) return true
    }
    // Filter out 1-hour loops or 15+ minute non-album tracks
    if (durationSecs > 900 || durationSecs < 45) {
      if (!/\b(album|full album|ep|discography)\b/i.test(text)) return true
    }
    return false
  }

  let songs = []
  const seenIds = new Set()

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
        params: 'Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D' // Filter: Songs & Music Videos
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
                const parts = run.text.split(':').map(p => parseInt(p, 10))
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
    console.warn('YouTube Music Innertube search error:', err)
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
          params: 'EgIQAQ%3D%3D' // Filter for video tracks
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
              const parts = durationText.split(':').map(p => parseInt(p, 10))
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
    } catch (err) {
      console.warn('Fallback Innertube search error:', err)
    }
  }

  res.status(200).json(songs.slice(0, 30))
}
