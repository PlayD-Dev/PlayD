"use client";

import { ChevronRight } from "lucide-react";
import type { ItunesTrack } from "@/lib/itunes";
import { artworkUrl } from "@/lib/itunes";

type TrackCardProps = {
  track: ItunesTrack;
  onClick: () => void;
  index: number;
};

function msToMin(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function TrackCard({ track, onClick, index }: TrackCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ "--request-card-delay": `${index * 60}ms` } as React.CSSProperties}
      className="request-card-enter flex w-full items-center gap-3.5 rounded-2xl border border-[#2b3139] bg-[#10151d] p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3a414b] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] active:scale-[0.98]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artworkUrl(track, 300)}
        alt={track.collectionName}
        width={52}
        height={52}
        className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-tight text-white">
          {track.trackName}
        </p>
        <p className="mt-1 truncate text-[13px] leading-tight text-[#7f8db2]">
          {track.artistName} &middot; {track.collectionName}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs tabular-nums text-[#5a6785]">
          {msToMin(track.trackTimeMillis)}
        </span>
        <ChevronRight className="h-4 w-4 text-[#5a6785]" />
      </div>
    </button>
  );
}
