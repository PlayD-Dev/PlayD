import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
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

  const trackData = {
    spotifyId: t.id,
    title:     t.name,
    artist:    t.artists?.[0]?.name ?? '',
    album:     t.album?.name ?? null,
    albumArt:  t.album?.images?.[0]?.url ?? null,
    url:       t.external_urls?.spotify ?? null,
    previewUrl: t.preview_url ?? null,
    bpm:       t.bpm ?? null,
    key:       t.keyName ?? null,
    timeSig:   t.timeSig ?? null,
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
    .select('*, guest_sessions(display_name)')
    .single()

  if (requestError || !request) {
    console.error('Request insert error:', requestError)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ request }, { status: 201 })
}
