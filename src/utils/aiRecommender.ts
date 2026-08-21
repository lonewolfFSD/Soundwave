// Machine Learning Acoustic & Mood Classifier and Smooth Transition Engine
import type { Song } from '../context/PlayerContext'

export interface MusicCategory {
  id: string
  title: string
  subtitle: string
  iconName: 'coffee' | 'zap' | 'sparkles' | 'flame' | 'music' | 'brain' | 'moon' | 'party' | 'heart'
  searchQuery: string
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    id: 'chill',
    title: 'Chill & Relax',
    subtitle: 'Lo-fi beats, ambient sounds & calm vibes',
    iconName: 'coffee',
    searchQuery: 'chill lofi beats relaxing acoustic songs'
  },
  {
    id: 'workout',
    title: 'Workout & Energy',
    subtitle: 'High BPM, bass-boosted motivation',
    iconName: 'zap',
    searchQuery: 'workout motivation high energy gym songs'
  },
  {
    id: 'pop',
    title: 'Pop Perfection',
    subtitle: 'Global hits, chart-toppers & viral tracks',
    iconName: 'sparkles',
    searchQuery: 'pop hits billboard top songs viral'
  },
  {
    id: 'hiphop',
    title: 'Hip-Hop & R&B',
    subtitle: 'Smooth flows, heavy 808s & soul grooves',
    iconName: 'flame',
    searchQuery: 'hip hop rap r&b top tracks'
  },
  {
    id: 'bollywood',
    title: 'Bollywood & Desi',
    subtitle: 'Catchy melodies, romantic ballads & party anthems',
    iconName: 'music',
    searchQuery: 'bollywood hits latest hindi songs romantic dance'
  },
  {
    id: 'focus',
    title: 'Focus & Deep Work',
    subtitle: 'Instrumental flow, binaural & concentration',
    iconName: 'brain',
    searchQuery: 'deep focus study instrumental concentration music'
  },
  {
    id: 'night',
    title: 'Late Night Drive',
    subtitle: 'Synthwave, dark pop & nocturnal moods',
    iconName: 'moon',
    searchQuery: 'night drive synthwave moody midnight songs'
  },
  {
    id: 'party',
    title: 'Party & EDM Dance',
    subtitle: 'Club anthems, festival drops & dance floor heat',
    iconName: 'party',
    searchQuery: 'party dance club edm festival anthems'
  },
  {
    id: 'romance',
    title: 'Romantic & Love',
    subtitle: 'Heartfelt acoustics, soulmate ballads & sweet vibes',
    iconName: 'heart',
    searchQuery: 'romantic love acoustic sweet love songs'
  }
]

// ── ML MOOD & GENRE EMBEDDING DICTIONARIES ──
const MOOD_LEXICON: Record<string, string[]> = {
  sad: [
    'sad', 'cry', 'crying', 'alone', 'broken', 'heartbreak', 'tears', 'pain', 'goodbye',
    'hurt', 'die', 'dark', 'memories', 'lonely', 'sorrow', 'grief', 'depressed', 'lose',
    'lost', 'acoustic', 'slow', 'deep', 'melancholy', 'nostalgia', 'regret', 'miss you',
    'channa mereya', 'tadap', 'judai', 'bewafa', 'dard', 'someone like you', 'gilded'
  ],
  chill: [
    'chill', 'lofi', 'relax', 'rain', 'coffee', 'calm', 'sleep', 'study', 'ambient',
    'peaceful', 'soft', 'breeze', 'easy', 'lazy', 'smooth', 'cozy', 'acoustic', 'meditate',
    'sunset', 'morning', 'lo-fi', 'instrumental'
  ],
  romantic: [
    'love', 'romantic', 'forever', 'sweet', 'baby', 'heart', 'darling', 'kiss', 'lover',
    'crush', 'beautiful', 'wedding', 'soulmate', 'ishq', 'pyaar', 'mohabbat', 'dil',
    'humsafar', 'tum hi ho', 'perfect', 'fall in love', 'belong with me'
  ],
  pop: [
    'dance', 'pop', 'party', 'club', 'groove', 'fun', 'celebrate', 'vibes', 'star',
    'summer', 'disco', 'bright', 'shine', 'shake', 'hit', 'radio', 'sugar', 'dynamite'
  ],
  hiphop: [
    'rap', 'hip hop', 'trap', 'bars', 'drill', 'freestyle', 'flow', '808', 'beat',
    'rhymes', 'gang', 'flex', 'hood', 'banger', 'drank', 'hustle', 'streets', 'eminem',
    'drake', 'travis', 'future', 'carti', 'kendrick', 'karan aujla', 'sidhu'
  ],
  energetic: [
    'workout', 'gym', 'hype', 'monster', 'power', 'hardstyle', 'phonk', 'bass',
    'boosted', 'energy', 'run', 'speed', 'beast', 'rock', 'metal', 'pump', 'adrenaline'
  ],
  desi: [
    'bollywood', 'hindi', 'punjabi', 'desi', 'arijit', 'atif', 'jubin', 'shreya',
    'neha', 'badshah', 'sidhu', 'ap dhillon', 'diljit', 'bhangra', 'sufi', 'ghazal',
    'pritam', 'ar rahman', 'anirudh'
  ],
  focus: [
    'instrumental', 'piano', 'meditation', 'binaural', 'focus', 'flow', 'zen',
    'classical', 'violin', 'orchestra', 'lo-fi study', 'brainwave'
  ]
}

