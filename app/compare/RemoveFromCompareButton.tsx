"use client";

import { useRouter } from "next/navigation";
import { useCompareSelection } from "../lib/compareSelection";

/**
 * 비교 화면에서 매물 하나를 뺍니다. localStorage 선택 상태도 함께 갱신해야
 * (그래야 다른 페이지의 CompareBar 개수도 같이 줄어듦) 순수 링크 대신 작은
 * 클라이언트 버튼으로 만들었습니다.
 */
export default function RemoveFromCompareButton({
  listingId,
  remainingIds,
}: {
  listingId: string;
  remainingIds: string[];
}) {
  const router = useRouter();
  const { remove } = useCompareSelection();

  function handleClick() {
    remove(listingId);
    router.push(
      remainingIds.length > 0 ? `/compare?ids=${remainingIds.join(",")}` : "/listings",
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="비교에서 제거"
      className="rounded-full border border-navy-900/15 px-3 py-1 text-xs font-semibold text-navy-800/60 transition-colors hover:border-red-300 hover:text-red-600"
    >
      제거
    </button>
  );
}
