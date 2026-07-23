"use client";

import { useState } from "react";
import { useCompareSelection } from "../lib/compareSelection";

export default function CompareToggle({ listingId }: { listingId: string }) {
  const { isSelected, toggle } = useCompareSelection();
  const [warning, setWarning] = useState<string | null>(null);
  const selected = isSelected(listingId);

  function handleClick() {
    const result = toggle(listingId);
    if (result === "max-reached") {
      setWarning("최대 3개까지 비교할 수 있습니다.");
      setTimeout(() => setWarning(null), 2500);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
          selected
            ? "border-gold-500 bg-gold-500/10 text-gold-600"
            : "border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600"
        }`}
      >
        {selected ? "비교 중 ✓ (탭해서 해제)" : "비교하기"}
      </button>
      {warning && (
        <p className="mt-1 text-center text-xs text-red-600">{warning}</p>
      )}
    </div>
  );
}
