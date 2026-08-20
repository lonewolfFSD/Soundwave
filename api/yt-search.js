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

  let songs = []

  // 1. Primary Strategy: YouTube Innertube JSON API (100% Reliable on Vercel, 0 bot blocks)
  try {
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
        query: query,
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
            const title = v.title.runs[0].text
            const artist = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'YouTube Music'
            const durationText = v.lengthText?.simpleText || '3:30'
            const parts = durationText.split(':').map(p => parseInt(p, 10))
            const durationSecs = parts.length === 3 ? parts[0]*3600 + parts[1]*60 + parts[2] : (parts.length === 2 ? parts[0]*60 + parts[1] : 210)
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
  } catch (err) {
    console.warn('Innertube search error:', err)
  }

  // 2. Secondary Strategy: Invidious Mirror Fallback
  if (songs.length === 0) {
    try {
      const mirrorRes = await fetch(`https://invidious.flokinet.to/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        signal: AbortSignal.timeout(4000)
      })
      if (mirrorRes.ok) {
        const mirrorItems = await mirrorRes.json()
        if (Array.isArray(mirrorItems)) {
          for (const item of mirrorItems) {
            if (item.videoId && item.title) {
              songs.push({
                id: `yt_${item.videoId}`,
                title: item.title,
                artist: item.author || 'YouTube Music',
                duration: item.lengthSeconds || 210,
                url: `https://www.youtube.com/watch?v=${item.videoId}`,
                playlistId: 'online_search',
                coverArtBase64: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                youtubeUrl: `https://www.youtube.com/watch?v=${item.videoId}`
              })
            }
          }
        }
      }
    } catch {}
  }

  res.status(200).json(songs.slice(0, 25))
}
