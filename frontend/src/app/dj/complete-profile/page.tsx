'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [djName, setDjName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/dj/login')
        return
      }
      setUserId(user.id)
      setEmail(user.email ?? '')
      // Pre-fill with Google display name as a suggestion
      setDjName(
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        ''
      )
    }
    checkAuth()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !email) return
    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/dj/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, djName }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setMessage({ text: body.error ?? 'Failed to save profile. Try again.', error: true })
      setLoading(false)
      return
    }

    router.replace('/dashboard')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden font-[family-name:var(--font-geist-sans)]">
      {/* Red glow — matches signup page */}
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
          <h1 className="mb-1 text-xl font-semibold text-white">One last thing</h1>
          <p className="mb-6 text-sm text-zinc-400">What should we call you as a DJ?</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">DJ Name</label>
              <input
                type="text"
                required
                autoFocus
                maxLength={64}
                value={djName}
                onChange={(e) => setDjName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40"
                placeholder="DJ Velvet"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !djName.trim()}
              className="mt-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Go to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
