"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { DetailStat } from "@/components/dashboard/DetailStat";
import { PaidBadge } from "@/components/dashboard/PaidBadge";
import { RequestCard } from "@/components/dashboard/RequestCard";
import { StatCard } from "@/components/dashboard/StatCard";
import type { DashboardRequest } from "@/lib/requests";
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

type DashboardProps = {
  initialRequests: DashboardRequest[];
};

const CARD_ENTRY_DURATION_MS = 620;
const CARD_STAGGER_DELAY_MS = 72;

/** Main DJ dashboard view that manages request state, filters, sorting, and selection. */
export function Dashboard({ initialRequests }: DashboardProps) {
  const [requests, setRequests] = useState<DashboardRequest[]>(initialRequests);
  const [typeFilter, setTypeFilter] = useState<RequestFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [selectedId, setSelectedId] = useState<string>(
    initialRequests[0]?.id ?? "",
  );
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousCardTops = useRef<Map<string, number>>(new Map());
  const isFirstListPaint = useRef(true);
  const pendingEntryCleanup = useRef<number[]>([]);

  const filteredRequests = useMemo(() => {
    const byType =
      typeFilter === "all"
        ? requests
        : requests.filter((request) => getPaidOrFree(request) === typeFilter);

    return sortRequests(byType, sortKey);
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

  function handleRequestAction(id: string) {
    setRequests((current) => {
      const updated = current.filter((request) => request.id !== id);

      const currentVisibleRequests = sortRequests(
        (
          typeFilter === "all"
            ? current
            : current.filter((request) => getPaidOrFree(request) === typeFilter)
        ),
        sortKey,
      );

      const currentIndex = currentVisibleRequests.findIndex(
        (request) => request.id === id,
      );

      const nextVisibleRequests = sortRequests(
        (
          typeFilter === "all"
            ? updated
            : updated.filter((request) => getPaidOrFree(request) === typeFilter)
        ),
        sortKey,
      );

      const nextSelected =
        nextVisibleRequests[currentIndex] ??
        nextVisibleRequests[currentIndex - 1] ??
        nextVisibleRequests[0] ??
        null;

      setSelectedId(nextSelected?.id ?? "");

      return updated;
    });
  }

  return (
    <main className="min-h-screen bg-[#020202] px-6 py-7 text-white md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-medium text-[#aab7d8] transition hover:text-white"
          >
            <span aria-hidden="true" className="text-lg">
              ←
            </span>
            <span>Exit Dashboard</span>
          </Link>

          <div className="inline-flex items-center gap-2 text-base text-white">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b72959] opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#b72959]" />
            </span>
            <span className="text-base font-medium text-[#f5f7fb]">Live</span>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <Headphones className="h-12 w-12 text-[#a61e4d]" />
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Dashboard
          </h1>
        </div>

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
                    <p className="mb-1 text-lg text-[#b6c0d6]">
                      {activeRequest.artist}
                    </p>
                    <span className="text-sm text-[#7f8db2]">
                      Requested by {activeRequest.requesterName}
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
                  <DetailStat
                    label="BPM"
                    value={activeRequest.bpm ? String(activeRequest.bpm) : "—"}
                  />
                  <DetailStat
                    label="Key"
                    value={activeRequest.key ?? "—"}
                  />
                  <DetailStat
                    label="Wait"
                    value={formatWaitFromSubmittedAt(activeRequest.submittedAt)}
                  />
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
                    onClick={() => handleRequestAction(activeRequest.id)}
                  />
                  <ActionButton
                    label="Save"
                    tone="amber"
                    icon={Save}
                    onClick={() => handleRequestAction(activeRequest.id)}
                  />
                  <ActionButton
                    label="Play"
                    tone="green"
                    icon={Check}
                    onClick={() => handleRequestAction(activeRequest.id)}
                  />
                  <ActionButton
                    label="Skip"
                    tone="red"
                    icon={XCircle}
                    onClick={() => handleRequestAction(activeRequest.id)}
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
      </div>
    </main>
  );
}
