import firebaseAdmin from './firebaseAdmin.js'

const db = firebaseAdmin.firestore()

// Auth Handler
export function createAuthHandler() {
  return async (method, pathname, body) => {
    if (method !== 'POST') {
      throw { status: 405, message: 'Method not allowed' }
    }

    if (pathname === '/api/auth/verify') {
      // Verify token endpoint (optional, Firebase already handles this on client)
      return { status: 200, data: { verified: true } }
    }

    throw { status: 404, message: 'Auth endpoint not found' }
  }
}

// Playlist Handler
export function createPlaylistHandler() {
  return async (method, pathname, body, uid) => {
    if (!uid) {
      throw { status: 401, message: 'Unauthorized' }
    }

    // GET /api/playlists
    if (method === 'GET' && pathname === '/api/playlists') {
      const snapshot = await db
        .collection('playlists')
        .where('userId', '==', uid)
        .get()

      const playlists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      return { status: 200, data: playlists }
    }

    // POST /api/playlists
    if (method === 'POST' && pathname === '/api/playlists') {
      const playlistRef = await db.collection('playlists').add({
        userId: uid,
        name: body.name || 'New Playlist',
        songCount: 0,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      })

      return {
        status: 201,
        data: {
          id: playlistRef.id,
          userId: uid,
          name: body.name,
          songCount: 0,
        },
      }
    }

    // GET /api/playlists/:id
    if (method === 'GET' && pathname.startsWith('/api/playlists/')) {
      const id = pathname.split('/')[3]
      const doc = await db.collection('playlists').doc(id).get()

      if (!doc.exists || doc.data().userId !== uid) {
        throw { status: 404, message: 'Playlist not found' }
      }

      return { status: 200, data: { id: doc.id, ...doc.data() } }
    }

    // DELETE /api/playlists/:id
    if (method === 'DELETE' && pathname.startsWith('/api/playlists/')) {
      const id = pathname.split('/')[3]
      const doc = await db.collection('playlists').doc(id).get()

      if (!doc.exists || doc.data().userId !== uid) {
        throw { status: 404, message: 'Playlist not found' }
      }

      await db.collection('playlists').doc(id).delete()
      return { status: 200, data: { message: 'Playlist deleted' } }
    }

    throw { status: 404, message: 'Endpoint not found' }
  }
}

// Song Handler
export function createSongHandler() {
  return async (method, pathname, body, uid) => {
    if (!uid) {
      throw { status: 401, message: 'Unauthorized' }
    }

    // GET /api/songs/:playlistId
    if (method === 'GET' && pathname.startsWith('/api/songs/')) {
      const playlistId = pathname.split('/')[3]

      // Verify user owns this playlist
      const playlistDoc = await db.collection('playlists').doc(playlistId).get()
      if (!playlistDoc.exists || playlistDoc.data().userId !== uid) {
        throw { status: 404, message: 'Playlist not found' }
      }

      const snapshot = await db
        .collection('playlists')
        .doc(playlistId)
        .collection('songs')
        .get()

      const songs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      return { status: 200, data: songs }
    }

    // POST /api/songs/:playlistId
    if (method === 'POST' && pathname.startsWith('/api/songs/')) {
      const playlistId = pathname.split('/')[3]

      // Verify user owns this playlist
      const playlistDoc = await db.collection('playlists').doc(playlistId).get()
      if (!playlistDoc.exists || playlistDoc.data().userId !== uid) {
        throw { status: 404, message: 'Playlist not found' }
      }

      const songRef = await db
        .collection('playlists')
        .doc(playlistId)
        .collection('songs')
        .add({
          title: body.title || 'Unknown',
          artist: body.artist || 'Unknown Artist',
          duration: body.duration || 0,
          url: body.url || '',
          addedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        })

      // Update song count
      const playlistData = playlistDoc.data()
      await db
        .collection('playlists')
        .doc(playlistId)
        .update({ songCount: (playlistData.songCount || 0) + 1 })

      return {
        status: 201,
        data: {
          id: songRef.id,
          title: body.title,
          artist: body.artist,
        },
      }
    }

    // DELETE /api/songs/:playlistId/:songId
    if (method === 'DELETE' && pathname.match(/\/api\/songs\/[^/]+\/[^/]+/)) {
      const parts = pathname.split('/')
      const playlistId = parts[3]
      const songId = parts[4]

      // Verify user owns this playlist
      const playlistDoc = await db.collection('playlists').doc(playlistId).get()
      if (!playlistDoc.exists || playlistDoc.data().userId !== uid) {
        throw { status: 404, message: 'Playlist not found' }
      }

      const songDoc = await db
        .collection('playlists')
        .doc(playlistId)
        .collection('songs')
        .doc(songId)
        .get()

      if (!songDoc.exists) {
        throw { status: 404, message: 'Song not found' }
      }

      // Delete song
      await db
        .collection('playlists')
        .doc(playlistId)
        .collection('songs')
        .doc(songId)
        .delete()

      // Update song count
      const playlistData = playlistDoc.data()
      await db
        .collection('playlists')
        .doc(playlistId)
        .update({ songCount: Math.max(0, (playlistData.songCount || 1) - 1) })

      return { status: 200, data: { message: 'Song deleted' } }
    }

    throw { status: 404, message: 'Endpoint not found' }
  }
}
