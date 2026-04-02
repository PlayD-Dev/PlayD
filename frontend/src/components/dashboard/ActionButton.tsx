import type { LucideIcon } from "lucide-react";

type ActionButtonProps = {
  label: string;
  tone: "blue" | "amber" | "green" | "red";
  icon: LucideIcon;
  onClick: () => void;
};

const toneClasses = {
  blue: "border-blue-400/40 bg-blue-900/30 text-blue-300",
  amber: "border-amber-400/40 bg-amber-900/30 text-amber-300",
  green: "border-emerald-400/40 bg-emerald-900/30 text-emerald-300",
  red: "border-red-400/40 bg-red-900/30 text-red-300",
};

/** Reusable button for request actions in the dashboard detail panel. */
export function ActionButton({
  label,
  tone,
  icon: Icon,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border text-lg font-bold transition hover:-translate-y-0.5 ${toneClasses[tone]}`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}
