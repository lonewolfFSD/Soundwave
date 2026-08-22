// ── Direct YouTube Music Audio Stream Resolver ──
// Resolves raw playable audio stream URLs for Media3 / ExoPlayer & HTML5 <audio>

const streamUrlCache = new Map<string, { url: string; timestamp: number }>()

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://vid.puffyan.us',
  'https://invidious.drgns.space'
]

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pa.il.ax',
  'https://pipedapi.tokhmi.xyz'
]

export async function resolvePlayableStreamUrl(
  videoId: string,
  quality: 'best' | 'standard' = 'best'
): Promise<string> {
  if (!videoId) return ''

  const cleanId = videoId.replace('yt_', '').trim()
  if (!cleanId || cleanId.length !== 11) return ''

  const cacheKey = `${cleanId}_${quality}`
  const cached = streamUrlCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 1800000) { // 30 min cache
    return cached.url
  }

  // ── Strategy 1: Invidious Instances (Direct googlevideo audio stream URLs) ──
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`${instance}/api/v1/videos/${cleanId}?fields=adaptiveFormats`, {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const formats: any[] = data.adaptiveFormats || []
        const audioFormats = formats.filter(
          (f: any) => f.type?.startsWith('audio/') || f.mimeType?.startsWith('audio/')
        )

        if (audioFormats.length > 0) {
          // Sort by bitrate
          audioFormats.sort((a: any, b: any) => {
            const brA = parseInt(a.bitrate || '0', 10)
            const brB = parseInt(b.bitrate || '0', 10)
            return quality === 'best' ? brB - brA : brA - brB
          })

          const bestAudio = audioFormats[0]
          if (bestAudio?.url) {
            streamUrlCache.set(cacheKey, { url: bestAudio.url, timestamp: Date.now() })
            return bestAudio.url
          }
        }
      }
    } catch {}
  }

  // ── Strategy 2: Piped Instances ──
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`${instance}/streams/${cleanId}`, {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const audioStreams: any[] = data.audioStreams || []
        if (audioStreams.length > 0) {
          audioStreams.sort((a: any, b: any) => {
            const brA = parseInt(a.bitrate || '0', 10)
            const brB = parseInt(b.bitrate || '0', 10)
            return quality === 'best' ? brB - brA : brA - brB
          })
          const best = audioStreams[0]
          if (best?.url) {
            streamUrlCache.set(cacheKey, { url: best.url, timestamp: Date.now() })
            return best.url
          }
        }
      }
    } catch {}
  }

  // ── Strategy 3: Cobalt Stream API ──
  try {
    const cobaltRes = await fetch('https://cobalt-api.kwiatekm.tokyo', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${cleanId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3'
      })
    })
    if (cobaltRes.ok) {
      const data = await cobaltRes.json()
      if (data.url) {
        streamUrlCache.set(cacheKey, { url: data.url, timestamp: Date.now() })
        return data.url
      }
    }
  } catch {}

  // ── Strategy 4: Local / Hosted Proxy Endpoint ──
  const proxyUrl = `/api/yt-stream?id=${cleanId}&quality=${quality}`
  return proxyUrl
}
