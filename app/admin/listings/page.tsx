"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DealStatus, Listing } from "../../data/listings";
import type { ListingStats, ListingWithComplex } from "../../lib/listings";
import { getVerificationUrgency } from "../../lib/listingUrgency";
import { ADMIN_LISTING_SORT_OPTIONS } from "../../lib/listingSort";
import {
  describeLowInfoReason,
  INSPECTION_CATEGORIES,
  INSPECTION_CATEGORY_LABELS,
  matchesInspectionCategory,
  type InspectionCategory,
} from "../../lib/listingInspection";
import { DEAL_STATUS_BADGE_CLASS, DEAL_STATUS_LABELS } from "../ListingFields";
import { patchListingFields } from "../quickListingActions";
import ListingSortSelect from "../../components/ListingSortSelect";

const selectClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none focus:border-gold-500";

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatLastVerified(iso: string | undefined): string {
  if (!iso) return "확인 기록 없음";
  const elapsedDays = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (elapsedDays <= 0) return "오늘 확인";
  return `${elapsedDays}일 전 확인`;
}

const URGENCY_BADGE: Record<
  ReturnType<typeof getVerificationUrgency>,
  { label: string; className: string } | null
> = {
  ok: null,
  recommended: { label: "확인 권장", className: "bg-amber-500/10 text-amber-700" },
  urgent: {
    label: "집주인 확인 필요",
    className: "bg-red-500/10 text-red-700",
  },
};

async function loadStats(): Promise<ListingStats | null> {
  try {
    const response = await fetch("/api/admin/listings/stats");
    const data = await response.json();
    if (!response.ok) return null;
    return data.stats as ListingStats;
  } catch {
    return null;
  }
}

function StatCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: number | null;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-navy-900/10 bg-white p-4 shadow-sm">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500 to-gold-600" />
      <p className="text-xs font-semibold text-navy-800/50">{label}</p>
      <p
        className={
          compact
            ? "mt-1 text-lg font-black text-navy-950"
            : "mt-1 text-2xl font-black text-navy-950"
        }
      >
        {value === null ? (
          <span className="text-sm font-medium text-navy-800/30">
            불러오는 중...
          </span>
        ) : (
          value.toLocaleString()
        )}
      </p>
    </div>
  );
}

function AdminListingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // urgent=1은 이전에 배포된 대시보드 카드 링크와의 하위 호환을 위해 남겨두고,
  // 새 필터는 전부 ?filter=<InspectionCategory>로 받습니다.
  const filterParam = searchParams.get("filter");
  const activeFilter: InspectionCategory | null =
    searchParams.get("urgent") === "1"
      ? "urgent"
      : (INSPECTION_CATEGORIES as string[]).includes(filterParam ?? "")
        ? (filterParam as InspectionCategory)
        : null;

  const statusFilter = searchParams.get("status") ?? "";
  const transactionTypeFilter = searchParams.get("transactionType") ?? "";
  const searchQuery = searchParams.get("q") ?? "";

  const [listings, setListings] = useState<ListingWithComplex[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [quickActionId, setQuickActionId] = useState<string | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [unitTypesByComplex, setUnitTypesByComplex] = useState<
    Record<string, string[]>
  >({});
  const [searchInput, setSearchInput] = useState(searchQuery);

  /** 정렬/공개여부/거래유형/검색 등 DB 쿼리 단계 조건을 바꿀 때 쓰는 공용 헬퍼 — 나머지 쿼리는 그대로 두고 하나만 갱신합니다. */
  function updateSearchParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    updateSearchParam("q", searchInput.trim());
  }

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        // 정렬·공개여부·거래유형·검색은 DB 쿼리 단계에서 처리되도록 그대로
        // API에 넘깁니다(?filter=<InspectionCategory>는 여기 포함하지 않고
        // 아래에서 클라이언트 쪽에서만 추가로 걸러냅니다 — 기존 6종 필터는
        // 이번 변경 범위 밖이라 그대로 둡니다).
        const params = new URLSearchParams();
        const sort = searchParams.get("sort");
        if (sort) params.set("sort", sort);
        if (statusFilter) params.set("status", statusFilter);
        if (transactionTypeFilter) params.set("transactionType", transactionTypeFilter);
        if (searchQuery) params.set("q", searchQuery);
        const query = params.toString();

        const response = await fetch(
          query ? `/api/admin/listings?${query}` : "/api/admin/listings",
        );
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
          setListings([]);
        }
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, [searchParams, statusFilter, transactionTypeFilter, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function refreshStats() {
      const result = await loadStats();
      if (!cancelled && result) {
        setStats(result);
      }
    }

    refreshStats();

    return () => {
      cancelled = true;
    };
  }, []);

  // 평면도 커버리지는 그 필터를 볼 때만 조회합니다(다른 필터에서는 불필요한 호출 안 함).
  useEffect(() => {
    if (activeFilter !== "no-floorplan") return;
    let cancelled = false;

    fetch("/api/admin/floor-plans/coverage")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setUnitTypesByComplex(data.unitTypesByComplex ?? {});
        }
      })
      .catch(() => {
        // 실패해도 목록 자체는 보여주되, 이 필터만 빈 결과로 나타납니다.
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  async function handleDelete(listing: Listing) {
    if (!confirm(`"${listing.priceLabel}" 매물을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(listing.id);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.errors?.[0] ?? "삭제에 실패했습니다.");
        return;
      }

      setListings((prev) => prev?.filter((item) => item.id !== listing.id) ?? null);
      loadStats().then((result) => {
        if (result) setStats(result);
      });
    } catch {
      alert("네트워크 오류로 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleVerifyToday(listing: ListingWithComplex) {
    setVerifyingId(listing.id);
    const { listing: updated, errors } = await patchListingFields(listing, {
      lastVerifiedAt: new Date().toISOString(),
    });
    if (errors) {
      alert(errors[0]);
    } else if (updated) {
      setListings(
        (prev) =>
          prev?.map((item) =>
            item.id === listing.id
              ? { ...item, lastVerifiedAt: updated.lastVerifiedAt }
              : item,
          ) ?? null,
      );
      loadStats().then((result) => {
        if (result) setStats(result);
      });
    }
    setVerifyingId(null);
  }

  async function handleQuickStatusChange(
    listing: ListingWithComplex,
    dealStatus: DealStatus,
  ) {
    setQuickActionId(listing.id);
    const { listing: updated, errors } = await patchListingFields(listing, {
      dealStatus,
    });
    if (errors) {
      alert(errors[0]);
    } else if (updated) {
      setListings(
        (prev) =>
          prev?.map((item) =>
            item.id === listing.id
              ? { ...item, dealStatus: updated.dealStatus }
              : item,
          ) ?? null,
      );
      loadStats().then((result) => {
        if (result) setStats(result);
      });
    }
    setQuickActionId(null);
  }

  const visibleListings = activeFilter
    ? listings?.filter((listing) =>
        matchesInspectionCategory(listing, activeFilter, unitTypesByComplex),
      ) ?? null
    : listings;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">
        ADMIN
      </p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        등록된 매물 관리
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        Supabase에 저장된 매물을 수정하거나 삭제할 수 있습니다.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="총 등록 매물" value={stats?.total ?? null} />
        <StatCard label="공개중 매물" value={stats?.published ?? null} />
        <StatCard label="대표매물 개수" value={stats?.featured ?? null} />
      </div>

      <p className="mt-5 text-xs font-semibold text-navy-800/50">매물 종류별</p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        <StatCard
          label="아파트"
          value={stats?.byPropertyType.아파트 ?? null}
          compact
        />
        <StatCard
          label="오피스텔"
          value={stats?.byPropertyType.오피스텔 ?? null}
          compact
        />
        <StatCard label="상가" value={stats?.byPropertyType.상가 ?? null} compact />
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {activeFilter && (
        <div className="mt-6 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{INSPECTION_CATEGORY_LABELS[activeFilter]}만 보고 있습니다.</span>
          <Link href="/admin/listings" className="font-bold underline">
            전체 보기
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-navy-900/10 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-navy-800/60">공개여부</span>
          <select
            value={statusFilter}
            onChange={(event) => updateSearchParam("status", event.target.value)}
            className={selectClass}
          >
            <option value="">전체</option>
            <option value="published">공개중</option>
            <option value="draft">비공개</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-navy-800/60">거래유형</span>
          <select
            value={transactionTypeFilter}
            onChange={(event) => updateSearchParam("transactionType", event.target.value)}
            className={selectClass}
          >
            <option value="">전체</option>
            <option value="매매">매매</option>
            <option value="전세">전세</option>
            <option value="월세">월세</option>
          </select>
        </label>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-navy-800/60">
            단지명·동·매물번호 검색
          </span>
          <div className="flex gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="예: 호수마을, 201동, 26385..."
              className={`${selectClass} w-56`}
            />
            <button
              type="submit"
              className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              검색
            </button>
          </div>
        </form>

        <div className="ml-auto">
          <ListingSortSelect options={ADMIN_LISTING_SORT_OPTIONS} />
        </div>
      </div>

      {visibleListings === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : visibleListings.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          {activeFilter
            ? `${INSPECTION_CATEGORY_LABELS[activeFilter]}이 없습니다.`
            : "등록된 매물이 없습니다."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {visibleListings.map((listing) => {
            const urgency = getVerificationUrgency(listing);
            const urgencyBadge = URGENCY_BADGE[urgency];
            const lowInfoReason = describeLowInfoReason(listing);

            return (
              <li
                key={listing.id}
                className="flex flex-col gap-3 rounded-xl border border-navy-900/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-navy-800/50">
                    <span>
                      {listing.complex.name} · {listing.propertyType} ·{" "}
                      {listing.transactionType}
                    </span>
                    {listing.status === "draft" ? (
                      <span className="rounded-full bg-navy-900/10 px-2 py-0.5 text-navy-800">
                        임시저장
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-green-700">
                        공개중
                      </span>
                    )}
                    {listing.isFeatured && (
                      <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-gold-600">
                        대표매물
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        DEAL_STATUS_BADGE_CLASS[listing.dealStatus]
                      }`}
                    >
                      {DEAL_STATUS_LABELS[listing.dealStatus]}
                    </span>
                    {urgencyBadge && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${urgencyBadge.className}`}
                      >
                        {urgencyBadge.label}
                      </span>
                    )}
                    {!listing.image && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-bold text-red-700">
                        사진 없음
                      </span>
                    )}
                    {lowInfoReason && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700">
                        {lowInfoReason}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-bold text-navy-950">
                    {listing.priceLabel}
                    <span className="ml-2 font-normal text-navy-800/50">
                      {listing.floor}층/{listing.totalFloors}층
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-navy-800/50">{listing.id}</p>
                  <p className="mt-1 text-xs text-navy-800/50">
                    {formatLastVerified(listing.lastVerifiedAt)} · 최근 수정{" "}
                    {formatUpdatedAt(listing.updatedAt)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map(
                      (value) => {
                        const isCurrent = value === listing.dealStatus;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={isCurrent || quickActionId === listing.id}
                            onClick={() => handleQuickStatusChange(listing, value)}
                            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                              isCurrent
                                ? `${DEAL_STATUS_BADGE_CLASS[value]} opacity-70`
                                : "border border-navy-900/15 text-navy-800/60 hover:border-gold-500 hover:text-gold-600"
                            }`}
                          >
                            {DEAL_STATUS_LABELS[value]}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {listing.status === "published" && (
                    <Link
                      href={`/listings/${listing.id}`}
                      target="_blank"
                      className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                    >
                      보기
                    </Link>
                  )}
                  <Link
                    href={`/admin/listings/${listing.id}/edit`}
                    className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleVerifyToday(listing)}
                    disabled={verifyingId === listing.id}
                    className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifyingId === listing.id ? "확인 중..." : "오늘 확인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(listing)}
                    disabled={deletingId === listing.id}
                    className="rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === listing.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminListingsView />
    </Suspense>
  );
}