const MOOD_KEYS = Object.keys(MOOD_LEXICON)

/**
 * Feature Extraction: Extracts an 8-dimensional mood distribution vector from song metadata
 */
export const extractMoodVector = (song: Song): number[] => {
  if (!song) return new Array(MOOD_KEYS.length).fill(0.1)

  const text = `${song.title || ''} ${song.artist || ''} ${song.playlistId || ''}`.toLowerCase()
  const tokens = text.split(/[\s,()\-._/]+/).filter(w => w.length > 1)

  const vector = MOOD_KEYS.map(mood => {
    const keywords = MOOD_LEXICON[mood]
    let matchScore = 0

    // Direct token hits
    for (const token of tokens) {
      if (keywords.includes(token)) matchScore += 1.5
      else if (keywords.some(k => k.includes(token) || token.includes(k))) matchScore += 0.6
    }

    // Artist affinity heuristic
    if (mood === 'desi' && (tokens.includes('arijit') || tokens.includes('singh') || tokens.includes('kumar') || tokens.includes('shreya'))) matchScore += 3.0
    if (mood === 'hiphop' && (tokens.includes('drake') || tokens.includes('travis') || tokens.includes('karan') || tokens.includes('eminem'))) matchScore += 3.0
    if (mood === 'sad' && (tokens.includes('adele') || tokens.includes('lewis') || tokens.includes('billie') || tokens.includes('conan'))) matchScore += 2.5

    return matchScore
  })

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude === 0) return new Array(MOOD_KEYS.length).fill(1 / Math.sqrt(MOOD_KEYS.length))

  return vector.map(v => v / magnitude)
}

/**
 * Cosine Similarity between two N-dimensional mood vectors (Returns -1.0 to 1.0)
 */
export const computeMoodCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    magA += vecA[i] * vecA[i]
    magB += vecB[i] * vecB[i]
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB)
  if (denominator === 0) return 0
  return Math.max(-1, Math.min(1, dotProduct / denominator))
}

/**
 * Transition Continuity Score:
 * Enforces smooth mood/genre transition so a sad song transitions to another sad/acoustic/chill song,
 * preventing abrupt transitions to jarring genres like heavy trap or hip hop.
 */
export const calculateMoodTransitionScore = (currentSong: Song, candidateSong: Song): number => {
  if (!currentSong || !candidateSong) return 0.5
  if (currentSong.id === candidateSong.id) return -1.0 // Avoid repeating current song

  const vecCurrent = extractMoodVector(currentSong)
  const vecCandidate = extractMoodVector(candidateSong)

  const cosineSim = computeMoodCosineSimilarity(vecCurrent, vecCandidate)

  // 1. Artist Continuity Bonus
  let artistBonus = 0.0
  if (currentSong.artist && candidateSong.artist) {
    const artistA = currentSong.artist.toLowerCase()
    const artistB = candidateSong.artist.toLowerCase()
    if (artistA === artistB) artistBonus = 0.35
    else if (artistA.includes(artistB) || artistB.includes(artistA)) artistBonus = 0.2
  }

  // 2. Duration / Tempo Proximity (keeps the vibe consistent)
  let tempoBonus = 0.0
  if (currentSong.duration && candidateSong.duration) {
    const diff = Math.abs(currentSong.duration - candidateSong.duration)
    if (diff < 40) tempoBonus = 0.15
    else if (diff < 90) tempoBonus = 0.05
  }

  // 3. Jarring Clash Penalty (e.g. Sad vs Hiphop or Lofi vs Hard Phonk)
  let clashPenalty = 0.0
  if (cosineSim < 0.25) {
    clashPenalty = 0.5 // Heavy penalty if mood vectors are discordant
  }

  const totalScore = (cosineSim * 0.6) + artistBonus + tempoBonus - clashPenalty
  return totalScore
}

