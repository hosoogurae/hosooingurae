"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LISTING_SORT_OPTIONS,
  parseListingSortKey,
  type ListingSortKey,
} from "../lib/listingSort";

const selectClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none focus:border-gold-500";

/**
 * 정렬 드롭다운. 선택 즉시(제출 버튼 없이) URL의 sort 쿼리를 바꿔 새로고침해도
 * 유지되고 링크로 공유할 수 있게 합니다. 다른 필터(propertyType 등)는 현재
 * URL에 있는 값을 그대로 보존합니다. /listings(공개)와 /admin/listings가
 * 이 컴포넌트를 공유하며, 관리자 화면은 options로 추가 옵션(마지막 확인일
 * 오래된 순)을 넘겨받습니다.
 */
export default function ListingSortSelect({
  options = LISTING_SORT_OPTIONS,
}: {
  options?: { value: ListingSortKey; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = parseListingSortKey(searchParams.get("sort"));

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", event.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-xs font-semibold text-navy-800/60">정렬</span>
      <select value={currentSort} onChange={handleChange} className={selectClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
