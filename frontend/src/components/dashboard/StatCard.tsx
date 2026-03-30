type StatCardProps = {
  label: string;
  value: number;
  highlight?: boolean;
};

/** Summary card used for top-level dashboard metrics. */
export function StatCard({
  label,
  value,
  highlight = false,
}: StatCardProps) {
  return (
    <div className="flex min-h-[142px] flex-col justify-center gap-3 rounded-3xl border border-[#5f7bc838] bg-[#10151d] p-7">
      <span className="text-sm text-[#8d99b7]">{label}</span>
      <strong
        className={`text-4xl font-bold tracking-tight ${
          highlight ? "text-[#a61e4d]" : "text-white"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}
