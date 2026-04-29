import { NextRequest, NextResponse } from 'next/server'

/** GET /api/test-bpm?title=xxx&artist=xxx — dev-only GetSongBPM raw response viewer */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const apiKey = process.env.GETSONGBPM_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GETSONGBPM_API_KEY not set' }, { status: 500 })

  const title = req.nextUrl.searchParams.get('title') ?? 'Blinding Lights'
  const artist = req.nextUrl.searchParams.get('artist') ?? 'The Weeknd'

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, */*',
  }

  // Search by title only (title+artist breaks the API)
  const q = encodeURIComponent(title)
  const searchUrl = `https://api.getsong.co/search/?api_key=${apiKey}&type=song&lookup=${q}`
  const searchRes = await fetch(searchUrl, { cache: 'no-store', headers })
  const searchStatus = searchRes.status
  const searchContentType = searchRes.headers.get('content-type') ?? ''
  const searchBody = searchContentType.includes('application/json')
    ? await searchRes.json()
    : await searchRes.text()

  return NextResponse.json({
    input: { title, artist },
    searchLookup: {
      url: searchUrl.replace(apiKey, '[REDACTED]'),
      status: searchStatus,
      contentType: searchContentType,
      body: searchBody,
    },
  })
}
