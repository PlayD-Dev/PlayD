import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyToken, type SpotifyTrack } from '@/lib/spotify'
import { redis } from '@/lib/redis'

/** GET /api/search?q=blinding+lights&limit=10 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '10'), 25)

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 })
  }

  try {
    // Check Redis cache first
    const cacheKey = `search:${q}:${limit}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(cached)
    }

    const token = await getSpotifyToken()
    const headers = { Authorization: `Bearer ${token}` }

    // Search Spotify
    const searchParams = new URLSearchParams({ q, type: 'track', limit: String(limit) })
    const searchRes = await fetch(`https://api.spotify.com/v1/search?${searchParams}`, { headers })

    if (!searchRes.ok) {
      throw new Error(`Spotify search failed: ${searchRes.status}`)
    }

    const searchData = await searchRes.json()
    const rawTracks = searchData.tracks?.items ?? []

    const tracks: SpotifyTrack[] = rawTracks.map((track: SpotifyTrack) => ({
      ...track,
      bpm: null,
      key: null,
      keyName: null,
      mode: null,
      timeSig: null,
    }))

    const result = { tracks }

    // Cache in background — don't await so it doesn't block the response
    if (redis) redis.set(cacheKey, result, { ex: 3600 }).catch(() => {})

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
}
