'use client'

import { useState, useEffect } from 'react'
import type { SpotifyTrack } from '@/lib/spotify'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function msToMin(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
      ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {label}
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
      {children}
    </div>
  )
}

export default function ApiTestPage() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 400)

  const [selected, setSelected] = useState<SpotifyTrack | null>(null)

  const [qrEventId, setQrEventId] = useState('test-event-123')
  const [qrSrc, setQrSrc] = useState<string | null>(null)

  const [health, setHealth] = useState<{ spotify: boolean | null }>({ spotify: null })

  // Health check on mount
  useEffect(() => {
    fetch('/api/search?q=test&limit=1')
      .then(r => setHealth({ spotify: r.ok }))
      .catch(() => setHealth({ spotify: false }))
  }, [])

  // Spotify search
  useEffect(() => {
    if (!debouncedQuery.trim()) { setTracks([]); setSearchError(null); return }
    setSearchLoading(true)
    setSearchError(null)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setTracks(d.tracks ?? [])
      })
      .catch(e => setSearchError(e.message))
      .finally(() => setSearchLoading(false))
  }, [debouncedQuery])

  function generateQR() {
    setQrSrc(`/api/qrcode?eventId=${encodeURIComponent(qrEventId)}`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-zinc-900">PlayD — API Test Bench</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Development only. Tests Spotify Search + Audio Features, and QR code generation.
          </p>
        </div>

        <SectionCard title="API Health">
          <div className="flex flex-wrap gap-2">
            {health.spotify === null
              ? <span className="text-xs text-zinc-400">Checking Spotify...</span>
              : <StatusBadge label="Spotify Search" ok={health.spotify} />}
            <StatusBadge label="QR Code" ok />
          </div>
          {health.spotify === false && (
            <p className="mt-3 text-xs text-red-600">
              Spotify search failed — check <code className="font-mono">SPOTIFY_CLIENT_ID</code> and{' '}
              <code className="font-mono">SPOTIFY_CLIENT_SECRET</code> in <code className="font-mono">.env.local</code>.
            </p>
          )}
        </SectionCard>

        <SectionCard title="1 · Spotify Search + Audio Features  →  /api/search">
          <input
            type="text"
            placeholder="Search for a song..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
          <p className="mt-1.5 text-xs text-zinc-400">Debounced 400ms — BPM & key included in results</p>

          {searchLoading && <p className="mt-4 text-sm text-zinc-400">Searching...</p>}
          {searchError && <p className="mt-4 text-sm text-red-600">{searchError}</p>}

          {tracks.length > 0 && (
            <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
              {tracks.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelected(t)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50
                      ${selected?.id === t.id ? 'bg-zinc-100' : 'bg-white'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.album.images[1]?.url ?? t.album.images[0]?.url ?? ''}
                      alt={t.album.name}
                      width={40}
                      height={40}
                      className="rounded-md flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{t.name}</p>
                      <p className="truncate text-xs text-zinc-500">{t.artists[0]?.name} · {t.album.name}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 text-xs text-zinc-400">
                      {t.bpm && <span>{t.bpm} BPM</span>}
                      {t.keyName && <span>{t.keyName}</span>}
                      <span>{msToMin(t.duration_ms)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {selected && (
          <SectionCard title="Selected Track — Audio Features">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'BPM',    value: selected.bpm ?? '—' },
                { label: 'Key',    value: selected.keyName ?? '—' },
                { label: 'Mode',   value: selected.mode === 1 ? 'Major' : selected.mode === 0 ? 'Minor' : '—' },
                { label: 'Time',   value: selected.timeSig ? `${selected.timeSig}/4` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-center">
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title="2 · QR Code  →  /api/qrcode">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={qrEventId}
              onChange={e => setQrEventId(e.target.value)}
              placeholder="Event ID"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
            <button
              onClick={generateQR}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Generate
            </button>
          </div>
          {qrSrc && (
            <div className="mt-4 flex flex-col items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="QR code" width={200} height={200} className="rounded-xl border border-zinc-200" />
              <a href={qrSrc} download="playd-qr.png" className="text-xs text-zinc-500 underline hover:text-zinc-800">
                Download PNG
              </a>
            </div>
          )}
        </SectionCard>

        {selected && (
          <SectionCard title="Raw Spotify Response (selected track)">
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-green-400">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </SectionCard>
        )}

      </div>
    </div>
  )
}
