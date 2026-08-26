"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListingWithComplex } from "../../lib/listings";
import type { AdCopyFormats } from "../../lib/adCopy";

type FormatKey = keyof AdCopyFormats;

const FORMAT_TABS: { key: FormatKey; label: string }[] = [
  { key: "sms", label: "고객 문자용" },
  { key: "blog", label: "네이버 블로그용" },
  { key: "sns", label: "SNS용" },
  { key: "general", label: "일반 소개문" },
];

export default function AdCopyPage() {
  const [listings, setListings] = useState<ListingWithComplex[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formats, setFormats] = useState<AdCopyFormats | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<FormatKey, string> | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<FormatKey>("sms");
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [copiedTab, setCopiedTab] = useState<FormatKey | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/listings");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "매물 목록을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setListings(data.listings as ListingWithComplex[]);
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

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return listings;
    return listings.filter((listing) =>
      listing.complex.name.toLowerCase().includes(query),
    );
  }, [listings, searchQuery]);

  const selectedListing = listings?.find((listing) => listing.id === selectedId);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setFormats(null);
    setEditedTexts(null);
    setActiveTab("sms");
    setLoadingFormats(true);
    try {
      const response = await fetch(`/api/admin/listings/${id}/ad-copy`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "광고문구를 생성하지 못했습니다.");
      }
      setFormats(data.formats as AdCopyFormats);
      setEditedTexts(data.formats as AdCopyFormats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoadingFormats(false);
    }
  }

  async function handleCopy(key: FormatKey) {
    if (!editedTexts) return;
    try {
      await navigator.clipboard.writeText(editedTexts[key]);
      setCopiedTab(key);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      alert("복사에 실패했습니다. 텍스트를 직접 선택해 복사해주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        광고용 도구
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        등록된 매물 정보를 그대로 조합해 광고문구를 만듭니다. DB에 없는
        내용은 넣지 않으며, 만든 문구는 저장되지 않고 미리보기·수정·복사만
        가능합니다.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="단지명으로 검색"
          className="w-full rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500"
        />

        {listings === null ? (
          <p className="mt-4 text-sm text-navy-800/50">불러오는 중...</p>
        ) : (
          <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-xl border border-navy-900/10 p-2">
            {filteredListings.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-navy-800/50">
                검색 결과가 없습니다.
              </li>
            ) : (
              filteredListings.map((listing) => (
                <li key={listing.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(listing.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      listing.id === selectedId
                        ? "bg-gold-500/20 font-bold text-navy-950"
                        : "text-navy-800 hover:bg-navy-900/5"
                    }`}
                  >
                    <span className="font-bold">{listing.complex.name}</span>{" "}
                    <span className="text-navy-800/60">
                      · {listing.transactionType} {listing.priceLabel} ·{" "}
                      {listing.building || "동 미등록"} ·{" "}
                      {listing.status === "published" ? "공개중" : "임시저장"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selectedListing && (
        <div className="mt-8">
          <p className="text-sm font-bold text-navy-950">
            {selectedListing.complex.name} · {selectedListing.transactionType}{" "}
            {selectedListing.priceLabel}
          </p>

          {loadingFormats ? (
            <p className="mt-4 text-sm text-navy-800/50">문구를 만드는 중...</p>
          ) : (
            editedTexts && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {FORMAT_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === tab.key
                          ? "bg-navy-950 text-white"
                          : "bg-navy-900/5 text-navy-800 hover:bg-navy-900/10"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={editedTexts[activeTab]}
                  onChange={(event) =>
                    setEditedTexts((prev) =>
                      prev ? { ...prev, [activeTab]: event.target.value } : prev,
                    )
                  }
                  rows={12}
                  className="mt-3 w-full rounded-md border border-navy-900/15 bg-white px-3 py-3 text-sm leading-relaxed text-navy-900 outline-none focus:border-gold-500"
                />

                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopy(activeTab)}
                    className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
                  >
                    복사
                  </button>
                  {copiedTab === activeTab && (
                    <span className="text-sm font-bold text-green-700">
                      복사했습니다
                    </span>
                  )}
                  {formats && editedTexts[activeTab] !== formats[activeTab] && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditedTexts((prev) =>
                          prev ? { ...prev, [activeTab]: formats[activeTab] } : prev,
                        )
                      }
                      className="text-sm font-bold text-navy-800/60 underline hover:text-gold-600"
                    >
                      원래 문구로 되돌리기
                    </button>
                  )}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
