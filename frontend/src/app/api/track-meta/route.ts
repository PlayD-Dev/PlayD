import { NextRequest, NextResponse } from 'next/server'
import { fetchTrackMeta } from '@/lib/getsongbpm'

/**
 * GET /api/track-meta?title=Blinding+Lights&artist=The+Weeknd
 *
 * Returns BPM, musical key, open key notation, and time signature.
 * The GetSongBPM API key lives server-side only — never exposed to the browser.
 */
export async function GET(req: NextRequest) {
  const title  = req.nextUrl.searchParams.get('title')?.trim()
  const artist = req.nextUrl.searchParams.get('artist')?.trim()

  if (!title || !artist) {
    return NextResponse.json(
      { error: 'Missing required parameters: title, artist' },
      { status: 400 },
    )
  }

  const apiKey = process.env.GETSONGBPM_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GETSONGBPM_API_KEY is not configured' },
      { status: 500 },
    )
  }

  try {
    const meta = await fetchTrackMeta(title, artist, apiKey)

    if (!meta) {
      return NextResponse.json({ error: 'Track not found in GetSongBPM' }, { status: 404 })
    }

    return NextResponse.json(meta)
  } catch (err) {
    console.error('[/api/track-meta]', err)
    return NextResponse.json({ error: 'Failed to fetch track metadata' }, { status: 502 })
  }
}
