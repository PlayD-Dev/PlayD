import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const TERMINAL_STATUSES = ['played', 'skipped', 'cancelled']

/**
 * PATCH /api/requests/[id]
 * Updates the status of a song request.
 * Body: { status: 'seen' | 'saved' | 'played' | 'skipped' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const { status } = body ?? {}

  const validStatuses = ['seen', 'saved', 'played', 'skipped', 'cancelled']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { status }
  if (TERMINAL_STATUSES.includes(status)) {
    update.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('requests')
    .update(update)
    .eq('id', id)
    .select('id, status')
    .single()

  if (error || !data) {
    console.error('Request update error:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }

  return NextResponse.json({ request: data })
}
