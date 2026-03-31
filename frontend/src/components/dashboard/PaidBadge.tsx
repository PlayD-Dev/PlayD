import { TrendingUp } from "lucide-react";

type PaidBadgeProps = {
  label: string;
  className?: string;
};

/** A shared badge for highlighting paid requests and boost amounts. */
export function PaidBadge({ label, className = "" }: PaidBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#b72959]/40 bg-[#b72959]/10 px-3 py-1 text-xs font-semibold text-[#d85a84] ${className}`.trim()}
    >
      <TrendingUp className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}
