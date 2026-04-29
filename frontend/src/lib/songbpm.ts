import { redis } from '@/lib/redis'

export interface SongBpmMeta {
  bpm: number | null
  keyName: string | null
  timeSig: number | null
}

const CACHE_TTL = 60 * 60 * 24 * 30 // 30 days

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
}

/**
 * Fetch BPM and musical key from GetSongBPM.
 * Searches by title, then picks the best match by artist name.
 * Results are cached in Redis for 30 days. Returns nulls on any miss — never throws.
 */
export async function fetchSongBpm(
  spotifyId: string,
  title: string,
  artist: string,
): Promise<SongBpmMeta> {
  const cacheKey = `track-meta:${spotifyId}`

  if (redis) {
    const cached = await redis.get(cacheKey).catch(() => null)
    if (cached) return cached as SongBpmMeta
  }

  const apiKey = process.env.GETSONGBPM_API_KEY
  if (!apiKey) return { bpm: null, keyName: null, timeSig: null }

  try {
    const meta = await lookupBySearch(apiKey, title, artist)

    if (redis && meta.bpm != null) {
      redis.set(cacheKey, meta, { ex: CACHE_TTL }).catch(() => {})
    }

    return meta
  } catch {
    return { bpm: null, keyName: null, timeSig: null }
  }
}

async function lookupBySearch(apiKey: string, title: string, artist: string): Promise<SongBpmMeta> {
  const q = encodeURIComponent(title)
  const url = `https://api.getsong.co/search/?api_key=${apiKey}&type=song&lookup=${q}`
  const res = await fetch(url, { cache: 'no-store', headers: HEADERS })
  if (!res.ok) return { bpm: null, keyName: null, timeSig: null }
  const data = await res.json()
  if (!Array.isArray(data?.search)) return { bpm: null, keyName: null, timeSig: null }

  const results: Record<string, unknown>[] = data.search
  // Prefer the result whose artist name matches; fall back to first result
  const artistLower = artist.toLowerCase()
  const best =
    results.find((s) => {
      const a = s.artist as { name?: string } | null | undefined
      return typeof a?.name === 'string' && a.name.toLowerCase().includes(artistLower)
    }) ?? results[0]

  return parseSong(best) ?? { bpm: null, keyName: null, timeSig: null }
}

function parseSong(song: Record<string, unknown> | null | undefined): SongBpmMeta | null {
  if (!song) return null
  const bpm = song.tempo ? Math.round(Number(song.tempo)) : null
  const keyName = typeof song.key_of === 'string' && song.key_of ? song.key_of : null
  // time_sig is "4/4" format — extract numerator
  const timeSigRaw = typeof song.time_sig === 'string' ? song.time_sig : null
  const timeSig = timeSigRaw ? parseInt(timeSigRaw.split('/')[0], 10) || null : null
  return { bpm: bpm || null, keyName, timeSig }
}
