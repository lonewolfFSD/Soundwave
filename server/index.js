import http from 'http'
import url from 'url'
import { fileURLToPath } from 'url'
import path from 'path'
import firebaseAdmin from './firebaseAdmin.js'
import { createAuthHandler, createPlaylistHandler, createSongHandler } from './handlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3001

// Parse query string and request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
  })
}

// CORS middleware
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// Request handler
const server = http.createServer(async (req, res) => {
  setCORS(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname
  const query = parsedUrl.query

  // Health check
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  // Auth endpoints
  if (pathname.startsWith('/api/auth')) {
    try {
      const body = await parseBody(req)
      const handler = createAuthHandler()
      const response = await handler(req.method, pathname, body)
      res.writeHead(response.status || 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response.data || response))
    } catch (error) {
      console.error('Auth error:', error)
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: error.message }))
    }
    return
  }

  // Verify token for protected routes
  const token = req.headers.authorization?.split('Bearer ')[1]
  let uid
  try {
    if (token) {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token)
      uid = decodedToken.uid
    }
  } catch (error) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Unauthorized' }))
    return
  }

  // Playlists endpoints
  if (pathname.startsWith('/api/playlists')) {
    try {
      const body = req.method !== 'GET' ? await parseBody(req) : {}
      const handler = createPlaylistHandler()
      const response = await handler(req.method, pathname, body, uid)
      res.writeHead(response.status || 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response.data || response))
    } catch (error) {
      console.error('Playlist error:', error)
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: error.message }))
    }
    return
  }

  // Songs endpoints
  if (pathname.startsWith('/api/songs')) {
    try {
      const body = req.method !== 'GET' ? await parseBody(req) : {}
      const handler = createSongHandler()
      const response = await handler(req.method, pathname, body, uid)
      res.writeHead(response.status || 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response.data || response))
    } catch (error) {
      console.error('Song error:', error)
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: error.message }))
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`Music Player API running on http://localhost:${PORT}`)
})
