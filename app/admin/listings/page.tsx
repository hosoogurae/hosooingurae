"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Listing } from "../../data/listings";
import type { ListingStats, ListingWithComplex } from "../../lib/listings";

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

export default function AdminListingsPage() {
  const [listings, setListings] = useState<ListingWithComplex[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

      {listings === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : listings.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          등록된 매물이 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex flex-col gap-3 rounded-xl border border-navy-900/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div>
                <p className="text-xs font-semibold text-navy-800/50">
                  {listing.complex.name} · {listing.propertyType} ·{" "}
                  {listing.transactionType}
                  {listing.status === "draft" ? (
                    <span className="ml-2 rounded-full bg-navy-900/10 px-2 py-0.5 text-navy-800">
                      임시저장
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-green-700">
                      공개중
                    </span>
                  )}
                  {listing.isFeatured && (
                    <span className="ml-2 rounded-full bg-gold-500/10 px-2 py-0.5 text-gold-600">
                      대표매물
                    </span>
                  )}
                </p>
                <p className="mt-1 font-bold text-navy-950">
                  {listing.priceLabel}
                </p>
                <p className="mt-0.5 text-xs text-navy-800/50">{listing.id}</p>
              </div>

              <div className="flex gap-2">
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
                  onClick={() => handleDelete(listing)}
                  disabled={deletingId === listing.id}
                  className="rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === listing.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
