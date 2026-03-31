import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/sessions
 * Creates a guest session for an event.
 * Body: { eventId: string, displayName: string }
 * Returns: { sessionId, eventId, eventName, djName }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { eventId, displayName } = body ?? {}

  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
  }
  if (!displayName || typeof displayName !== 'string') {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 })
  }

  // Fetch the event and confirm it's live
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, name, status, dj_profiles(dj_name)')
    .eq('id', eventId)
    .neq('status', 'ended')
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found or has ended' }, { status: 404 })
  }

  // Create a guest session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('guest_sessions')
    .insert({ event_id: eventId, display_name: displayName.trim() })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('Session insert error:', sessionError)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  const djProfile = Array.isArray(event.dj_profiles)
    ? event.dj_profiles[0]
    : event.dj_profiles

  return NextResponse.json({
    sessionId: session.id,
    eventId: event.id,
    eventName: event.name,
    djName: (djProfile as { dj_name?: string } | null)?.dj_name ?? 'DJ',
  })
}
