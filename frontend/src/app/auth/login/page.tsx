'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage({ text: error.message, error: true })
    } else {
      setMessage({ text: `Logged in as ${data.user?.email}`, error: false })
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
        <h1 className="mb-6 text-2xl font-semibold text-white">DJ Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
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
            className="mt-2 rounded-lg bg-white py-2.5 font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <a href="/auth/signup" className="text-white underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
