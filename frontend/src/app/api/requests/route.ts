import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { ItunesTrack } from '@/lib/itunes'

/**
 * POST /api/requests
 * Submits a song request for an event.
 * Body: { eventId, sessionId, track: ItunesTrack, message?, boostAmount? }
 * Returns: the created request row with track data
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

  const itunesTrack = track as ItunesTrack

  // 1. Upsert track — use spotify_id column to store iTunes trackId for deduplication
  const { data: trackRow, error: trackError } = await supabaseAdmin
    .from('tracks')
    .upsert(
      {
        spotify_id: String(itunesTrack.trackId),
        title: itunesTrack.trackName,
        artist: itunesTrack.artistName,
        album: itunesTrack.collectionName,
        album_art_url: itunesTrack.artworkUrl100,
        spotify_url: itunesTrack.previewUrl,
      },
      { onConflict: 'spotify_id' },
    )
    .select('id')
    .single()

  if (trackError || !trackRow) {
    console.error('Track upsert error:', trackError)
    return NextResponse.json({ error: 'Failed to save track' }, { status: 500 })
  }

  // 2. Insert the request
  const { data: request, error: requestError } = await supabaseAdmin
    .from('requests')
    .insert({
      event_id: eventId,
      session_id: sessionId,
      track_id: trackRow.id,
      message: message?.trim() || null,
      priority_score: typeof boostAmount === 'number' ? boostAmount : 0,
      status: 'pending',
    })
    .select('*, tracks(*), guest_sessions(display_name)')
    .single()

  if (requestError || !request) {
    console.error('Request insert error:', requestError)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ request }, { status: 201 })
}
