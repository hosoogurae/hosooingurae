"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  PRICE_RANGE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  buildListingSearchQuery,
} from "../lib/listingFilters";

const selectClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none focus:border-gold-500";

/** /listings 페이지 상단 필터. 현재 URL의 선택값을 초기값으로 받아 그대로 보여줍니다. */
export default function ListingsFilterBar({
  initialPropertyType,
  initialTransactionType,
  initialPriceRange,
  initialComplexId,
}: {
  initialPropertyType: string;
  initialTransactionType: string;
  initialPriceRange: string;
  /** Header "아파트" 드롭다운에서 특정 단지를 선택했을 때 붙는 값(?complexId=...). */
  initialComplexId?: string;
}) {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState(initialPropertyType);
  const [transactionType, setTransactionType] = useState(initialTransactionType);
  const [priceRange, setPriceRange] = useState(initialPriceRange);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    // 단지 필터는 "아파트"를 볼 때만 의미가 있으므로, 다른 매물종류로 바꾸면
    // 함께 지워서 엉뚱한 단지 조건이 남지 않게 합니다. 이 필터 바 자체에는
    // 단지를 바꾸는 UI가 없으므로(Header 드롭다운에서만 선택), 처음 넘어온
    // 값을 그대로 유지만 합니다.
    const nextComplexId = propertyType === "apartment" ? (initialComplexId ?? "") : "";
    const query = buildListingSearchQuery({
      propertyType,
      transactionType,
      priceRange,
      complexId: nextComplexId,
    });
    router.push(query ? `/listings?${query}` : "/listings");
  }

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto -mt-8 w-full max-w-4xl rounded-2xl border border-navy-900/10 bg-white p-4 text-left shadow-lg sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-navy-800/60">매물종류</span>
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className={selectClass}
          >
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-navy-800/60">거래유형</span>
          <select
            value={transactionType}
            onChange={(event) => setTransactionType(event.target.value)}
            className={selectClass}
          >
            {TRANSACTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-navy-800/60">가격</span>
          <select
            value={priceRange}
            onChange={(event) => setPriceRange(event.target.value)}
            className={selectClass}
          >
            {PRICE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.03] sm:mt-5"
        >
          검색
        </button>
      </div>
    </form>
  );
}
