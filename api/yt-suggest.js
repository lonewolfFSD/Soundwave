export default async function handler(req, res) {
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
    const gRes = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`)
    if (gRes.ok) {
      const data = await gRes.json()
      const suggestions = Array.isArray(data[1]) ? data[1] : []
      res.status(200).json(suggestions.slice(0, 8))
      return
    }
    res.status(200).json([])
  } catch {
    res.status(200).json([])
  }
}