/**
 * Re-ranks a pool of candidate songs to produce a smooth, mood-coherent queue
 */
export const getMoodCoherentQueue = (
  currentSong: Song,
  candidatePool: Song[],
  history: Song[] = [],
  limit = 15
): Song[] => {
  if (!candidatePool || candidatePool.length === 0) return []
  if (!currentSong) return candidatePool.slice(0, limit)

  const playedIds = new Set(history.map(h => h.id))

  const scored = candidatePool
    .filter(s => s.id !== currentSong.id)
    .map(candidate => {
      const score = calculateMoodTransitionScore(currentSong, candidate)
      const isAlreadyPlayed = playedIds.has(candidate.id) ? 0.3 : 0
      const jitter = Math.random() * 0.1 // Slight variety

      return {
        song: candidate,
        finalScore: score - isAlreadyPlayed + jitter
      }
    })

  return scored
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(item => item.song)
    .slice(0, limit)
}

/**
 * Legacy wrapper for general recommendations
 */
export const generateSmartRecommendations = (
  history: Song[],
  candidatePool: Song[],
  limit = 10
): Song[] => {
  if (candidatePool.length === 0) return []
  if (history.length === 0) {
    return [...candidatePool].sort(() => 0.5 - Math.random()).slice(0, limit)
  }

  const seed = history[history.length - 1]
  return getMoodCoherentQueue(seed, candidatePool, history, limit)
}

/**
 * Generates an ML-curated Similar Vibe Radio Queue for any song.
 * Excludes same-title duplicate songs / remix spam and selects matching vibe, mood, and genre tracks.
 */
