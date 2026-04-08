"use client";

import { Zap } from "lucide-react";

type BoostSelectorProps = {
  selected: number;
  onChange: (amount: number) => void;
};

const amounts = [0, 2, 5, 10];

function label(amount: number): string {
  return amount === 0 ? "Free" : `$${amount}`;
}

export function BoostSelector({ selected, onChange }: BoostSelectorProps) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <Zap className="h-4 w-4 text-[#b72959]" />
        <span className="text-sm font-medium text-[#b8c2db]">
          Boost your request
        </span>
      </div>

      <div className="flex gap-2">
        {amounts.map((amount) => {
          const isActive = selected === amount;
          return (
            <button
              key={amount}
              type="button"
              onClick={() => onChange(amount)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-b from-[#b72959] to-[#8f1a44] text-white shadow-[0_4px_16px_rgba(183,41,89,0.3)]"
                  : "border border-[#5f7bc838] bg-[#10151d] text-[#7f8db2] hover:border-[#3a414b] hover:text-[#b8c2db]"
              }`}
            >
              {label(amount)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
