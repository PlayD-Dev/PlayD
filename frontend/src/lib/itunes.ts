export interface ItunesTrack {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100: string   // 100x100 thumbnail — swap "100x100" for "600x600" for full size
  previewUrl: string      // 30-second MP3 preview
  trackTimeMillis: number
  primaryGenreName: string
}

interface ItunesSearchResponse {
  resultCount: number
  results: ItunesTrack[]
}

/**
 * Search iTunes for tracks matching `query`.
 * No API key required. Rate limit ~20 req/sec per IP — always debounce on the frontend.
 */
export async function searchItunes(query: string, limit = 10): Promise<ItunesTrack[]> {
  if (!query.trim()) return []

  const params = new URLSearchParams({
    term: query,
    entity: 'song',
    limit: String(limit),
  })

  const res = await fetch(`https://itunes.apple.com/search?${params}`, {
    // Cache for 60s — same search should not hit iTunes twice in a row
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(`iTunes API error: ${res.status}`)
  }

  const data: ItunesSearchResponse = await res.json()
  return data.results
}

/** Swap iTunes artwork URL to a larger size (default is 100x100). */
export function artworkUrl(track: ItunesTrack, size: 300 | 600 = 300): string {
  return track.artworkUrl100.replace('100x100bb', `${size}x${size}bb`)
}
