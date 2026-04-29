import { MessageSquare } from "lucide-react";
import { PaidBadge } from "@/components/dashboard/PaidBadge";
import type { DashboardRequest } from "@/lib/requests";
import {
  formatTimeAgo,
  getPaidOrFree,
} from "@/lib/utils";

type RequestCardProps = {
  request: DashboardRequest;
  isSelected: boolean;
  onClick: () => void;
};

/** Clickable list card that previews a single request in the dashboard queue. */
export function RequestCard({
  request,
  isSelected,
  onClick,
}: RequestCardProps) {
  const requestType = getPaidOrFree(request);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border bg-[#10151d] p-6 text-left text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${
        isSelected
          ? "border-[#a61e4d] shadow-[0_0_0_1px_rgba(166,30,77,0.22)]"
          : "border-[#2b3139] hover:border-[#3a414b]"
      }`}
    >
      <div className="flex items-start justify-between gap-4 max-md:flex-col">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-[1.35rem] font-semibold tracking-tight">{request.title}</h3>

          {requestType === "paid" && (
            <PaidBadge label="Paid" />
          )}
        </div>

        <span className="text-base text-[#7f8db2]">
          {formatTimeAgo(request.submittedAt)}
        </span>
      </div>

      <p className="mb-5 mt-2 text-base text-[#aeb8cf]">{request.artist}</p>

      <div className="flex flex-wrap items-center gap-5 text-base text-[#bcc6df]">
        <span className="inline-flex items-center gap-1.5">
          <span>🥁</span>
          <span>{request.bpm ?? "—"} BPM</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span>🎵</span>
          <span>{request.key ?? "—"}</span>
        </span>

        {request.requestCount > 1 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#b72959]/15 px-2 py-0.5 text-sm font-medium text-[#e06090]">
            {request.requestCount} guests
          </span>
        ) : (
          <span>{request.requesterName}</span>
        )}

        {request.message?.trim() ? (
          <MessageSquare className="h-4 w-4 text-[#a61e4d]" />
        ) : null}
      </div>
    </button>
  );
}
