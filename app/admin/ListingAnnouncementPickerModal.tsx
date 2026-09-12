"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicListing } from "../lib/listings";
import { MAX_COMPARE_SELECTION } from "../lib/compareConstants";
import { formatFloorForSentence } from "../lib/format/listingFields";

/**
 * "문의하신 매물 안내" 문자 전용 매물 선택 모달. app/lib/compareSelection.ts
 * (공개 사이트 "찜하기" — 페이지를 넘나들며 localStorage에 지속되는 선택)와는
 * 성격이 다릅니다 — 이 모달은 열렸다 닫히는 동안만 유효한 일회성 선택이라
 * 그 저장소를 쓰지 않고, 최대 선택 개수(MAX_COMPARE_SELECTION)만 공유합니다.
 *
 * 손님에게 보낼 링크의 재료이므로 공개(published) 매물만 나와야 해서, 이미
 * published(+광고중/협의중)만 내려주는 공개 API(GET /api/listings)를 그대로
 * 재사용합니다 — 임시저장 매물이 섞일 위험이 없습니다.
 */
export default function ListingAnnouncementPickerModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (listings: PublicListing[]) => void;
  onClose: () => void;
}) {
  const [listings, setListings] = useState<PublicListing[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // 고른 순서를 그대로 유지합니다 — 문자 속 번호, /compare?ids= 순서가
  // 이 순서와 같아야 손님이 "2번"을 보고 헷갈리지 않습니다.
  const [selected, setSelected] = useState<PublicListing[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/listings")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!cancelled) setListings(data.listings as PublicListing[]);
      })
      .catch(() => {
        if (!cancelled) setLoadError("매물 목록을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!listings) return [];
    const trimmed = query.trim();
    if (!trimmed) return listings;
    return listings.filter((listing) => listing.title.includes(trimmed));
  }, [listings, query]);

  function toggle(listing: PublicListing) {
    setSelected((prev) => {
      const exists = prev.some((item) => item.id === listing.id);
      if (exists) return prev.filter((item) => item.id !== listing.id);
      if (prev.length >= MAX_COMPARE_SELECTION) return prev;
      return [...prev, listing];
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="p-5 pb-3">
          <h3 className="text-lg font-black text-navy-950">매물 선택</h3>
          <p className="mt-1 text-sm text-navy-800/60">
            최대 {MAX_COMPARE_SELECTION}개까지 고를 수 있습니다. ({selected.length}/
            {MAX_COMPARE_SELECTION})
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="단지명으로 검색"
            className="mt-3 min-h-[48px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {loadError && <p className="py-4 text-sm text-red-600">{loadError}</p>}
          {!loadError && listings === null && (
            <p className="py-4 text-sm text-navy-800/50">불러오는 중...</p>
          )}
          {!loadError && listings !== null && filtered.length === 0 && (
            <p className="py-4 text-sm text-navy-800/50">조건에 맞는 매물이 없습니다.</p>
          )}

          <ul className="flex flex-col gap-2 py-2">
            {filtered.map((listing) => {
              const isSelected = selected.some((item) => item.id === listing.id);
              const isMax = !isSelected && selected.length >= MAX_COMPARE_SELECTION;
              const floorText = formatFloorForSentence(listing.floor);
              const buildingFloor = [listing.building.trim() || null, floorText]
                .filter((part): part is string => Boolean(part))
                .join(" ");

              return (
                <li key={listing.id}>
                  <label
                    className={`flex min-h-[64px] items-start gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
                      isSelected ? "border-gold-500 bg-gold-500/10" : "border-navy-900/15"
                    } ${isMax ? "opacity-40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isMax}
                      onChange={() => toggle(listing)}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-bold text-navy-900">
                        {listing.complexName}
                        {buildingFloor ? ` · ${buildingFloor}` : ""}
                      </span>
                      <span className="text-navy-800/70">
                        {listing.transactionType} {listing.priceLabel}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex gap-2 border-t border-navy-900/10 p-5">
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="min-h-[52px] flex-1 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-base font-bold text-navy-950 shadow-md shadow-gold-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selected.length > 0 ? `${selected.length}개 선택 완료` : "선택 완료"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] flex-1 rounded-xl border border-navy-900/15 text-base font-bold text-navy-800"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
