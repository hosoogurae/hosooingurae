"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  ListingSubmission,
  ListingSubmissionStatus,
} from "../../data/listingSubmissions";

const STATUS_META: Record<
  ListingSubmissionStatus,
  { label: string; className: string }
> = {
  new: { label: "신규", className: "bg-navy-900/10 text-navy-800" },
  confirmed: { label: "확인완료", className: "bg-green-500/10 text-green-700" },
  converted: { label: "등록됨", className: "bg-gold-500/10 text-gold-600" },
};

function formatBuildingFloor(
  submission: ListingSubmission,
): string | undefined {
  const parts: string[] = [];
  if (submission.building) parts.push(submission.building);
  if (submission.floor !== undefined) parts.push(`${submission.floor}층`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (date.toDateString() === now.toDateString()) {
    return `오늘 ${hh}:${mm}`;
  }
  return `${date.getMonth() + 1}.${date.getDate()} ${hh}:${mm}`;
}

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

export default function AdminListingSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ListingSubmission[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/listing-submissions");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "접수 목록을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setSubmissions(data.submissions as ListingSubmission[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          );
          setSubmissions([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(id: string, status: ListingSubmissionStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/listing-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.errors?.[0] ?? "상태 변경에 실패했습니다.");
        return;
      }

      setSubmissions(
        (prev) =>
          prev?.map((item) =>
            item.id === id ? (data.submission as ListingSubmission) : item,
          ) ?? null,
      );
    } catch {
      alert("네트워크 오류로 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleConfirm(submission: ListingSubmission) {
    updateStatus(submission.id, "confirmed");
  }

  function handleConvert(submission: ListingSubmission) {
    // 상태는 실제 매물 저장이 성공한 뒤에만 /admin 쪽에서 바꿉니다(여기서 미리
    // converted로 바꾸면 저장에 실패해도 등록된 것처럼 보이는 문제가 생깁니다).
    window.open(`/admin?submissionId=${submission.id}`, "_blank");
  }

  const newCount = submissions?.filter((s) => s.status === "new").length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-gold-600">
          ADMIN
        </p>
        <Link
          href="/admin"
          className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
        >
          ← 매물 등록
        </Link>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-black text-navy-950 sm:text-3xl">
          매물 접수
        </h1>
        {submissions !== null && (
          <span className="rounded-full bg-navy-900/5 px-3 py-1 text-sm font-bold text-navy-800">
            신규 {newCount}건
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        고객이 &quot;매물 내놓기&quot; 폼으로 직접 접수한 매물 목록입니다.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {submissions === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : submissions.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          접수된 매물이 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {submissions.map((submission) => {
            const statusMeta = STATUS_META[submission.status];
            const buildingFloor = formatBuildingFloor(submission);
            const noteLines = [
              submission.occupancyStatus,
              submission.interiorCondition,
              submission.moveOutDate ? `이사: ${submission.moveOutDate}` : undefined,
              submission.viewingAvailability
                ? `집보기: ${submission.viewingAvailability}`
                : undefined,
            ].filter((line): line is string => Boolean(line));

            return (
              <li
                key={submission.id}
                className="rounded-xl border border-navy-900/10 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                  <h2 className="text-base font-bold text-navy-950">
                    {submission.complexName}
                  </h2>
                </div>

                {buildingFloor && (
                  <p className="mt-1 text-sm text-navy-800/70">
                    {buildingFloor}
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold text-navy-950">
                  {submission.transactionType} · 희망가{" "}
                  {submission.desiredPriceLabel}
                </p>

                {noteLines.length > 0 && (
                  <ul className="mt-3 space-y-0.5 text-sm text-navy-800/70">
                    {noteLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {submission.notes && (
                  <p className="mt-2 whitespace-pre-line text-sm text-navy-800/60">
                    {submission.notes}
                  </p>
                )}

                <p className="mt-3 text-xs text-navy-800/50">
                  접수자 {submission.contactName} · {submission.contactPhone}
                </p>
                <p className="text-xs text-navy-800/40">
                  {formatSubmittedAt(submission.createdAt)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={toTelHref(submission.contactPhone)}
                    className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                  >
                    전화하기
                  </a>
                  <button
                    type="button"
                    onClick={() => handleConfirm(submission)}
                    disabled={
                      updatingId === submission.id ||
                      submission.status !== "new"
                    }
                    className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    확인완료
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvert(submission)}
                    disabled={
                      updatingId === submission.id ||
                      submission.status === "converted"
                    }
                    className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-2 text-sm font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    매물로 등록
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