export const getSongRadioQueue = async (
  seedSong: Song,
  localCandidatePool: Song[] = [],
  history: Song[] = [],
  limit = 20
): Promise<Song[]> => {
  if (!seedSong) return []

  const normalizeTitle = (t: string) =>
    (t || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()

  const seedNormTitle = normalizeTitle(seedSong.title)
  // Extract significant words (> 3 chars) from seed title
  const seedTitleWords = (seedSong.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)

  const isDuplicateOfSeed = (title: string): boolean => {
    const norm = normalizeTitle(title)
    if (!norm) return true
    if (norm === seedNormTitle) return true
    if (norm.length > 3 && seedNormTitle.length > 3) {
      if (norm.includes(seedNormTitle) || seedNormTitle.includes(norm)) return true
    }
    // Check if candidate contains the primary title keyword
    if (seedTitleWords.length > 0) {
      const matchCount = seedTitleWords.filter(w => norm.includes(w)).length
      if (matchCount >= Math.min(2, seedTitleWords.length)) return true
    }
    return false
  }

  const candidatePool: Song[] = []
  const seenKeys = new Set<string>()

  // 1. Add local candidate pool first (filtering out same-title songs)
  for (const s of localCandidatePool) {
    if (!s || s.id === seedSong.id) continue
    if (isDuplicateOfSeed(s.title)) continue
    
    const norm = normalizeTitle(s.title)
    const key = `${norm}_${normalizeTitle(s.artist)}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      candidatePool.push(s)
    }
  }

  // 2. Fetch similar vibe songs from online music catalog
  try {
    const seedYoutubeId = extractYoutubeVideoId(seedSong.id) || 
                          extractYoutubeVideoId((seedSong as any).youtubeId) || 
                          extractYoutubeVideoId(seedSong.youtubeUrl);
                          
    if (seedYoutubeId) {
      try {
        const res = await fetch(`/api/yt-upnext?id=${seedYoutubeId}`, { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          const upnextSongs = await res.json();
          if (Array.isArray(upnextSongs) && upnextSongs.length > 0) {
            for (const s of upnextSongs) {
              if (isDuplicateOfSeed(s.title)) continue;
              const key = `${normalizeTitle(s.title)}_${normalizeTitle(s.artist)}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                candidatePool.push(s);
              }
            }
            return candidatePool.slice(0, limit);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch yt-upnext:', err);
      }
    }

    const fetchPromises: Promise<any>[] = []
    
    // Fallback A. Fetch distinct songs from the same artist
    const cleanArtist = normalizeArtist(seedSong.artist)
    if (cleanArtist && cleanArtist !== 'Unknown Artist' && cleanArtist !== 'Unknown') {
      fetchPromises.push(
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanArtist)}&media=music&entity=song&limit=15`)
          .then(r => r.json())
          .catch(() => ({ results: [] }))
      )
    }

    // Fallback B. Detect dominant mood vector and query related vibe tracks
    const moodVector = extractMoodVector(seedSong)
    let maxIdx = 0
    let maxVal = -1
    moodVector.forEach((v, idx) => {
      if (v > maxVal) {
        maxVal = v
        maxIdx = idx
      }
    })
    const dominantMood = MOOD_KEYS[maxIdx] || 'chill'

    if (cleanArtist) {
      fetchPromises.push(
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanArtist} ${dominantMood}`)}&media=music&entity=song&limit=10`)
          .then(r => r.json())
          .catch(() => ({ results: [] }))
      )
    }

    fetchPromises.push(
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${dominantMood} pop hits`)}&media=music&entity=song&limit=10`)
        .then(r => r.json())
        .catch(() => ({ results: [] }))
    )

    const responses = await Promise.all(fetchPromises)
    for (const res of responses) {
      if (res?.results && Array.isArray(res.results)) {
        for (const item of res.results) {
          const title = item.trackName || ''
          if (!title || isDuplicateOfSeed(title)) continue

          const norm = normalizeTitle(title)
          const artistNorm = normalizeTitle(item.artistName || '')
          const key = `${norm}_${artistNorm}`
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            const highResCover = item.artworkUrl100
              ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb')
              : item.artworkUrl60
            candidatePool.push({
              id: `radio_${item.trackId}`,
              title: item.trackName || 'Unknown Title',
              artist: item.artistName || 'Unknown Artist',
              duration: Math.floor((item.trackTimeMillis || 0) / 1000) || 210,
              url: item.previewUrl || `yt_online://${item.trackId}`,
              previewUrl: item.previewUrl || '',
              playlistId: 'radio',
              coverArtBase64: highResCover,
              youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`
            })
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching online radio tracks:', err)
  }

  // 3. Run ML mood coherence re-ranking on the diverse candidate pool
  const finalQueue = getMoodCoherentQueue(seedSong, candidatePool, history, limit)
  if (finalQueue.length === 0) {
    try {
      const tr = await fetch('/api/yt-trending').then(r => r.json());
      if (Array.isArray(tr)) {
        return tr.filter((t: any) => t.id !== seedSong.id).slice(0, limit);
      }
    } catch(e) {}
  }
  return finalQueue;
}

export interface UserTasteProfile {
  topArtist: string
  secondaryArtist?: string
  topTrack: Song | null
  topMood: string
  topGenres: string[]
  totalPlaysAnalyzed: number
}

export interface FeaturedMix {
  id: string
  title: string
  subtitle: string
  badge: string
  gradient: string
  sampleCovers: string[]
  songs: Song[]
  accentGlow: string
}

// Clean artist name helper for clustering
const normalizeArtist = (artist: string): string => {
  if (!artist) return ''
  return artist
    .replace(/ - Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*\(feat\..*?\)/i, '')
    .replace(/\s*ft\..*$/i, '')
    .replace(/,\s*.*$/, '') // Primary artist before commas
    .trim()
}

/**
 * Machine Learning User Taste & Affinity Profiler
 * Computes frequency and exponential recency-decay weights across played history, uploads, and recents.
 */
export const detectUserAffinities = (
  playedHistory: Song[] = [],
  librarySongs: Song[] = [],
  recentSearches: any[] = [],
  likedSongs: Song[] = []
): UserTasteProfile => {
  const artistScoreMap = new Map<string, number>()
  const moodScoreMap = new Map<string, number>()
  const trackPlayCountMap = new Map<string, { count: number; song: Song }>()

  // 1. Liked Songs (Highest Affinity — 3.5x multiplier)
  likedSongs.forEach((song) => {
    if (!song) return
    const cleanArt = normalizeArtist(song.artist)
    if (cleanArt && cleanArt !== 'Unknown Artist') {
      artistScoreMap.set(cleanArt, (artistScoreMap.get(cleanArt) || 0) + 4.5)
    }
    const sKey = song.id || song.title
    if (sKey) {
      const existing = trackPlayCountMap.get(sKey) || { count: 0, song }
      trackPlayCountMap.set(sKey, { count: existing.count + 5.0, song })
    }
    const moodVec = extractMoodVector(song)
    MOOD_KEYS.forEach((m, mIdx) => {
      moodScoreMap.set(m, (moodScoreMap.get(m) || 0) + moodVec[mIdx] * 4.0)
    })
  })

  // 2. Weight Played History (Higher recency bonus + play count frequency multiplier)
  playedHistory.forEach((song, idx) => {
    if (!song) return
    const rawPlayCount = (song as any).playCount || 1
    const frequencyMultiplier = 1.0 + Math.min(3.5, Math.log2(rawPlayCount + 1) * 0.7)
    const recencyWeight = (1.0 + (idx / Math.max(1, playedHistory.length)) * 1.5) * frequencyMultiplier
    
    const cleanArt = normalizeArtist(song.artist)
    if (cleanArt && cleanArt !== 'Unknown Artist') {
      artistScoreMap.set(cleanArt, (artistScoreMap.get(cleanArt) || 0) + recencyWeight * 2.2)
    }

    const sKey = song.id || song.title
    if (sKey) {
      const existing = trackPlayCountMap.get(sKey) || { count: 0, song }
      trackPlayCountMap.set(sKey, { count: existing.count + recencyWeight, song })
    }

    // Accumulate mood distribution
    const moodVec = extractMoodVector(song)
    MOOD_KEYS.forEach((m, mIdx) => {
      moodScoreMap.set(m, (moodScoreMap.get(m) || 0) + moodVec[mIdx] * recencyWeight)
    })
  })

  // 3. Weight Library / Playlists
  librarySongs.forEach((song) => {
    if (!song) return
    const cleanArt = normalizeArtist(song.artist)
    if (cleanArt && cleanArt !== 'Unknown Artist') {
      artistScoreMap.set(cleanArt, (artistScoreMap.get(cleanArt) || 0) + 1.2)
    }
  })

  // 4. Weight Search Activity
  recentSearches.forEach((item) => {
    if (item && item.type === 'song' && item.artist) {
      const cleanArt = normalizeArtist(item.artist)
      if (cleanArt) {
        artistScoreMap.set(cleanArt, (artistScoreMap.get(cleanArt) || 0) + 1.5)
      }
    }
  })

  // Sort artists by affinity
  const sortedArtists = Array.from(artistScoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([art]) => art)

  // Sort top tracks
  const sortedTracks = Array.from(trackPlayCountMap.values())
    .sort((a, b) => b.count - a.count)
    .map(t => t.song)

  // Dominant mood
  const sortedMoods = Array.from(moodScoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([mood]) => mood)

  const topArtist = sortedArtists[0] || (librarySongs[0]?.artist ? normalizeArtist(librarySongs[0].artist) : '')
  const secondaryArtist = sortedArtists[1] || undefined
  const topTrack = sortedTracks[0] || librarySongs[0] || null
  const topMood = sortedMoods[0] || 'chill'

  return {
    topArtist,
    secondaryArtist,
    topTrack,
    topMood,
    topGenres: sortedMoods.slice(0, 3),
    totalPlaysAnalyzed: playedHistory.length + librarySongs.length
  }
}

/**
 * Generates similar tracks matching a seed track using 8D mood vector cosine similarity
 */
export const generateSimilarToTrack = (
  seedTrack: Song,
  candidatePool: Song[],
  limit = 15
): Song[] => {
  if (!seedTrack || !candidatePool || candidatePool.length === 0) return []

  const seedVec = extractMoodVector(seedTrack)
  const seedArtist = normalizeArtist(seedTrack.artist).toLowerCase()

  const scored = candidatePool
    .filter(s => s.id !== seedTrack.id && s.title !== seedTrack.title)
    .map(candidate => {
      const candVec = extractMoodVector(candidate)
      const cosineSim = computeMoodCosineSimilarity(seedVec, candVec)
      const candArtist = normalizeArtist(candidate.artist).toLowerCase()
      const isArtistMatch = candArtist === seedArtist || candArtist.includes(seedArtist) || seedArtist.includes(candArtist)
      const finalScore = cosineSim + (isArtistMatch ? 0.35 : 0) + (Math.random() * 0.05)

      return { song: candidate, score: finalScore }
    })

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.song)
    .slice(0, limit)
}

/**
 * Generates ML-curated "Featured For You" Mix playlists
 */
export const generateFeaturedMixes = (
  taste: UserTasteProfile,
  candidatePool: Song[],
  history: Song[] = [],
  likedSongs: Song[] = []
): FeaturedMix[] => {
  if (!candidatePool || candidatePool.length === 0) return []

  const mixes: FeaturedMix[] = []

  // Helper to extract clean covers
  const getCovers = (songs: Song[]): string[] => {
    return songs
      .map(s => s.coverArtBase64)
      .filter((c): c is string => Boolean(c))
      .slice(0, 4)
  }

  // Helper to generate dynamic artist subtitle
  const getArtistSubtitle = (songs: Song[], fallback: string): string => {
    const rawArtists = songs.map(s => normalizeArtist(s.artist)).filter(a => a && a !== 'Unknown Artist')
    const unique = Array.from(new Set(rawArtists)).slice(0, 3)
    if (unique.length > 0) {
      return unique.join(', ') + (rawArtists.length > 3 ? ' & more' : '')
    }
    return fallback
  }

  // MIX 0: Liked Songs Favorites Mix (If user has liked tracks)
  if (likedSongs.length > 0) {
    const companionPool = likedSongs.length >= 8 
      ? likedSongs 
      : Array.from(new Map([...likedSongs, ...candidatePool.filter(c => likedSongs.some(l => l.artist === c.artist))].map(s => [s.id || s.title, s])).values()).slice(0, 20)
    
    mixes.push({
      id: 'mix_favorites_curated',
      title: 'Liked Songs Mix',
      subtitle: getArtistSubtitle(companionPool, 'Tracks you love & similar acoustic matches'),
      badge: 'FAVORITES',
      gradient: 'from-zinc-900/80 via-neutral-950/80 to-black',
      accentGlow: 'rgba(255, 255, 255, 0.15)',
      sampleCovers: getCovers(companionPool),
      songs: companionPool
    })
  }

  // MIX 1: Top Artist & Companions Supermix
  if (taste.topArtist) {
    const artistSongs = candidatePool.filter(s => {
      const art = (s.artist || '').toLowerCase()
      return art.includes(taste.topArtist.toLowerCase())
    })
    const relatedMoodSongs = taste.topTrack
      ? generateSimilarToTrack(taste.topTrack, candidatePool, 18)
      : candidatePool.slice(0, 15)
    
    const combinedMix = Array.from(new Map([...artistSongs, ...relatedMoodSongs].map(s => [s.id || s.title, s])).values()).slice(0, 20)

    if (combinedMix.length >= 3) {
      mixes.push({
        id: `mix_artist_${taste.topArtist.toLowerCase().replace(/\s+/g, '_')}`,
        title: `${taste.topArtist} Mix`,
        subtitle: getArtistSubtitle(combinedMix, `Curated with ${taste.topArtist}`),
        badge: 'DAILY MIX 1',
        gradient: 'from-purple-900/60 via-indigo-950/60 to-black/80',
        accentGlow: 'rgba(129, 140, 248, 0.3)',
        sampleCovers: getCovers(combinedMix),
        songs: combinedMix
      })
    }
  }

  // MIX 2: Dominant Mood Radar (e.g. Chill, Late Night, Energy)
  const moodNameMap: Record<string, { title: string; grad: string; glow: string; badge: string }> = {
    sad: { title: 'Emotional Resonance', grad: 'from-blue-950/70 via-slate-900/70 to-black', glow: 'rgba(96, 165, 250, 0.3)', badge: 'MOOD MIX' },
    chill: { title: 'Chillout Sanctuary', grad: 'from-amber-950/60 via-stone-900/70 to-black', glow: 'rgba(251, 191, 36, 0.3)', badge: 'CHILL MIX' },
    pop: { title: 'Pop Euphoria', grad: 'from-pink-950/70 via-rose-950/60 to-black', glow: 'rgba(244, 114, 182, 0.3)', badge: 'POP MIX' },
    hiphop: { title: 'Flow State & Bars', grad: 'from-red-950/70 via-neutral-900/70 to-black', glow: 'rgba(239, 68, 68, 0.3)', badge: 'ENERGY MIX' },
    desi: { title: 'Desi Soul & Melodies', grad: 'from-orange-950/70 via-yellow-950/50 to-black', glow: 'rgba(251, 146, 60, 0.3)', badge: 'DESI MIX' },
    focus: { title: 'Deep Focus Flow', grad: 'from-emerald-950/70 via-teal-950/60 to-black', glow: 'rgba(52, 211, 153, 0.3)', badge: 'FOCUS MIX' },
    energetic: { title: 'Adrenaline Rush', grad: 'from-violet-950/70 via-fuchsia-950/60 to-black', glow: 'rgba(168, 85, 247, 0.3)', badge: 'GYM HYPE' },
    romantic: { title: 'Sweet Romance', grad: 'from-rose-950/70 via-red-950/60 to-black', glow: 'rgba(251, 113, 133, 0.3)', badge: 'ROMANCE MIX' }
  }

  const moodConfig = moodNameMap[taste.topMood] || moodNameMap['chill']
  const moodSongs = [...candidatePool]
    .sort((a, b) => {
      const vecA = extractMoodVector(a)
      const vecB = extractMoodVector(b)
      const mIdx = MOOD_KEYS.indexOf(taste.topMood)
      return (vecB[mIdx] || 0) - (vecA[mIdx] || 0)
    })
    .slice(0, 20)

  if (moodSongs.length >= 3) {
    mixes.push({
      id: `mix_mood_${taste.topMood}`,
      title: moodConfig.title,
      subtitle: getArtistSubtitle(moodSongs, 'Curated mood playlist'),
      badge: moodConfig.badge,
      gradient: moodConfig.grad,
      accentGlow: moodConfig.glow,
      sampleCovers: getCovers(moodSongs),
      songs: moodSongs
    })
  }

  // MIX 3: Discovery Radar (Fresh songs matching taste profile)
  const playedSet = new Set(history.map(h => h.id || h.title))
  const freshTracks = candidatePool.filter(s => !playedSet.has(s.id || s.title)).slice(0, 20)
  if (freshTracks.length >= 4) {
    mixes.push({
      id: 'mix_discovery_radar',
      title: 'Discovery Radar',
      subtitle: getArtistSubtitle(freshTracks, 'Fresh tracks matching your taste'),
      badge: 'FOR YOU',
      gradient: 'from-cyan-950/70 via-teal-950/60 to-black',
      accentGlow: 'rgba(34, 211, 238, 0.3)',
      sampleCovers: getCovers(freshTracks),
      songs: freshTracks
    })
  }

  // MIX 4: Acoustic / Secondary Artist Mix
  if (taste.secondaryArtist) {
    const secSongs = candidatePool.filter(s => {
      const art = (s.artist || '').toLowerCase()
      return art.includes(taste.secondaryArtist!.toLowerCase())
    })
    if (secSongs.length >= 2) {
      const companionSongs = candidatePool.filter(s => s.artist !== taste.secondaryArtist).slice(0, 15)
      const mix4 = Array.from(new Map([...secSongs, ...companionSongs].map(s => [s.id || s.title, s])).values()).slice(0, 20)
      mixes.push({
        id: `mix_sec_${taste.secondaryArtist.toLowerCase().replace(/\s+/g, '_')}`,
        title: `${taste.secondaryArtist} Radio`,
        subtitle: getArtistSubtitle(mix4, `Featuring ${taste.secondaryArtist}`),
        badge: 'ARTIST MIX',
        gradient: 'from-rose-950/70 via-amber-950/60 to-black',
        accentGlow: 'rgba(244, 63, 94, 0.3)',
        sampleCovers: getCovers(mix4),
        songs: mix4
      })
    }
  }

  return mixes
}

