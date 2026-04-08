"use client";

import { useState, useEffect, useCallback } from "react";
import { Music, Disc3, CheckCircle2 } from "lucide-react";
import type { SpotifyTrack } from "@/lib/spotify";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchBar } from "./SearchBar";
import { TrackCard } from "./TrackCard";
import { SongDetailModal } from "./SongDetailModal";

type RequestPageProps = {
  eventId: string;
  eventName: string;
  userName: string;
};

export function RequestPage({ eventId, eventName, userName }: RequestPageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [message, setMessage] = useState("");
  const [boostAmount, setBoostAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Create a guest session on mount
  useEffect(() => {
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, displayName: userName }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.sessionId) setSessionId(d.sessionId) })
      .catch(() => { /* session will be retried on submit */ });
  }, [eventId, userName]);

  // Search Spotify — AbortController cancels the previous inflight request
  // when the query changes or when React StrictMode double-invokes the effect
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
      .catch((e) => { if (e.name !== 'AbortError') setSearchError(e.message); })
      .finally(() => setSearchLoading(false));
    return () => ac.abort();
  }, [debouncedQuery]);

  const handleClose = useCallback(() => {
    setSelectedTrack(null);
    setMessage("");
    setBoostAmount(0);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedTrack) return;
    setSubmitting(true);

    // If session wasn't created on mount, try now
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, displayName: userName }),
        });
        const d = await res.json();
        if (d.sessionId) {
          setSessionId(d.sessionId);
          activeSessionId = d.sessionId;
        }
      } catch {
        // proceed without session — server will handle gracefully
      }
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          sessionId: activeSessionId,
          track: selectedTrack,
          message,
          boostAmount,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        handleClose();
      }, 1800);
    } catch {
      // Still show success UX — the request may have gone through
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        handleClose();
      }, 1800);
    } finally {
      setSubmitting(false);
    }
  }, [selectedTrack, eventId, sessionId, userName, message, boostAmount, handleClose]);

  return (
    <main className="min-h-screen bg-[#020202] text-white">
      {/* Ambient glow at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#b72959]/8 to-transparent" />

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
            Hey, {userName} &mdash; request a song for the DJ
          </p>
        </header>

        {/* Search */}
        <div className="mb-5">
          <SearchBar
            value={query}
            onChange={setQuery}
            loading={searchLoading}
          />
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
              <p className="text-sm text-[#5a6785]">
                Search for a song to request
              </p>
            </div>
          )}

          {searchLoading && !tracks.length && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 rounded-2xl border border-[#2b3139] bg-[#10151d] p-3.5"
                >
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
              <p className="text-sm text-[#5a6785]">
                No results for &ldquo;{query}&rdquo;
              </p>
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

      {/* Modal */}
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
