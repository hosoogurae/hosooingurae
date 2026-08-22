"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DealStatus, Listing } from "../../data/listings";
import type { ListingStats, ListingWithComplex } from "../../lib/listings";
import { isUnknownListingNumber } from "../../lib/format/listingFields";
import { getVerificationUrgency } from "../../lib/listingUrgency";
import { ADMIN_LISTING_SORT_OPTIONS } from "../../lib/listingSort";
import {
  describeLowInfoReason,
  describeMissingFieldsReason,
  INSPECTION_CATEGORIES,
  INSPECTION_CATEGORY_LABELS,
  matchesInspectionCategory,
  type InspectionCategory,
} from "../../lib/listingInspection";
import { DEAL_STATUS_BADGE_CLASS, DEAL_STATUS_LABELS } from "../ListingFields";
import { patchListingFields } from "../quickListingActions";
import ListingSortSelect from "../../components/ListingSortSelect";
import type { SuspectedMatch } from "../../lib/suspectedTransactionMatch";

function formatDealDate(dealDate: string): string {
  const date = new Date(dealDate);
  if (Number.isNaN(date.getTime())) return dealDate;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDealAmount(manwon: number): string {
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (eok === 0) return `${manwon.toLocaleString()}만원`;
  if (rest === 0) return `${eok}억원`;
  return `${eok}억 ${rest.toLocaleString()}만원`;
}

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
  // null = 아직 로딩 중(백그라운드). 목록 자체를 막지 않고 준비되는 대로 배지가 나타납니다.
  const [suspectedMatches, setSuspectedMatches] = useState<Map<
    string,
    SuspectedMatch
  > | null>(null);
  const [expandedMatchListingId, setExpandedMatchListingId] = useState<
    string | null
  >(null);
  const [matchActionId, setMatchActionId] = useState<string | null>(null);

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

  // 거래 의심 감지 — 매물 목록과 별개로 백그라운드에서 실행됩니다. 국토부
  // API를 단지별로 호출해야 해서 시간이 좀 걸릴 수 있어, 이 결과를 기다리지
  // 않고 목록부터 먼저 보여준 뒤 준비되는 대로 배지가 나타나게 합니다.
  useEffect(() => {
    let cancelled = false;

    async function loadSuspectedMatches() {
      try {
        const response = await fetch("/api/admin/listings/suspected-matches");
        const data = await response.json();
        if (!response.ok || cancelled) return;
        const matches = data.matches as SuspectedMatch[];
        setSuspectedMatches(new Map(matches.map((match) => [match.listingId, match])));
      } catch {
        if (!cancelled) setSuspectedMatches(new Map());
      }
    }

    loadSuspectedMatches();

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

  /** "확인함" — 이 시각 이후 날짜의 새 실거래가 나타나기 전까지는 배지를 다시 띄우지 않습니다. */
  async function handleAcknowledgeMatch(listing: ListingWithComplex) {
    setMatchActionId(listing.id);
    const { listing: updated, errors } = await patchListingFields(listing, {
      suspectedMatchAcknowledgedAt: new Date().toISOString(),
    });
    if (errors) {
      alert(errors[0]);
    } else if (updated) {
      setSuspectedMatches((prev) => {
        if (!prev) return prev;
        const next = new Map(prev);
        next.delete(listing.id);
        return next;
      });
      setExpandedMatchListingId(null);
    }
    setMatchActionId(null);
  }

  /** "거래완료 처리" — 기존 거래상태 변경(handleQuickStatusChange)을 그대로 재사용합니다. */
  async function handleMarkCompletedFromMatch(listing: ListingWithComplex) {
    await handleQuickStatusChange(listing, "completed");
    setExpandedMatchListingId(null);
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

      {suspectedMatches && suspectedMatches.size > 0 && (
        <div className="mt-4 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800">
          <strong>거래 의심 매물 {suspectedMatches.size}건</strong> — 국토부
          실거래와 조건이 비슷한 매물이 있습니다. 아직 확정된 건 아니니 배지를
          눌러 실거래 내역을 직접 확인해주세요.
        </div>
      )}

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
            const missingFieldsReason = describeMissingFieldsReason(listing);
            const isFloorMissing =
              isUnknownListingNumber(listing.floor) ||
              isUnknownListingNumber(listing.totalFloors);
            const suspectedMatch = suspectedMatches?.get(listing.id);
            const isMatchExpanded = expandedMatchListingId === listing.id;

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
                    {missingFieldsReason && (
                      <span
                        className="rounded-full bg-amber-500/10 px-2 py-0.5 font-bold text-amber-700"
                        title={missingFieldsReason}
                      >
                        정보 미입력
                      </span>
                    )}
                    {suspectedMatch && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMatchListingId(isMatchExpanded ? null : listing.id)
                        }
                        className={`rounded-full px-2 py-0.5 font-bold transition-colors ${
                          suspectedMatch.confidence === "high"
                            ? "bg-purple-500/15 text-purple-800 hover:bg-purple-500/25"
                            : "bg-purple-500/5 text-purple-600 hover:bg-purple-500/15"
                        }`}
                      >
                        거래 의심{suspectedMatch.confidence === "high" ? "(확인필요)" : "(참고)"}
                      </button>
                    )}
                  </p>

                  {suspectedMatch && isMatchExpanded && (
                    <div className="mt-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-900">
                      <p className="font-semibold">
                        확정된 거래가 아니라 조건이 비슷한 실거래를 찾은 것입니다 — 직접 확인해주세요.
                      </p>
                      <p className="mt-1">
                        매칭된 실거래: {formatDealDate(suspectedMatch.dealDate)} ·{" "}
                        {formatDealAmount(suspectedMatch.dealAmount)} · {suspectedMatch.floor}층
                        {suspectedMatch.confidence === "low" && " (층은 다름, 면적만 일치)"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeMatch(listing)}
                          disabled={matchActionId === listing.id}
                          className="rounded-md border border-purple-300 bg-white px-3 py-1.5 font-bold text-purple-700 transition-colors hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {matchActionId === listing.id ? "처리 중..." : "확인함"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkCompletedFromMatch(listing)}
                          disabled={matchActionId === listing.id || quickActionId === listing.id}
                          className="rounded-md bg-purple-600 px-3 py-1.5 font-bold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          거래완료 처리
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-1 font-bold text-navy-950">
                    {listing.priceLabel}
                    {isFloorMissing ? (
                      <span className="ml-2 font-bold text-amber-600">
                        층수 미입력
                      </span>
                    ) : (
                      <span className="ml-2 font-normal text-navy-800/50">
                        {listing.floor}층/{listing.totalFloors}층
                      </span>
                    )}
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
