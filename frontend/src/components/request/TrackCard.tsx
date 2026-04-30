"use client";

import { ChevronRight, CheckCircle2 } from "lucide-react";
import type { SpotifyTrack } from "@/lib/spotify";

type TrackCardProps = {
  track: SpotifyTrack;
  onClick: () => void;
  index: number;
  alreadyRequested?: boolean;
};

function msToMin(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function TrackCard({ track, onClick, index, alreadyRequested }: TrackCardProps) {
  const albumArt = track.album.images[1]?.url ?? track.album.images[0]?.url ?? "";
  const artist = track.artists[0]?.name ?? "";

  return (
    <button
      type="button"
      onClick={alreadyRequested ? undefined : onClick}
      disabled={alreadyRequested}
      style={{ "--request-card-delay": `${index * 60}ms` } as React.CSSProperties}
      className={`request-card-enter flex w-full items-center gap-3.5 rounded-2xl border bg-[#10151d] p-3.5 text-left transition-all duration-200 ${
        alreadyRequested
          ? "cursor-default border-[#b72959]/30 opacity-60"
          : "border-[#2b3139] hover:-translate-y-0.5 hover:border-[#3a414b] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] active:scale-[0.98]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={albumArt}
        alt={track.album.name}
        width={52}
        height={52}
        className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-tight text-white">
          {track.name}
        </p>
        <p className="mt-1 truncate text-[13px] leading-tight text-[#7f8db2]">
          {artist} &middot; {track.album.name}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {alreadyRequested ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#b72959]">
            <CheckCircle2 className="h-4 w-4" />
            Requested
          </span>
        ) : (
          <>
            <span className="text-xs tabular-nums text-[#5a6785]">
              {msToMin(track.duration_ms)}
            </span>
            <ChevronRight className="h-4 w-4 text-[#5a6785]" />
          </>
        )}
      </div>
    </button>
  );
}
