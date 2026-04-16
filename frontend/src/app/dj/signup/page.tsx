'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [djName, setDjName] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage({ text: error.message, error: true })
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      setMessage({ text: 'Account created! Check your email to confirm, then log in.', error: false })
      setLoading(false)
      return
    }

    // Create the dj_profiles row with id = auth.uid() so events can join on dj_id
    const res = await fetch('/api/dj/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, djName }),
    })

    if (!res.ok) {
      const body = await res.json()
      setMessage({ text: body.error ?? 'Failed to create profile', error: true })
      setLoading(false)
      return
    }

    // If Supabase returned a session, the user is confirmed and logged in — go straight to dashboard
    if (data.session) {
      router.push('/dashboard')
    } else {
      // Email confirmation is enabled — user must confirm before logging in
      setMessage({ text: 'Account created! Check your email to confirm, then log in.', error: false })
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden font-[family-name:var(--font-geist-sans)]">
      {/* Red glow — matches home page */}
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
          <h1 className="mb-1 text-xl font-semibold text-white">Create your DJ account</h1>
          <p className="mb-6 text-sm text-zinc-400">Start managing your crowd-powered queue</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">DJ Name</label>
              <input
                type="text"
                required
                value={djName}
                onChange={(e) => setDjName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40"
                placeholder="DJ Velvet"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                {message.text}
              </p>
            )}

            {message && !message.error ? (
              <a
                href="/dj/login"
                className="mt-1 block rounded-lg bg-red-600 py-2.5 text-center font-semibold text-white transition hover:bg-red-500"
              >
                Go to Login
              </a>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <a href="/dj/login" className="font-medium text-white hover:text-red-400 transition">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
