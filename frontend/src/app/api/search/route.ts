import { NextRequest, NextResponse } from 'next/server'
import { searchItunes } from '@/lib/itunes'

/**
 * GET /api/search?q=blinding+lights&limit=10
 *
 * Proxies iTunes Search API. Keeps all search traffic through our server,
 * which lets us add caching, logging, or swap the provider later without
 * touching the frontend.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '10')

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 })
  }

  try {
    const tracks = await searchItunes(q, Math.min(limit, 25))
    return NextResponse.json({ tracks })
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
}
