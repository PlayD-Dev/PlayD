'use client'

import { useState, useEffect, useRef } from 'react'
import { ItunesTrack, artworkUrl } from '@/lib/itunes'
import type { TrackMeta } from '@/lib/getsongbpm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaState {
  loading: boolean
  data: TrackMeta | null
  error: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
        ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
    >
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApiTestPage() {
  // Search state
  const [query, setQuery]           = useState('')
  const [tracks, setTracks]         = useState<ItunesTrack[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError]     = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 400)

  // Selected track + BPM meta
  const [selected, setSelected]     = useState<ItunesTrack | null>(null)
  const [meta, setMeta]             = useState<MetaState>({ loading: false, data: null, error: null })

  // QR code test
  const [qrEventId, setQrEventId]   = useState('test-event-123')
  const [qrSrc, setQrSrc]           = useState<string | null>(null)

  // API health
  const [health, setHealth]         = useState<{ itunes: boolean | null; bpm: boolean | null }>({
    itunes: null,
    bpm: null,
  })

  // ── Health check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/search?q=test&limit=1')
      .then(r => setHealth(h => ({ ...h, itunes: r.ok })))
      .catch(() => setHealth(h => ({ ...h, itunes: false })))

    fetch('/api/track-meta?title=test&artist=test')
      .then(r => setHealth(h => ({ ...h, bpm: r.status !== 500 })))  // 404 is fine, 500 means no key
      .catch(() => setHealth(h => ({ ...h, bpm: false })))
  }, [])

  // ── iTunes search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTracks([])
      setSearchError(null)
      return
    }
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

  // ── BPM lookup when track selected ────────────────────────────────────────
  useEffect(() => {
    if (!selected) return
    setMeta({ loading: true, data: null, error: null })
    const params = new URLSearchParams({ title: selected.trackName, artist: selected.artistName })
    fetch(`/api/track-meta?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setMeta({ loading: false, data: d, error: null })
      })
      .catch(e => setMeta({ loading: false, data: null, error: e.message }))
  }, [selected])

  // ── QR code ───────────────────────────────────────────────────────────────
  function generateQR() {
    setQrSrc(`/api/qrcode?eventId=${encodeURIComponent(qrEventId)}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">PlayD — API Test Bench</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Development only. Tests iTunes Search, GetSongBPM, and QR code generation.
          </p>
        </div>

        {/* Health */}
        <SectionCard title="API Health">
          <div className="flex flex-wrap gap-2">
            {health.itunes === null
              ? <span className="text-xs text-zinc-400">Checking iTunes...</span>
              : <StatusBadge label="iTunes Search" ok={health.itunes} />}
            {health.bpm === null
              ? <span className="text-xs text-zinc-400">Checking GetSongBPM...</span>
              : <StatusBadge label="GetSongBPM (key configured)" ok={health.bpm} />}
            <StatusBadge label="QR Code (offline)" ok />
          </div>
          {health.bpm === false && (
            <p className="mt-3 text-xs text-red-600">
              GetSongBPM returned 500 — add <code className="font-mono">GETSONGBPM_API_KEY</code> to{' '}
              <code className="font-mono">.env.local</code> and restart the dev server.
            </p>
          )}
        </SectionCard>

        {/* iTunes Search */}
        <SectionCard title="1 · iTunes Search  →  /api/search">
          <input
            type="text"
            placeholder="Search for a song..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none
              focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
          <p className="mt-1.5 text-xs text-zinc-400">Debounced 400ms — results update as you type</p>

          {searchLoading && (
            <p className="mt-4 text-sm text-zinc-400">Searching...</p>
          )}
          {searchError && (
            <p className="mt-4 text-sm text-red-600">{searchError}</p>
          )}

          {tracks.length > 0 && (
            <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
              {tracks.map(t => (
                <li key={t.trackId}>
                  <button
                    onClick={() => setSelected(t)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50
                      ${selected?.trackId === t.trackId ? 'bg-zinc-100' : 'bg-white'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artworkUrl(t, 300)}
                      alt={t.collectionName}
                      width={40}
                      height={40}
                      className="rounded-md flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{t.trackName}</p>
                      <p className="truncate text-xs text-zinc-500">{t.artistName} · {t.collectionName}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-zinc-400">{msToMin(t.trackTimeMillis)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* BPM + Key */}
        <SectionCard title="2 · BPM + Key  →  /api/track-meta">
          {!selected ? (
            <p className="text-sm text-zinc-400">Select a track above to fetch its BPM and musical key.</p>
          ) : (
            <div>
              <p className="text-sm text-zinc-600 mb-4">
                Looking up: <span className="font-medium text-zinc-900">{selected.trackName}</span>{' '}
                by <span className="font-medium text-zinc-900">{selected.artistName}</span>
              </p>

              {meta.loading && <p className="text-sm text-zinc-400">Fetching from GetSongBPM...</p>}

              {meta.error && (
                <p className="text-sm text-red-600">{meta.error}</p>
              )}

              {meta.data && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'BPM',       value: meta.data.bpm },
                    { label: 'Key',       value: meta.data.key },
                    { label: 'Open Key',  value: meta.data.openKey },
                    { label: 'Time Sig',  value: meta.data.timeSig },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-center">
                      <p className="text-xs text-zinc-400">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* QR Code */}
        <SectionCard title="3 · QR Code  →  /api/qrcode">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={qrEventId}
              onChange={e => setQrEventId(e.target.value)}
              placeholder="Event ID"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none
                focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
            <button
              onClick={generateQR}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white
                hover:bg-zinc-700 transition-colors"
            >
              Generate
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            Will generate a QR pointing to <code className="font-mono">APP_URL/join/{'<eventId>'}</code>
          </p>

          {qrSrc && (
            <div className="mt-4 flex flex-col items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="QR code" width={200} height={200} className="rounded-xl border border-zinc-200" />
              <a
                href={qrSrc}
                download="playd-qr.png"
                className="text-xs text-zinc-500 underline hover:text-zinc-800"
              >
                Download PNG
              </a>
            </div>
          )}
        </SectionCard>

        {/* Raw response inspector */}
        {selected && (
          <SectionCard title="Raw iTunes Response (selected track)">
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-green-400">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </SectionCard>
        )}

      </div>
    </div>
  )
}
