"use client";

import { useEffect, useMemo, useState } from "react";
import type { Notice, NoticeStatus } from "../../../lib/notices";
import type { NoticeSource } from "../../../lib/noticeSources";

const SOURCE_LABELS: Record<NoticeSource, string> = {
  molit: "국토부",
  gimpo: "김포시",
};

const STATUS_META: Record<NoticeStatus, { label: string; className: string }> = {
  new: { label: "신규", className: "bg-gold-500/10 text-gold-700" },
  published: { label: "공개", className: "bg-green-500/10 text-green-700" },
  hidden: { label: "숨김", className: "bg-navy-900/10 text-navy-800/60" },
};

const SOURCE_FILTERS: { value: NoticeSource | "all"; label: string }[] = [
  { value: "all", label: "전체 출처" },
  { value: "molit", label: "국토부" },
  { value: "gimpo", label: "김포시" },
];

const STATUS_FILTERS: { value: NoticeStatus | "all"; label: string }[] = [
  { value: "new", label: "신규" },
  { value: "published", label: "공개" },
  { value: "hidden", label: "숨김" },
  { value: "all", label: "전체" },
];

const CUSTOMER_FILTERS: { value: "all" | "candidate"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "candidate", label: "손님용 후보만" },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** 관리자용 "지역 소식" 화면. 국토부/김포시에서 매일 자동 수집된 글을 확인하고
 * 공개/숨김으로 전환합니다(2단계에서 만들 손님용 공개 페이지는 이 화면과 무관하게
 * 아직 없습니다). 휴대폰에서 쓰는 화면이라 버튼은 손가락으로 누를 크기로 뒀습니다. */
export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<NoticeSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NoticeStatus | "all">("new");
  const [customerFilter, setCustomerFilter] = useState<"all" | "candidate">("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/notices")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!cancelled) setNotices(data.notices as Notice[]);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("지역 소식 목록을 불러오지 못했습니다.");
          setNotices([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(id: string, status: NoticeStatus) {
    setUpdatingId(id);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data.errors?.[0] ?? "상태 변경에 실패했습니다.");
        return;
      }
      setNotices((prev) => prev?.map((n) => (n.id === id ? (data.notice as Notice) : n)) ?? null);
    } catch {
      setActionError("네트워크 오류로 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  const newCount = notices?.filter((n) => n.status === "new").length ?? 0;

  const visibleNotices = useMemo(() => {
    if (!notices) return [];
    return notices.filter((n) => {
      if (sourceFilter !== "all" && n.source !== sourceFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (customerFilter === "candidate" && !n.customerCandidate) return false;
      return true;
    });
  }, [notices, sourceFilter, statusFilter, customerFilter]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black text-navy-950 sm:text-3xl">지역 소식</h1>
        {notices !== null && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
              newCount > 0 ? "bg-gold-500/10 text-gold-700" : "bg-navy-900/5 text-navy-800"
            }`}
          >
            신규 {newCount}건
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        국토부 보도자료·김포시 고시공고를 매일 자동으로 가져옵니다. 부동산과
        무관한 글이 훨씬 많으니, 손님에게 보여줄 만한 글만 직접 확인해서
        &quot;공개&quot;로 바꿔주세요. 수집만 자동이고, 공개는 항상 사람이
        직접 정합니다.
      </p>

      {loadError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}
      {actionError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {SOURCE_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSourceFilter(option.value)}
            className={`flex min-h-[40px] items-center rounded-full px-4 text-sm font-bold transition-colors ${
              sourceFilter === option.value
                ? "bg-navy-950 text-white"
                : "border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={`flex min-h-[40px] items-center rounded-full px-4 text-sm font-bold transition-colors ${
              statusFilter === option.value
                ? "bg-navy-950 text-white"
                : "border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {CUSTOMER_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setCustomerFilter(option.value)}
            className={`flex min-h-[40px] items-center rounded-full px-4 text-sm font-bold transition-colors ${
              customerFilter === option.value
                ? "bg-navy-950 text-white"
                : "border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notices === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : visibleNotices.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          조건에 맞는 글이 없습니다.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visibleNotices.map((notice) => {
            const statusMeta = STATUS_META[notice.status];
            return (
              <li key={notice.id} className="rounded-xl border border-navy-900/10 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-navy-800/50">
                  <span className="rounded-full bg-navy-900/5 px-2.5 py-1">
                    {SOURCE_LABELS[notice.source]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                  {notice.customerCandidate && (
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-700">
                      손님용 후보
                    </span>
                  )}
                  <span>{formatDate(notice.publishedAt)}</span>
                </div>

                <a
                  href={notice.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-base font-bold leading-snug text-navy-950 underline-offset-2 hover:text-gold-600 hover:underline"
                >
                  {notice.title} ↗
                </a>

                <div className="mt-3 flex gap-2">
                  {notice.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(notice.id, "published")}
                      disabled={updatingId === notice.id}
                      className="min-h-[44px] flex-1 rounded-lg bg-navy-950 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      공개로 전환
                    </button>
                  )}
                  {notice.status !== "hidden" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(notice.id, "hidden")}
                      disabled={updatingId === notice.id}
                      className="min-h-[44px] flex-1 rounded-lg border border-navy-900/15 text-sm font-bold text-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      숨김으로 전환
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
