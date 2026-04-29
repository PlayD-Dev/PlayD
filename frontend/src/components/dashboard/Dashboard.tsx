"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Clock3,
  Funnel,
  Music2,
  TrendingUp,
  Headphones,
  Check,
  Eye,
  Save,
  XCircle,
  QrCode,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { DetailStat } from "@/components/dashboard/DetailStat";
import { PaidBadge } from "@/components/dashboard/PaidBadge";
import { RequestCard } from "@/components/dashboard/RequestCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/lib/supabase";
import type { DashboardRequest, RequestStatus } from "@/lib/requests";
import {
  formatWaitFromSubmittedAt,
  getPaidOrFree,
  formatCurrency,
  sortRequests,
  type RequestFilter,
  type SortKey,
} from "@/lib/utils";

const typeFilters: Array<{
  label: string;
  value: RequestFilter;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { label: "All", value: "all", icon: Funnel },
  { label: "Paid", value: "paid", icon: Funnel },
  { label: "Free", value: "free", icon: Funnel },
];

const sortFilters: Array<{
  label: string;
  value: SortKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { label: "Priority", value: "priority", icon: TrendingUp },
  { label: "Time", value: "time", icon: Clock3 },
  { label: "BPM", value: "bpm", icon: Music2 },
];

type PastEvent = {
  id: string;
  name: string;
  event_code: string;
  started_at: string;
  ended_at: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMins = Math.round(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type SetlistEntry = {
  id: string;
  status: string;
  submitted_at: string;
  resolved_at: string | null;
  priority_score: number | null;
  track_data: {
    title?: string;
    artist?: string;
    albumArt?: string;
    bpm?: number | null;
    key?: string | null;
  };
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  played:  { label: "Played",    className: "bg-green-500/15 text-green-400 border-green-500/20" },
  skipped: { label: "Skipped",   className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  saved:   { label: "Saved",     className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  seen:    { label: "Seen",      className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  pending: { label: "Requested", className: "bg-white/5 text-zinc-500 border-white/10" },
};

function HistoryModal({
  event,
  onClose,
}: {
  event: PastEvent;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<SetlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("requests")
      .select("id, status, submitted_at, resolved_at, priority_score, track_data")
      .eq("event_id", event.id)
      .order("submitted_at", { ascending: true })
      .then(({ data }) => {
        setEntries((data ?? []) as SetlistEntry[]);
        setLoading(false);
      });
  }, [event.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f1623] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{event.name}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {formatDate(event.started_at)}
              {event.ended_at && <span> · {formatDuration(event.started_at, event.ended_at)}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 shrink-0 text-zinc-500 transition hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Setlist */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3.5 rounded-2xl bg-white/5 p-3.5">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="text-4xl opacity-30">♪</div>
              <p className="text-sm text-zinc-500">No songs were played at this event.</p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="flex flex-col gap-2">
              {entries.map((entry, index) => {
                const track = entry.track_data ?? {};
                const badge = STATUS_BADGE[entry.status];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5"
                  >
                    {/* Index */}
                    <span className="w-5 shrink-0 text-center text-xs text-zinc-600">
                      {index + 1}
                    </span>

                    {/* Album art */}
                    {track.albumArt ? (
                      <Image
                        src={track.albumArt}
                        alt={track.title ?? ""}
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-600">
                        <Music2 className="h-5 w-5" />
                      </div>
                    )}

                    {/* Track info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {track.title ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {track.artist ?? "Unknown artist"}
                        {track.bpm ? <span> · {track.bpm} BPM</span> : null}
                      </p>
                    </div>

                    {/* Status badge */}
                    {badge && (
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}

                    {/* Boost */}
                    {(entry.priority_score ?? 0) > 0 && (
                      <span className="shrink-0 text-xs font-semibold text-[#b72959]">
                        +${entry.priority_score}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {!loading && entries.length > 0 && (
          <div className="border-t border-white/5 px-6 py-3 text-xs text-zinc-600">
            {entries.length} total ·{" "}
            {entries.filter(e => e.status === "played").length} played ·{" "}
            {entries.filter(e => e.status === "skipped").length} skipped ·{" "}
            {entries.filter(e => e.status === "pending").length} unreplied
          </div>
        )}
      </div>
    </div>
  );
}

type DashboardProps = {
  eventId: string | null;
  eventCode: string | null;
  djId: string;
  onLogout: () => void;
  onEventCreated: (id: string, code: string) => void;
  onEventEnded: () => void;
};

// Maps a Supabase requests row (with track_data jsonb + guest_sessions) to DashboardRequest
function mapRow(row: Record<string, unknown>): DashboardRequest {
  const track = (row.track_data ?? {}) as Record<string, unknown>;
  const session = (row.guest_sessions ?? {}) as Record<string, unknown>;
  const id = String(row.id);
  return {
    id,
    requestIds: [id],
    spotifyId: String(track.spotifyId ?? ""),
    requestCount: 1,
    title: String(track.title ?? ""),
    artist: String(track.artist ?? ""),
    requesterName: String(session.display_name ?? "Guest"),
    message: row.message ? String(row.message) : undefined,
    paidAmount:
      typeof row.priority_score === "number" && row.priority_score > 0
        ? row.priority_score
        : null,
    submittedAt: String(row.submitted_at ?? new Date().toISOString()),
    status: (row.status ?? "pending") as RequestStatus,
    priorityScore:
      typeof row.priority_score === "number" ? row.priority_score : null,
    bpm: track.bpm != null ? Number(track.bpm) : null,
    key: track.key ? String(track.key) : null,
  };
}

/** Merge requests for the same song into one entry, keeping highest-priority as primary. */
function groupBySpotifyId(requests: DashboardRequest[]): DashboardRequest[] {
  const groups = new Map<string, DashboardRequest[]>();
  for (const req of requests) {
    const key = req.spotifyId || req.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(req);
  }
  return Array.from(groups.values()).map((group) => {
    const primary = group[0];
    const totalPaid = group.reduce((sum, r) => sum + (r.paidAmount ?? 0), 0);
    const totalPriority = group.reduce((sum, r) => sum + (r.priorityScore ?? 0), 0);
    return {
      ...primary,
      requestIds: group.map((r) => r.id),
      requestCount: group.length,
      paidAmount: totalPaid > 0 ? totalPaid : null,
      priorityScore: totalPriority,
    };
  });
}

const CARD_ENTRY_DURATION_MS = 620;
const CARD_STAGGER_DELAY_MS = 72;

/** Main DJ dashboard view that manages request state, filters, sorting, and selection. */
export function Dashboard({ eventId, eventCode, djId, onLogout, onEventCreated, onEventEnded }: DashboardProps) {
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [typeFilter, setTypeFilter] = useState<RequestFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [selectedId, setSelectedId] = useState<string>("");
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousCardTops = useRef<Map<string, number>>(new Map());
  const isFirstListPaint = useRef(true);
  const pendingEntryCleanup = useRef<number[]>([]);

  // Event creation state
  const [eventName, setEventName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // End event state
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // QR modal state
  const [showQR, setShowQR] = useState(false);

  // Past events state
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [selectedPastEvent, setSelectedPastEvent] = useState<PastEvent | null>(null);

  // Fetch past events whenever there is no live event
  useEffect(() => {
    if (eventId) return;

    supabase
      .from("events")
      .select("id, name, event_code, started_at, ended_at")
      .eq("dj_id", djId)
      .eq("status", "ended")
      .order("ended_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPastEvents(data as PastEvent[]);
      });
  }, [eventId, djId]);

  // Initial fetch + Supabase Realtime subscription
  useEffect(() => {
    if (!eventId) {
      setRequests([]);
      setSelectedId("");
      return;
    }

    // 1. Load existing pending requests
    supabase
      .from("requests")
      .select("*, guest_sessions(display_name)")
      .eq("event_id", eventId)
      .eq("status", "pending")
      .order("priority_score", { ascending: false })
      .order("submitted_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          const mapped = data.map(mapRow);
          setRequests(mapped);
          setSelectedId(mapped[0]?.id ?? "");
        }
      });

    // 2. Subscribe to real-time changes on this event's requests
    const channel = supabase
      .channel(`requests:event:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "requests",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // Fetch the full row with joins since INSERT payload lacks track/session data
          supabase
            .from("requests")
            .select("*, guest_sessions(display_name)")
            .eq("id", (payload.new as { id: string }).id)
            .single()
            .then(({ data }) => {
              if (data) {
                setRequests((prev) => [mapRow(data as Record<string, unknown>), ...prev]);
                setSelectedId((prev) => prev || (data as { id: string }).id);
              }
            });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // Remove updated request from the pending queue (it was acted on)
          setRequests((prev) =>
            prev.filter((r) => r.id !== (payload.new as { id: string }).id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const filteredRequests = useMemo(() => {
    const sorted = sortRequests(requests, sortKey);
    const grouped = groupBySpotifyId(sorted);
    return typeFilter === "all"
      ? grouped
      : grouped.filter((request) => getPaidOrFree(request) === typeFilter);
  }, [requests, typeFilter, sortKey]);

  const fallbackRequest = filteredRequests[0] ?? null;
  const activeRequest =
    filteredRequests.find((request) => request.id === selectedId) ??
    fallbackRequest;

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const activeCards = filteredRequests
      .map((request) => ({
        id: request.id,
        node: cardRefs.current.get(request.id) ?? null,
      }))
      .filter(
        (card): card is { id: string; node: HTMLDivElement } => card.node !== null,
      );

    pendingEntryCleanup.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pendingEntryCleanup.current = [];

    const nextCardTops = new Map<string, number>();

    activeCards.forEach(({ id, node }) => {
      nextCardTops.set(id, node.getBoundingClientRect().top);
    });

    if (mediaQuery.matches) {
      previousCardTops.current = nextCardTops;
      isFirstListPaint.current = false;
      return;
    }

    activeCards.forEach(({ id, node }, index) => {
      const previousTop = previousCardTops.current.get(id);
      const currentTop = nextCardTops.get(id) ?? 0;
      const isNewCard = isFirstListPaint.current || previousTop === undefined;

      node.classList.remove("request-card-enter");
      node.style.removeProperty("--request-card-delay");
      node.style.willChange = "transform, opacity";

      if (!isNewCard && previousTop !== undefined) {
        const deltaY = previousTop - currentTop;

        if (Math.abs(deltaY) > 1) {
          node.style.transition = "none";
          node.style.transform = `translate3d(0, ${deltaY}px, 0)`;

          window.requestAnimationFrame(() => {
            node.style.transition =
              "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 280ms ease";
            node.style.transform = "";
          });
        }
      }

      if (isNewCard) {
        void node.offsetWidth;
        node.style.setProperty("--request-card-delay", `${index * CARD_STAGGER_DELAY_MS}ms`);
        node.classList.add("request-card-enter");

        const timeoutId = window.setTimeout(() => {
          node.classList.remove("request-card-enter");
          node.style.removeProperty("--request-card-delay");
          node.style.removeProperty("will-change");
        }, CARD_ENTRY_DURATION_MS + index * CARD_STAGGER_DELAY_MS + 120);

        pendingEntryCleanup.current.push(timeoutId);
        return;
      }

      const settleTimeoutId = window.setTimeout(() => {
        node.style.removeProperty("transition");
        node.style.removeProperty("will-change");
      }, 620);

      pendingEntryCleanup.current.push(settleTimeoutId);
    });

    previousCardTops.current = nextCardTops;
    isFirstListPaint.current = false;

    return () => {
      pendingEntryCleanup.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingEntryCleanup.current = [];
    };
  }, [filteredRequests]);

  const totalRequests = requests.length;
  const paidBoosts = requests.filter((request) => (request.paidAmount ?? 0) > 0).length;
  const freeRequests = requests.filter((request) => (request.paidAmount ?? 0) === 0).length;

  function handleRequestAction(requestIds: string[], status: RequestStatus) {
    const idSet = new Set(requestIds);

    // Optimistically remove all IDs in the group from local state
    setRequests((current) => {
      const updated = current.filter((request) => !idSet.has(request.id));

      const currentGrouped = groupBySpotifyId(sortRequests(
        typeFilter === "all"
          ? current
          : current.filter((request) => getPaidOrFree(request) === typeFilter),
        sortKey,
      ));

      const currentIndex = currentGrouped.findIndex(
        (request) => request.requestIds.some((id) => idSet.has(id)),
      );

      const nextGrouped = groupBySpotifyId(sortRequests(
        typeFilter === "all"
          ? updated
          : updated.filter((request) => getPaidOrFree(request) === typeFilter),
        sortKey,
      ));

      const nextSelected =
        nextGrouped[currentIndex] ??
        nextGrouped[currentIndex - 1] ??
        nextGrouped[0] ??
        null;

      setSelectedId(nextSelected?.id ?? "");

      return updated;
    });

    // Patch all IDs in the group (fire-and-forget)
    requestIds.forEach((id) => {
      fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).catch(console.error);
    });
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ djId, name: eventName }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCreateError(body.error ?? "Failed to create event");
      setIsCreating(false);
      return;
    }

    const { id, event_code } = await res.json();
    setIsCreating(false);
    onEventCreated(id, event_code);
  }

  async function handleEndEvent() {
    if (!eventId) return;
    if (!window.confirm("End this event? This will clear the queue and close guest access.")) return;

    setIsEnding(true);
    setEndError(null);

    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setEndError(body.error ?? "Failed to end event. Try again.");
      setIsEnding(false);
      return;
    }

    setIsEnding(false);
    onEventEnded();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = eventId ? `${appUrl}/join/${eventId}` : null;

  return (
    <main className="min-h-screen bg-[#020202] px-6 py-7 text-white md:px-8">
      {/* Past event history modal */}
      {selectedPastEvent && (
        <HistoryModal
          event={selectedPastEvent}
          onClose={() => setSelectedPastEvent(null)}
        />
      )}

      {/* QR Code modal */}
      {showQR && eventId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <div
            className="relative rounded-3xl border border-white/10 bg-[#0f1623] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQR(false)}
              className="absolute right-4 top-4 text-zinc-500 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-1 text-lg font-semibold text-white">Scan to join</h2>
            <p className="mb-5 text-sm text-zinc-400">Show this to your crowd</p>
            <div className="overflow-hidden rounded-2xl bg-white p-3">
              <Image
                src={`/api/qrcode?eventId=${eventId}`}
                alt="Event QR code"
                width={280}
                height={280}
                unoptimized
              />
            </div>

            {/* Event code — guests can type this at playd.com/guest/login */}
            {eventCode && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="mb-1 text-xs text-zinc-500 uppercase tracking-widest">Event code</p>
                <p className="text-3xl font-bold tracking-[0.3em] text-white">{eventCode}</p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
              <span className="flex-1 truncate text-sm text-zinc-300">{joinUrl}</span>
              <button
                type="button"
                onClick={() => joinUrl && navigator.clipboard.writeText(joinUrl)}
                className="shrink-0 text-xs font-medium text-zinc-400 transition hover:text-white"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex items-center justify-between gap-4">
          {eventId ? (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-medium text-[#aab7d8] transition hover:text-white"
            >
              <span aria-hidden="true" className="text-lg">←</span>
              <span>Exit Dashboard</span>
            </Link>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-4">
            {eventId && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQR(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </button>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={handleEndEvent}
                    disabled={isEnding}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-900/40 hover:text-red-300 disabled:opacity-50"
                  >
                    {isEnding ? "Ending..." : "End Event"}
                  </button>
                  {endError && (
                    <span className="text-xs text-red-400">{endError}</span>
                  )}
                </div>
                <div className="inline-flex items-center gap-2 text-base text-white">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b72959] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#b72959]" />
                  </span>
                  <span className="text-base font-medium text-[#f5f7fb]">Live</span>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                onLogout();
              }}
              className="text-sm font-medium text-zinc-500 transition hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <Headphones className="h-12 w-12 text-[#a61e4d]" />
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{eventId ? "Dashboard" : "Event Manager"}</h1>
        </div>

        {/* No active event — show create form + past events */}
        {!eventId && (
          <div className="mx-auto max-w-sm">
            {/* Create form */}
            <div className="mb-10 text-center">
              <div className="mb-4 text-6xl opacity-40">♪</div>
              <p className="mb-1 text-xl font-semibold text-white">Start a new event</p>
              <p className="mb-8 text-sm text-zinc-500">Give your event a name and go live. Guests scan the QR code to join.</p>
              <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 text-left">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">Event name</label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Friday Night at Venue"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none transition focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40"
                  />
                </div>
                {createError && <p className="text-sm text-red-400">{createError}</p>}
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-lg bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {isCreating ? "Going live..." : "Go Live"}
                </button>
              </form>
            </div>

            {/* Past events */}
            {pastEvents.length > 0 && (
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  Past Events
                </p>
                <div className="flex flex-col gap-3">
                  {pastEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedPastEvent(event)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#10151d] px-5 py-4 text-left transition hover:border-white/10 hover:bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{event.name}</p>
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {formatDate(event.started_at)}
                          {event.ended_at && (
                            <span> · {formatDuration(event.started_at, event.ended_at)}</span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold tracking-widest text-zinc-400">
                        {event.event_code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active event — show stats, filters, and queue */}
        {eventId && (
          <>
            <section className="mb-7 grid gap-5 md:grid-cols-3">
              <StatCard label="Total Requests" value={totalRequests} />
              <StatCard label="Paid Boosts" value={paidBoosts} highlight />
              <StatCard label="Free Requests" value={freeRequests} />
            </section>

            <section className="mb-7 flex flex-wrap gap-4">
              <div className="inline-flex gap-2 rounded-2xl border border-[#5f7bc838] bg-[#10151d] p-2">
                {typeFilters.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setTypeFilter(filter.value)}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition ${
                        typeFilter === filter.value
                          ? "bg-gradient-to-b from-[#b72959] to-[#8f1a44] text-white"
                          : "text-[#b8c2db] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{filter.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex gap-2 rounded-2xl border border-[#5f7bc838] bg-[#10151d] p-2">
                {sortFilters.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSortKey(filter.value)}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition ${
                        sortKey === filter.value
                          ? "bg-gradient-to-b from-[#b72959] to-[#8f1a44] text-white"
                          : "text-[#b8c2db] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{filter.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-7 xl:grid-cols-[1fr_0.95fr]">
              <div className="flex flex-col gap-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(request.id, node);
                        return;
                      }
                      cardRefs.current.delete(request.id);
                    }}
                    className="request-card-shell"
                  >
                    <RequestCard
                      request={request}
                      isSelected={activeRequest?.id === request.id}
                      onClick={() => setSelectedId(request.id)}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-[#5f7bc838] bg-[#10151d] p-7 xl:sticky xl:top-6">
                {activeRequest ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mb-2 text-[1.7rem] font-semibold tracking-tight">
                          {activeRequest.title}
                        </h2>
                        <p className="mb-1 text-lg text-[#b6c0d6]">{activeRequest.artist}</p>
                        <span className="text-sm text-[#7f8db2]">
                          Requested by {activeRequest.requesterName}
                          {activeRequest.requestCount > 1 && (
                            <span> + {activeRequest.requestCount - 1} other{activeRequest.requestCount > 2 ? "s" : ""}</span>
                          )}
                        </span>
                      </div>
                      {getPaidOrFree(activeRequest) === "paid" ? (
                        <PaidBadge
                          label={formatCurrency(activeRequest.paidAmount)}
                          className="shrink-0"
                        />
                      ) : null}
                    </div>

                    <div className="my-7 grid gap-4 md:grid-cols-3">
                      <DetailStat label="🥁 BPM" value={activeRequest.bpm ? String(activeRequest.bpm) : "—"} />
                      <DetailStat label="🎵 Key" value={activeRequest.key ?? "—"} />
                      <DetailStat label="Wait" value={formatWaitFromSubmittedAt(activeRequest.submittedAt)} />
                    </div>

                    {activeRequest.message?.trim() && (
                      <div className="mb-5 rounded-3xl border border-[#5f7bc82e] bg-black/70 p-5">
                        <span className="text-xs text-[#7f8db2]">Message</span>
                        <p className="mt-3 text-base">{activeRequest.message}</p>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <ActionButton
                        label="Mark Seen"
                        tone="blue"
                        icon={Eye}
                        onClick={() => handleRequestAction(activeRequest.requestIds, "seen")}
                      />
                      <ActionButton
                        label="Save"
                        tone="amber"
                        icon={Save}
                        onClick={() => handleRequestAction(activeRequest.requestIds, "saved")}
                      />
                      <ActionButton
                        label="Play"
                        tone="green"
                        icon={Check}
                        onClick={() => handleRequestAction(activeRequest.requestIds, "played")}
                      />
                      <ActionButton
                        label="Skip"
                        tone="red"
                        icon={XCircle}
                        onClick={() => handleRequestAction(activeRequest.requestIds, "skipped")}
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid min-h-[420px] place-items-center text-center text-[#7f8db2]">
                    <div>
                      <div className="mb-3 text-6xl opacity-40">♪</div>
                      <p>Select a request to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
