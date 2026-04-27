"use client";

import { useState, useEffect, useCallback } from "react";
import { Music, Disc3, CheckCircle2 } from "lucide-react";
import type { SpotifyTrack } from "@/lib/spotify";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchBar } from "./SearchBar";
import { TrackCard } from "./TrackCard";
import { SongDetailModal } from "./SongDetailModal";
import { supabase } from "@/lib/supabase";

type RequestPageProps = {
  eventId: string;
  eventName: string;
};

type StoredSession = {
  sessionId: string;
  displayName: string;
};

type Toast = {
  id: string;
  message: string;
};

function sessionKey(eventId: string) {
  return `playd:session:${eventId}`;
}

function loadStoredSession(eventId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(eventId));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(eventId: string, session: StoredSession) {
  try {
    localStorage.setItem(sessionKey(eventId), JSON.stringify(session));
  } catch {
    // localStorage unavailable (private browsing, etc.) — proceed without persistence
  }
}

export function RequestPage({ eventId, eventName }: RequestPageProps) {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Name prompt state
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  // Request modal state
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [message, setMessage] = useState("");
  const [boostAmount, setBoostAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Realtime state
  const [eventEnded, setEventEnded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ─── Session bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = loadStoredSession(eventId);
    if (!stored) {
      setShowNamePrompt(true);
      return;
    }

    // Validate stored session still exists in DB (it gets deleted when event ends)
    fetch(`/api/sessions?id=${stored.sessionId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.valid) {
          setSessionId(stored.sessionId);
          setDisplayName(stored.displayName);
        } else {
          // Session was deleted (event ended and restarted, or expired) — ask for name again
          try { localStorage.removeItem(sessionKey(eventId)); } catch { /* ignore */ }
          setShowNamePrompt(true);
        }
      })
      .catch(() => {
        // Network error — optimistically use stored session, let submit fail with proper error if needed
        setSessionId(stored.sessionId);
        setDisplayName(stored.displayName);
      });
  }, [eventId]);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;

    setSessionLoading(true);
    setSessionError(null);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, displayName: name }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSessionError(body.error ?? "Couldn't join event. Try again.");
      setSessionLoading(false);
      return;
    }

    const data = await res.json();
    const session: StoredSession = { sessionId: data.sessionId, displayName: name };
    saveStoredSession(eventId, session);
    setSessionId(data.sessionId);
    setDisplayName(name);
    setShowNamePrompt(false);
    setSessionLoading(false);
  }

  // ─── Supabase Realtime ──────────────────────────────────────────────────────

  // Watch for the event ending so we can show the overlay mid-session
  useEffect(() => {
    const channel = supabase
      .channel(`event:status:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          if (updated.status === "ended") setEventEnded(true);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // Watch for status updates on this guest's requests
  useEffect(() => {
    if (!sessionId) return;

    const STATUS_MESSAGES: Record<string, string> = {
      seen:    "👀 The DJ has seen your request",
      played:  "🎵 Your song is playing!",
      skipped: "⏭ Your request was skipped",
      saved:   "🔖 DJ saved your request for later",
    };

    const channel = supabase
      .channel(`requests:session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          const msg = updated.status ? STATUS_MESSAGES[updated.status] : null;
          if (!msg) return;

          const id = Math.random().toString(36).slice(2);
          setToasts((prev) => [...prev, { id, message: msg }]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // ─── Spotify search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTracks([]);
      setSearchError(null);
      return;
    }
    const ac = new AbortController();
    setSearchLoading(true);
    setSearchError(null);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setTracks(d.tracks ?? []);
      })
      .catch((e) => { if (e.name !== "AbortError") setSearchError(e.message); })
      .finally(() => setSearchLoading(false));
    return () => ac.abort();
  }, [debouncedQuery]);

  const handleClose = useCallback(() => {
    setSelectedTrack(null);
    setMessage("");
    setBoostAmount(0);
    setSubmitError(null);
  }, []);

  // ─── Submit request ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedTrack || !sessionId) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, sessionId, track: selectedTrack, message, boostAmount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); handleClose(); }, 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to send request. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedTrack, eventId, sessionId, message, boostAmount, handleClose]);

  // ─── Name prompt ─────────────────────────────────────────────────────────────
  if (showNamePrompt) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#020202] px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#b72959]/8 to-transparent" />
        <div className="relative w-full max-w-sm">
          <div className="mb-6 text-center">
            <Disc3 className="mx-auto mb-3 h-8 w-8 text-[#b72959]" />
            <h1 className="text-2xl font-bold text-white">{eventName}</h1>
            <p className="mt-1 text-sm text-[#7f8db2]">What should the DJ call you?</p>
          </div>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              required
              autoFocus
              maxLength={32}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40"
            />
            {sessionError && <p className="text-sm text-red-400">{sessionError}</p>}
            <button
              type="submit"
              disabled={sessionLoading || !nameInput.trim()}
              className="rounded-xl bg-gradient-to-b from-[#b72959] to-[#8f1a44] py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {sessionLoading ? "Joining..." : "Join Event"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Event ended overlay (shown mid-session if DJ ends the event) ────────────
  if (eventEnded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020202] px-6 text-center">
        <div className="text-5xl opacity-30">♪</div>
        <h1 className="text-2xl font-bold text-white">{eventName}</h1>
        <p className="text-[#7f8db2]">This event has ended.</p>
        <p className="text-sm text-zinc-600">Thanks for being part of the crowd!</p>
      </div>
    );
  }

  // ─── Main request UI ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#020202] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#b72959]/8 to-transparent" />

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-full border border-white/10 bg-[#0f1623]/95 px-5 py-2.5 text-sm font-medium text-white shadow-xl backdrop-blur-sm"
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="relative mx-auto max-w-lg px-5 pb-10 pt-8">
        {/* Header */}
        <header className="mb-7">
          <div className="mb-1 flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-[#b72959]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#b72959]">
              Live Event
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{eventName}</h1>
          <p className="mt-1.5 text-[15px] text-[#7f8db2]">
            Hey, {displayName} &mdash; request a song for the DJ
          </p>
        </header>

        {/* Search */}
        <div className="mb-5">
          <SearchBar value={query} onChange={setQuery} loading={searchLoading} />
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3">
          {searchError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {searchError}
            </div>
          )}

          {!query.trim() && !tracks.length && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10151d] border border-[#5f7bc838]">
                <Music className="h-7 w-7 text-[#5a6785]" />
              </div>
              <p className="text-sm text-[#5a6785]">Search for a song to request</p>
            </div>
          )}

          {searchLoading && !tracks.length && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3.5 rounded-2xl border border-[#2b3139] bg-[#10151d] p-3.5">
                  <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-xl bg-[#5f7bc838]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#5f7bc838]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#5f7bc838]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.trim() && !searchLoading && !searchError && tracks.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-[#5a6785]">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {tracks.map((track, index) => (
            <TrackCard
              key={track.id}
              track={track}
              onClick={() => setSelectedTrack(track)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Song detail modal */}
      {selectedTrack && !submitted && (
        <SongDetailModal
          track={selectedTrack}
          message={message}
          onMessageChange={setMessage}
          boostAmount={boostAmount}
          onBoostChange={setBoostAmount}
          onSubmit={handleSubmit}
          onClose={handleClose}
          submitting={submitting}
          error={submitError}
        />
      )}

      {/* Success overlay */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm modal-backdrop-enter">
          <div className="flex flex-col items-center gap-4 modal-sheet-enter">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#b72959] to-[#8f1a44] shadow-[0_0_40px_rgba(183,41,89,0.5)]">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <p className="text-lg font-bold text-white">Request Sent!</p>
            <p className="text-sm text-[#b8c2db]">The DJ has your request</p>
          </div>
        </div>
      )}
    </main>
  );
}
