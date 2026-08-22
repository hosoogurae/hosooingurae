"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ListingWithComplex } from "../../lib/listings";
import {
  countInspectionCategories,
  INSPECTION_CATEGORIES,
  INSPECTION_CATEGORY_LABELS,
  PRIORITY_INSPECTION_CATEGORIES,
  type InspectionCategory,
  type InspectionCounts,
} from "../../lib/listingInspection";

const CATEGORY_DESCRIPTIONS: Record<InspectionCategory, string> = {
  "no-photo": "공개 중인데 대표 사진이 한 장도 없는 매물입니다. 고객에게 가장 먼저 보이는 정보라 우선순위가 가장 높습니다.",
  urgent: "8일 이상 재확인하지 않았거나 한 번도 확인하지 않은 매물입니다. 집주인에게 연락해 최신 상태인지 확인해주세요.",
  "low-info": "설명이 너무 짧거나(10자 미만) 특징이 3개 미만인 매물입니다.",
  "missing-fields":
    "네이버 원문에서 층수·면적·방/욕실 수 중 하나 이상을 읽지 못해 0으로 저장된 매물입니다. 화면에는 안내 문구로 대체되지만, 광고문구·상세정보에 정확한 값이 나가려면 채워야 합니다.",
  "no-floorplan": "평형 타입이 없거나, 있어도 그 단지에 등록된 평면도와 연결되지 않는 매물입니다.",
  draft: "아직 공개하지 않은 매물입니다.",
  negotiating: "계약이 진행 중이라 곧 완료될 수 있는 매물입니다.",
};

async function loadListings(): Promise<ListingWithComplex[]> {
  const response = await fetch("/api/admin/listings");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "매물 목록을 불러오지 못했습니다.");
  return data.listings as ListingWithComplex[];
}

async function loadUnitTypesByComplex(): Promise<Record<string, string[]>> {
  const response = await fetch("/api/admin/floor-plans/coverage");
  const data = await response.json();
  if (!response.ok) return {};
  return data.unitTypesByComplex ?? {};
}

function CategoryCard({
  category,
  count,
  highlight,
}: {
  category: InspectionCategory;
  count: number | null;
  highlight?: boolean;
}) {
  return (
    <Link
      href={`/admin/listings?filter=${category}`}
      className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
        highlight && (count ?? 0) > 0
          ? "border-red-400 bg-red-50 hover:bg-red-100"
          : "border-navy-900/10 bg-white hover:border-gold-500"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-navy-950">
            {INSPECTION_CATEGORY_LABELS[category]}
          </h2>
          <span
            className={`shrink-0 text-2xl font-black ${
              highlight && (count ?? 0) > 0 ? "text-red-600" : "text-navy-950"
            }`}
          >
            {count === null ? "-" : `${count}건`}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-navy-800/60">
          {CATEGORY_DESCRIPTIONS[category]}
        </p>
      </div>
    </Link>
  );
}

export default function ListingInspectionPage() {
  const [counts, setCounts] = useState<InspectionCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [listings, unitTypesByComplex] = await Promise.all([
          loadListings(),
          loadUnitTypesByComplex(),
        ]);
        if (!cancelled) {
          setCounts(countInspectionCategories(listings, unitTypesByComplex));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const priorityCategories = PRIORITY_INSPECTION_CATEGORIES;
  const otherCategories = INSPECTION_CATEGORIES.filter(
    (category) => !priorityCategories.includes(category),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        매물 점검 센터
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        등록된 매물을 자동으로 점검해 항목별 건수를 보여줍니다. 카드를 누르면
        해당 매물만 걸러서 볼 수 있습니다.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <p className="mt-8 text-xs font-semibold text-navy-800/50">
        우선 확인이 필요한 항목
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {priorityCategories.map((category) => (
          <CategoryCard
            key={category}
            category={category}
            count={counts?.[category] ?? null}
            highlight
          />
        ))}
      </div>

      <p className="mt-8 text-xs font-semibold text-navy-800/50">그 외 점검 항목</p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {otherCategories.map((category) => (
          <CategoryCard
            key={category}
            category={category}
            count={counts?.[category] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
