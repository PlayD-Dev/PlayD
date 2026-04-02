import type { DashboardRequest } from "@/lib/requests";

/** Available filters for narrowing the visible request list. */
export type RequestFilter = "all" | "paid" | "free";

/** Available sort modes for ordering requests in the dashboard. */
export type SortKey = "priority" | "time" | "bpm";

/** Classifies a request by whether it has a paid boost amount. */
export function getPaidOrFree(request: DashboardRequest): "paid" | "free" {
  return (request.paidAmount ?? 0) > 0 ? "paid" : "free";
}

/** Formats a paid amount for display, falling back to "Free" when empty. */
export function formatCurrency(amount?: number | null): string {
  if (!amount || amount <= 0) return "Free";
  return `$${amount.toFixed(2)}`;
}

/** Converts a submission timestamp into a relative "time ago" label. */
export function formatTimeAgo(submittedAt: string): string {
  const submittedMs = new Date(submittedAt).getTime();
  const diffMs = Date.now() - submittedMs;
  const minutes = Math.max(0, Math.floor(diffMs / 1000 / 60));

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder > 0 ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
}

/** Converts a submission timestamp into a compact wait duration. */
export function formatWaitFromSubmittedAt(submittedAt: string): string {
  const submittedMs = new Date(submittedAt).getTime();
  const diffMs = Date.now() - submittedMs;
  const minutes = Math.max(0, Math.floor(diffMs / 1000 / 60));

  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

/** Returns an explicit priority score or derives one from boost amount and age. */
export function getPriorityScore(request: DashboardRequest): number {
  if (typeof request.priorityScore === "number") {
    return request.priorityScore;
  }

  const ageMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(request.submittedAt).getTime()) / 1000 / 60),
  );

  const paidWeight = (request.paidAmount ?? 0) * 100;
  return paidWeight - ageMinutes;
}

/** Sorts requests according to the active dashboard sort mode. */
export function sortRequests(
  requests: DashboardRequest[],
  sortKey: SortKey,
): DashboardRequest[] {
  const sorted = [...requests];

  if (sortKey === "priority") {
    sorted.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  }

  if (sortKey === "time") {
    sorted.sort(
      (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    );
  }

  if (sortKey === "bpm") {
    sorted.sort((a, b) => (b.bpm ?? -1) - (a.bpm ?? -1));
  }

  return sorted;
}
