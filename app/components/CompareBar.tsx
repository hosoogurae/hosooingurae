"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompareSelection } from "../lib/compareSelection";

export default function CompareBar() {
  const pathname = usePathname();
  const { ids } = useCompareSelection();

  if (pathname.startsWith("/admin") || ids.length === 0) {
    return null;
  }

  const canCompare = ids.length >= 2;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-900/10 bg-white/95 px-4 py-3 pr-20 backdrop-blur sm:pr-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-navy-950">
            선택한 매물 {ids.length}개
          </p>
          {!canCompare && (
            <p className="text-xs text-navy-800/60">
              비교하려면 매물을 1개 더 선택해주세요.
            </p>
          )}
        </div>
        {canCompare ? (
          <Link
            href={`/compare?ids=${ids.join(",")}`}
            className="shrink-0 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
          >
            선택한 매물 {ids.length}개 비교하기
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="shrink-0 cursor-not-allowed rounded-full bg-navy-900/10 px-5 py-2.5 text-sm font-bold text-navy-800/40"
          >
            비교하기
          </span>
        )}
      </div>
    </div>
  );
}
