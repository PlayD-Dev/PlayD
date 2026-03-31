"use client";

import { X, Send, Loader2, Music2 } from "lucide-react";
import { useEffect } from "react";
import type { ItunesTrack } from "@/lib/itunes";
import { artworkUrl } from "@/lib/itunes";
import type { TrackMeta } from "@/lib/getsongbpm";
import { BoostSelector } from "./BoostSelector";

type MetaState = {
  loading: boolean;
  data: TrackMeta | null;
  error: string | null;
};

type SongDetailModalProps = {
  track: ItunesTrack;
  meta: MetaState;
  message: string;
  onMessageChange: (value: string) => void;
  boostAmount: number;
  onBoostChange: (amount: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitting: boolean;
};

function msToMin(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function MetaPill({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | undefined;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-black/50 px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#5a6785]">
        {label}
      </span>
      {loading ? (
        <div className="h-5 w-10 animate-pulse rounded bg-[#5f7bc838]" />
      ) : (
        <span className="text-sm font-semibold text-white">
          {value || "\u2014"}
        </span>
      )}
    </div>
  );
}

export function SongDetailModal({
  track,
  meta,
  message,
  onMessageChange,
  boostAmount,
  onBoostChange,
  onSubmit,
  onClose,
  submitting,
}: SongDetailModalProps) {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-[#5f7bc838] bg-[#0a0e16] sm:max-w-md sm:rounded-3xl sm:border modal-sheet-enter">
        {/* Drag handle + close */}
        <div className="flex items-center justify-center px-5 pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#5f7bc838]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#b8c2db] transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
          {/* Artwork */}
          <div className="relative mx-auto mb-5 w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artworkUrl(track, 600)}
              alt={track.trackName}
              width={200}
              height={200}
              className="h-[200px] w-[200px] rounded-2xl object-cover shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            />
            {/* Glow effect behind artwork */}
            <div
              className="absolute inset-0 -z-10 scale-110 rounded-2xl opacity-30 blur-2xl"
              style={{
                backgroundImage: `url(${artworkUrl(track, 300)})`,
                backgroundSize: "cover",
              }}
            />
          </div>

          {/* Song info */}
          <div className="mb-4 text-center">
            <h3 className="text-xl font-bold leading-tight text-white">
              {track.trackName}
            </h3>
            <p className="mt-1 text-[15px] text-[#b8c2db]">
              {track.artistName}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5f7bc838] bg-[#10151d] px-3 py-1 text-xs text-[#7f8db2]">
                {track.collectionName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5f7bc838] bg-[#10151d] px-3 py-1 text-xs text-[#7f8db2]">
                <Music2 className="h-3 w-3" />
                {track.primaryGenreName}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#5f7bc838] bg-[#10151d] px-3 py-1 text-xs text-[#7f8db2]">
                {msToMin(track.trackTimeMillis)}
              </span>
            </div>
          </div>

          {/* Metadata pills */}
          <div className="mb-5 grid grid-cols-4 gap-2">
            <MetaPill label="BPM" value={meta.data?.bpm} loading={meta.loading} />
            <MetaPill label="Key" value={meta.data?.key} loading={meta.loading} />
            <MetaPill
              label="Camelot"
              value={meta.data?.openKey}
              loading={meta.loading}
            />
            <MetaPill
              label="Time"
              value={meta.data?.timeSig}
              loading={meta.loading}
            />
          </div>

          {/* Message */}
          <div className="mb-5">
            <textarea
              placeholder="Add a note for the DJ (optional)"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-[#5f7bc838] bg-[#10151d] px-4 py-3 text-sm text-white outline-none placeholder:text-[#5a6785] transition-colors focus:border-[#a61e4d] focus:shadow-[0_0_16px_rgba(183,41,89,0.1)]"
            />
          </div>

          {/* Boost */}
          <div className="mb-5">
            <BoostSelector selected={boostAmount} onChange={onBoostChange} />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#b72959] to-[#8f1a44] py-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(183,41,89,0.35)] transition-all duration-200 hover:shadow-[0_6px_28px_rgba(183,41,89,0.45)] active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Request Song</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
