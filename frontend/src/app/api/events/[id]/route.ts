import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * PATCH /api/events/[id]
 * Body: { status: 'ended' }
 *
 * Ends an event:
 * 1. Delete all requests for the event
 * 2. Delete all guest sessions for the event
 * 3. Mark the event as ended
 *
 * The Supabase Realtime UPDATE on the events row triggers the guest-side
 * "event ended" overlay automatically.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params
  const body = await req.json().catch(() => null)

  if (body?.status !== 'ended') {
    return NextResponse.json({ error: 'Only status "ended" is supported' }, { status: 400 })
  }

  // Verify event exists and isn't already ended
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.status === 'ended') {
    return NextResponse.json({ error: 'Event is already ended' }, { status: 409 })
  }

  // 1. Delete all requests for this event
  const { error: deleteRequestsError } = await supabaseAdmin
    .from('requests')
    .delete()
    .eq('event_id', eventId)

  if (deleteRequestsError) {
    console.error('[end-event] delete requests error:', deleteRequestsError)
    return NextResponse.json({ error: 'Failed to clear requests' }, { status: 500 })
  }

  // 2. Delete all guest sessions for this event
  const { error: deleteSessionsError } = await supabaseAdmin
    .from('guest_sessions')
    .delete()
    .eq('event_id', eventId)

  if (deleteSessionsError) {
    console.error('[end-event] delete sessions error:', deleteSessionsError)
    return NextResponse.json({ error: 'Failed to clear sessions' }, { status: 500 })
  }

  // 3. Mark the event as ended — this UPDATE triggers the guest Realtime subscription
  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', eventId)

  if (updateError) {
    console.error('[end-event] event update error:', updateError)
    return NextResponse.json({ error: 'Failed to end event' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
