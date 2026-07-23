"use client";

import { useRouter } from "next/navigation";
import { useCompareSelection } from "../lib/compareSelection";

export default function ClearCompareSelectionButton() {
  const router = useRouter();
  const { clear } = useCompareSelection();

  function handleClick() {
    clear();
    router.push("/listings");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
    >
      선택 초기화
    </button>
  );
}
