export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const query = req.query?.q || (new URL(req.url, 'http://localhost')).searchParams.get('q') || ''
  if (!query || !query.trim()) {
    res.status(200).json([])
    return
  }

  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}&sp=EgIQAQ%253D%253D`
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    const html = await response.text()
    const jsonMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                      html.match(/ytInitialData\s*=\s*({.+?});/s)

    let songs = []
    if (jsonMatch && jsonMatch[1]) {
      try {
        const data = JSON.parse(jsonMatch[1])
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
                url: `/api/yt-stream?id=${videoId}`,
                playlistId: 'online_search',
                coverArtBase64: thumbnail,
                youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
              })
            }
          }
        }
      } catch (err) {
        console.error('Parse error:', err)
      }
    }

    res.status(200).json(songs.slice(0, 25))
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: error.message })
  }
}
