export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const videoId = (req.query?.id || (new URL(req.url, 'http://localhost')).searchParams.get('id') || '').trim()
  if (!videoId) {
    res.status(200).json([])
    return
  }

  let songs = []

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
      signal: AbortSignal.timeout(5000)
    })

    if (innertubeRes.ok) {
      const data = await innertubeRes.json()
      const contents = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
      
      if (Array.isArray(contents)) {
        for (const item of contents) {
          const track = item.playlistPanelVideoRenderer;
          if (track && track.videoId) {
            const vId = track.videoId;
            if (vId === videoId) continue; // Skip seed

            const title = track.title?.runs?.[0]?.text || 'Unknown Title';
            const artist = track.longBylineText?.runs?.[0]?.text || track.shortBylineText?.runs?.[0]?.text || 'Unknown Artist';
            const durationText = track.lengthText?.runs?.[0]?.text || '3:30';
            const parts = durationText.split(':').map(p => parseInt(p, 10));
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

  res.status(200).json(songs.slice(0, 25))
}
