'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function Page() {
  const router = useRouter()
  const [djId, setDjId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null | undefined>(undefined) // undefined = loading
  const [eventCode, setEventCode] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/dj/login')
        return
      }

      setDjId(user.id)

      // Find this DJ's live event. dj_profiles.id = auth.uid() per our signup flow.
      const { data } = await supabase
        .from('events')
        .select('id, event_code')
        .eq('dj_id', user.id)
        .eq('status', 'live')
        .maybeSingle()

      setEventId(data?.id ?? null)
      setEventCode(data?.event_code ?? null)
    }

    load()
  }, [router])

  if (eventId === undefined || djId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020202]">
        <span className="text-zinc-500 text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <Dashboard
      eventId={eventId}
      eventCode={eventCode}
      djId={djId}
      onLogout={() => router.replace('/dj/login')}
      onEventCreated={(id, code) => { setEventId(id); setEventCode(code) }}
      onEventEnded={() => { setEventId(null); setEventCode(null) }}
    />
  )
}
