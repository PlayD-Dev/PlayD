import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Avoids visually ambiguous characters (0/O, 1/I/L)
function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: NextRequest) {
  const { djId, name } = await req.json()

  if (!djId || !name?.trim()) {
    return NextResponse.json({ error: 'Missing djId or name' }, { status: 400 })
  }

  // Verify the dj_profiles row exists
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('dj_profiles')
    .select('id')
    .eq('id', djId)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'DJ profile not found' }, { status: 404 })
  }

  // Generate a unique event_code (retry up to 5 times on collision)
  let eventCode = generateEventCode()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('event_code', eventCode)
      .maybeSingle()
    if (!existing) break
    eventCode = generateEventCode()
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      dj_id: djId,
      name: name.trim(),
      event_code: eventCode,
      status: 'live',
      started_at: new Date().toISOString(),
    })
    .select('id, event_code')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, event_code: data.event_code })
}
