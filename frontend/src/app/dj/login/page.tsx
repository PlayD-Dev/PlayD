'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage({ text: error.message, error: true })
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
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
          <h1 className="mb-1 text-xl font-semibold text-white">Welcome back</h1>
          <p className="mb-6 text-sm text-zinc-400">Log in to manage your events</p>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 py-2.5 font-medium text-white transition hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c10 0 18.7-7.2 18.7-19 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5c-7.7 0-14.3 4.3-17.7 9.7z"/>
              <path fill="#4CAF50" d="M24 43c4.9 0 9.3-1.8 12.7-4.8l-6.2-5.1C28.8 34.4 26.5 35 24 35c-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.6 38.6 16.3 43 24 43z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.1C40.5 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <a href="/dj/signup" className="font-medium text-white hover:text-red-400 transition">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
