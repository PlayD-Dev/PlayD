import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * POST /functions/v1/end-event
 * Body: { eventId: string }
 *
 * 1. Archive paid requests (priority_score > 0) into request_archive, stripping PII
 * 2. Delete all requests for the event
 * 3. Delete all guest_sessions for the event
 * 4. Set events.status = 'ended' and events.ended_at = now()
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { eventId } = await req.json()
  if (!eventId) {
    return new Response(JSON.stringify({ error: 'eventId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Copy paid requests into archive (no session_id — PII stripped)
  const { error: archiveError } = await supabase.rpc('archive_paid_requests', {
    p_event_id: eventId,
  })
  if (archiveError) {
    console.error('Archive error:', archiveError)
    return new Response(JSON.stringify({ error: 'Failed to archive paid requests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Delete all requests for this event
  const { error: deleteRequestsError } = await supabase
    .from('requests')
    .delete()
    .eq('event_id', eventId)
  if (deleteRequestsError) {
    console.error('Delete requests error:', deleteRequestsError)
    return new Response(JSON.stringify({ error: 'Failed to delete requests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Delete all guest sessions for this event
  const { error: deleteSessionsError } = await supabase
    .from('guest_sessions')
    .delete()
    .eq('event_id', eventId)
  if (deleteSessionsError) {
    console.error('Delete sessions error:', deleteSessionsError)
    return new Response(JSON.stringify({ error: 'Failed to delete guest sessions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Mark event as ended
  const { error: eventError } = await supabase
    .from('events')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', eventId)
  if (eventError) {
    console.error('Event update error:', eventError)
    return new Response(JSON.stringify({ error: 'Failed to update event status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
