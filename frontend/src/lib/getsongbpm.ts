export interface TrackMeta {
  bpm: string         // e.g. "171"
  key: string         // e.g. "A Major"
  openKey: string     // e.g. "11B" (Camelot / Open Key notation)
  timeSig: string     // e.g. "4/4"
}

interface GetSongBPMSong {
  tempo: string
  key_of: string
  open_key: string
  time_sig: string
}

interface GetSongBPMResponse {
  song?: GetSongBPMSong
  error?: string
}

/**
 * Fetch BPM + musical key for a track from GetSongBPM.
 * Requires GETSONGBPM_API_KEY — NEVER call this from the browser.
 * Always call via /api/track-meta route which keeps the key server-side.
 */
export async function fetchTrackMeta(
  title: string,
  artist: string,
  apiKey: string,
): Promise<TrackMeta | null> {
  const lookup = `${title} ${artist}`.trim()
  const params = new URLSearchParams({
    api_key: apiKey,
    type: 'song',
    lookup,
  })

  const res = await fetch(`https://api.getsongbpm.com/search/?${params}`, {
    next: { revalidate: 3600 }, // BPM data doesn't change — cache for 1 hour
  })

  if (!res.ok) {
    throw new Error(`GetSongBPM API error: ${res.status}`)
  }

  const data: GetSongBPMResponse = await res.json()

  if (!data.song) return null

  return {
    bpm: data.song.tempo,
    key: data.song.key_of,
    openKey: data.song.open_key,
    timeSig: data.song.time_sig,
  }
}
