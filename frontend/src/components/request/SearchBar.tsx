"use client";

import { Search, X, Loader2 } from "lucide-react";
import { useRef } from "react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
};

export function SearchBar({ value, onChange, loading }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="group relative flex items-center gap-3 rounded-2xl border border-[#5f7bc838] bg-[#10151d] px-4 py-3.5 transition-colors focus-within:border-[#a61e4d] focus-within:shadow-[0_0_20px_rgba(183,41,89,0.15)]"
    >
      <Search className="h-5 w-5 shrink-0 text-[#7f8db2] transition-colors group-focus-within:text-[#b72959]" />

      <input
        ref={inputRef}
        type="text"
        placeholder="Search for a song..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#7f8db2]"
      />

      {loading && (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#b72959]" />
      )}

      {!loading && value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#b8c2db] transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
