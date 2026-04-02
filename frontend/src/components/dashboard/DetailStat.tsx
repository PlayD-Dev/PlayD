type DetailStatProps = {
  label: string;
  value: string;
};

/** Stat tile for request details like BPM, key, and wait time. */
export function DetailStat({ label, value }: DetailStatProps) {
  return (
    <div className="flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#5f7bc82e] bg-black/80 px-5 py-4 text-center">
      <span className="text-[11px] text-[#7985a6]">{label}</span>
      <strong className="text-xl font-semibold text-white">{value}</strong>
    </div>
  );
}
