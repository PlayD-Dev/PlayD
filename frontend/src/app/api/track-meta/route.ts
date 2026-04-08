// import { NextRequest, NextResponse } from 'next/server'
// import { getSpotifyToken, keyName, type SpotifyAudioFeatures } from '@/lib/spotify'
// import { redis } from '@/lib/redis'

// /**
//  * GET /api/track-meta?spotifyId=4cOdK2wGLETKBW3PvgPWqT
//  *
//  * Returns BPM, key, and time signature for a track via Spotify Audio Features.
//  * Results are cached in Redis for 30 days.
//  */
// export async function GET(req: NextRequest) {
//   const spotifyId = req.nextUrl.searchParams.get('spotifyId')?.trim()

//   if (!spotifyId) {
//     return NextResponse.json({ error: 'Missing required parameter: spotifyId' }, { status: 400 })
//   }

//   // Check Redis cache first
//   const cacheKey = `track-meta:${spotifyId}`
//   if (redis) {
//     const cached = await redis.get(cacheKey)
//     if (cached) return NextResponse.json(cached)
//   }

//   try {
//     const token = await getSpotifyToken()
//     const res = await fetch(`https://api.spotify.com/v1/audio-features/${spotifyId}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     })

//     if (res.status === 403) {
//       return NextResponse.json({ error: 'Audio Features endpoint unavailable for this app' }, { status: 403 })
//     }

//     if (!res.ok) {
//       return NextResponse.json({ error: 'Track not found' }, { status: 404 })
//     }

//     const f: SpotifyAudioFeatures = await res.json()
//     const meta = {
//       bpm:     Math.round(f.tempo),
//       key:     f.key,
//       keyName: f.key >= 0 ? keyName(f.key, f.mode) : null,
//       mode:    f.mode,
//       timeSig: f.time_signature,
//     }

//     if (redis) await redis.set(cacheKey, meta, { ex: 60 * 60 * 24 * 30 })

//     return NextResponse.json(meta)
//   } catch (err) {
//     console.error('[/api/track-meta]', err)
//     return NextResponse.json({ error: 'Failed to fetch track metadata' }, { status: 502 })
//   }
// }
