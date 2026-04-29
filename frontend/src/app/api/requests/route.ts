import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { fetchSongBpm } from '@/lib/songbpm'
import type { SpotifyTrack } from '@/lib/spotify'

/**
 * POST /api/requests
 * Submits a song request for an event.
 * Body: { eventId, sessionId, track: SpotifyTrack, message?, boostAmount? }
 * Returns: the created request row with track_data
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { eventId, sessionId, track, message, boostAmount } = body ?? {}

  if (!eventId || !sessionId || !track) {
    return NextResponse.json(
      { error: 'eventId, sessionId, and track are required' },
      { status: 400 },
    )
  }

  const t = track as SpotifyTrack

  // Block same guest from requesting the same song twice in the same event
  const { data: selfDupe } = await supabaseAdmin
    .from('requests')
    .select('id')
    .eq('event_id', eventId)
    .eq('session_id', sessionId)
    .eq('track_data->>spotifyId', t.id)
    .in('status', ['pending', 'seen'])
    .maybeSingle()

  if (selfDupe) {
    return NextResponse.json({ error: 'You already requested this song.' }, { status: 409 })
  }

  // Fetch BPM server-side — non-critical, never blocks the request
  let bpm: number | null = null
  let keyName: string | null = null
  let timeSig: number | null = null
  try {
    const meta = await fetchSongBpm(t.id, t.name, t.artists?.[0]?.name ?? '')
    bpm = meta.bpm
    keyName = meta.keyName
    timeSig = meta.timeSig
  } catch { /* non-critical */ }

  const trackData = {
    spotifyId: t.id,
    title:     t.name,
    artist:    t.artists?.[0]?.name ?? '',
    album:     t.album?.name ?? null,
    albumArt:  t.album?.images?.[0]?.url ?? null,
    url:       t.external_urls?.spotify ?? null,
    previewUrl: t.preview_url ?? null,
    bpm,
    key:       keyName,
    timeSig,
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('requests')
    .insert({
      event_id:       eventId,
      session_id:     sessionId,
      track_data:     trackData,
      message:        message?.trim() || null,
      priority_score: typeof boostAmount === 'number' ? boostAmount : 0,
      status:         'pending',
    })
    .select('id, event_id, session_id, status, track_data')
    .single()

  if (requestError || !request) {
    console.error('Request insert error:', requestError)
    return NextResponse.json({ error: requestError?.message ?? 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ request }, { status: 201 })
}
