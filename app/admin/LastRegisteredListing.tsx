"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ListingWithComplex } from "../lib/listings";
import {
  formatFloorRange,
  isUnknownListingNumber,
} from "../lib/format/listingFields";

function formatListingTitle(listing: ListingWithComplex): string {
  const segments: string[] = [listing.complex.name];
  const building = listing.building.trim();
  // 단지가 없는 상가는 complex.name 자체가 building과 같아서(standaloneCommercialComplex
  // 참고) 그대로 이어붙이면 "단지내상가1층 · 단지내상가1층"처럼 중복됩니다.
  if (building && building !== listing.complex.name) {
    segments.push(building);
  }
  if (!isUnknownListingNumber(listing.floor)) {
    segments.push(formatFloorRange(listing.floor, listing.totalFloors));
  }
  return segments.join(" · ");
}

/** manage/page.tsx의 formatUpdatedAt과 같은 형식("YYYY.MM.DD HH:mm")입니다. */
function formatRegisteredAt(iso: string | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * 매물을 연속으로 등록할 때 "방금 거 들어갔나"를 바로 확인하는 한 줄
 * 표시입니다. 마운트될 때 1회만 조회합니다 — 네이버 붙여넣기 화면·직접
 * 등록 화면 둘 다 등록에 성공하면 이 컴포넌트가 걸린 입력 화면 자체가
 * (성공 화면으로) 사라졌다가 "다른 매물 등록하기"로 되돌아올 때 다시
 * 마운트되는 구조라, 그 재마운트 자체가 곧 새로고침입니다. 이 구조가
 * 바뀌어 같은 마운트 상태로 계속 머무르게 되면, 등록 성공 시점에
 * 다시 조회하는 로직을 추가해야 합니다.
 */
export default function LastRegisteredListing() {
  const [listing, setListing] = useState<ListingWithComplex | null | undefined>(
    undefined,
  );
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/listings?sort=created_desc&limit=1")
      .then((response) => {
        if (!response.ok) throw new Error("조회 실패");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const listings = data.listings as ListingWithComplex[];
        setListing(listings[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  if (failed) {
    return (
      <p className="mb-4 text-xs text-red-600">
        마지막 등록 매물을 불러오지 못했습니다.{" "}
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRetryNonce((prev) => prev + 1);
          }}
          className="font-semibold underline-offset-2 hover:underline"
        >
          다시 시도
        </button>
      </p>
    );
  }

  // 로딩 중(undefined)이거나 등록된 매물이 하나도 없으면(null) 조용히
  // 생략합니다 — 로딩 중에 "없음"을 보여주는 건 거짓 정보입니다.
  if (!listing) return null;

  return (
    <p className="mb-4 text-xs text-navy-800/50">
      마지막으로 등록한 매물:{" "}
      <Link
        href={`/admin/listings/${listing.id}/edit`}
        className="font-semibold text-navy-800/70 hover:text-gold-600 hover:underline"
      >
        {formatListingTitle(listing)}
      </Link>{" "}
      · {formatRegisteredAt(listing.createdAt)}
    </p>
  );
}
