import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * PATCH /api/events/[id]
 * Body: { status: 'ended' }
 *
 * Ends an event: archives paid requests, deletes free requests + guest sessions,
 * then marks the event as ended via the end-event Edge Function.
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

  // Verify event exists
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(`${supabaseUrl}/functions/v1/end-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ eventId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[/api/events/[id]] end-event function error:', err)
    return NextResponse.json({ error: 'Failed to end event' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
