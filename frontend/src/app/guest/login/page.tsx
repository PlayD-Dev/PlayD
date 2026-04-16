'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GuestJoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('event_code', code.trim().toUpperCase())
      .eq('status', 'live')
      .maybeSingle()

    if (!event) {
      setError('No active event found for that code. Check with your DJ.')
      setLoading(false)
      return
    }

    router.push(`/request/${event.id}`)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden font-[family-name:var(--font-geist-sans)]">
      {/* Red glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-red-700/30 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-4">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-2xl shadow-lg">
            ♪
          </div>
          <span className="text-3xl font-bold tracking-tight text-white">PlayD</span>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-white/10 bg-[#0f1623] p-8 shadow-xl">
          <h1 className="mb-1 text-xl font-semibold text-white">Join an event</h1>
          <p className="mb-6 text-sm text-zinc-400">Enter the code shown by your DJ</p>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Event code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-bold tracking-[0.35em] text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40 uppercase"
                placeholder="ABC123"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.trim().length === 0}
              className="mt-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Event'}
            </button>
          </form>
        </div>

        <a href="/" className="text-sm text-zinc-600 transition hover:text-zinc-400">
          ← Back to home
        </a>
      </div>
    </div>
  )
}
