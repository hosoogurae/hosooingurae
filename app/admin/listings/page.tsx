"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Listing } from "../../data/listings";
import type { ListingStats, ListingWithComplex } from "../../lib/listings";
import { getVerificationUrgency } from "../../lib/listingUrgency";
import { DEAL_STATUS_LABELS } from "../ListingFields";

const DEAL_STATUS_BADGE_CLASS: Record<string, string> = {
  advertising: "bg-green-500/10 text-green-700",
  negotiating: "bg-blue-500/10 text-blue-700",
  completed: "bg-navy-900/10 text-navy-800",
  hold: "bg-orange-500/10 text-orange-700",
};

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
  const searchParams = useSearchParams();
  const urgentOnly = searchParams.get("urgent") === "1";

  const [listings, setListings] = useState<ListingWithComplex[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
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
          setListings([]);
        }
      }
    }

    async function refreshStats() {
      const result = await loadStats();
      if (!cancelled && result) {
        setStats(result);
      }
    }

    loadListings();
    refreshStats();

    return () => {
      cancelled = true;
    };
  }, []);

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

  /**
   * "오늘 확인" — 새 API 없이 이미 들고 있는 매물 전체 객체를 lastVerifiedAt만
   * 바꿔 기존 PATCH /api/listings/[id]에 그대로 재전송합니다(수정 화면과 동일한
   * 전체 재저장 패턴).
   */
  async function handleVerifyToday(listing: ListingWithComplex) {
    setVerifyingId(listing.id);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...listing,
          lastVerifiedAt: new Date().toISOString(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.errors?.[0] ?? "확인일 갱신에 실패했습니다.");
        return;
      }

      setListings(
        (prev) =>
          prev?.map((item) =>
            item.id === listing.id
              ? { ...item, lastVerifiedAt: data.listing.lastVerifiedAt }
              : item,
          ) ?? null,
      );
      loadStats().then((result) => {
        if (result) setStats(result);
      });
    } catch {
      alert("네트워크 오류로 확인일 갱신에 실패했습니다.");
    } finally {
      setVerifyingId(null);
    }
  }

  const visibleListings = urgentOnly
    ? listings?.filter(
        (listing) =>
          (listing.dealStatus === "advertising" ||
            listing.dealStatus === "negotiating") &&
          getVerificationUrgency(listing) !== "ok",
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

      {urgentOnly && (
        <div className="mt-6 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>확인이 필요한 매물만 보고 있습니다.</span>
          <Link href="/admin/listings" className="font-bold underline">
            전체 보기
          </Link>
        </div>
      )}

      {visibleListings === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : visibleListings.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          {urgentOnly ? "확인이 필요한 매물이 없습니다." : "등록된 매물이 없습니다."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {visibleListings.map((listing) => {
            const urgency = getVerificationUrgency(listing);
            const urgencyBadge = URGENCY_BADGE[urgency];

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
                  </p>
                  <p className="mt-1 font-bold text-navy-950">
                    {listing.priceLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-navy-800/50">{listing.id}</p>
                  <p className="mt-1 text-xs text-navy-800/50">
                    {formatLastVerified(listing.lastVerifiedAt)}
                  </p>
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
