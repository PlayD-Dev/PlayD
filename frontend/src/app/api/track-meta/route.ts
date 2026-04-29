import { NextRequest, NextResponse } from 'next/server'
import { fetchSongBpm } from '@/lib/songbpm'

/**
 * GET /api/track-meta?spotifyId=xxx&title=xxx&artist=xxx
 *
 * Returns BPM, key, and time signature for a track via GetSongBPM.
 * Results are cached in Redis for 30 days (handled inside fetchSongBpm).
 */
export async function GET(req: NextRequest) {
  const spotifyId = req.nextUrl.searchParams.get('spotifyId')?.trim()
  const title = req.nextUrl.searchParams.get('title')?.trim() ?? ''
  const artist = req.nextUrl.searchParams.get('artist')?.trim() ?? ''

  if (!spotifyId) {
    return NextResponse.json({ error: 'Missing required parameter: spotifyId' }, { status: 400 })
  }

  const meta = await fetchSongBpm(spotifyId, title, artist)
  return NextResponse.json(meta)
}
