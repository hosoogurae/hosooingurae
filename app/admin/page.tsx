"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ListingSubmission } from "../data/listingSubmissions";
import type { ListingStats } from "../lib/listings";

const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "신규", className: "bg-navy-900/10 text-navy-800" },
  confirmed: { label: "확인완료", className: "bg-green-500/10 text-green-700" },
  converted: { label: "등록됨", className: "bg-gold-500/10 text-gold-600" },
};

function formatBuildingFloor(submission: ListingSubmission): string | undefined {
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

interface DashboardCard {
  title: string;
  description: string;
  href: string;
  badge?: string;
  highlight?: boolean;
  external?: boolean;
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<ListingSubmission[] | null>(
    null,
  );
  const [stats, setStats] = useState<ListingStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [submissionsResult, statsResult] = await Promise.allSettled([
        fetch("/api/admin/listing-submissions").then((response) =>
          response.ok ? response.json() : Promise.reject(response),
        ),
        fetch("/api/admin/listings/stats").then((response) =>
          response.ok ? response.json() : Promise.reject(response),
        ),
      ]);

      if (cancelled) return;

      if (submissionsResult.status === "fulfilled") {
        setSubmissions(submissionsResult.value.submissions as ListingSubmission[]);
      } else {
        setSubmissions([]);
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value.stats as ListingStats);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const newCount = submissions?.filter((s) => s.status === "new").length ?? 0;
  const confirmedCount =
    submissions?.filter((s) => s.status === "confirmed").length ?? 0;

  const recentSubmissions = useMemo(() => {
    if (!submissions) return [];
    return [...submissions]
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3);
  }, [submissions]);

  const cards: DashboardCard[] = [
    {
      title: "신규 매물 접수",
      description: "홈페이지로 들어온 매물 접수를 확인하고 연락하세요.",
      href: "/admin/listing-submissions",
      badge: submissions === null ? undefined : `신규 ${newCount}건`,
      highlight: newCount > 0,
    },
    {
      title: "매물 등록",
      description: "새 매물 정보를 직접 입력해 등록합니다.",
      href: "/admin/listings/new",
    },
    {
      title: "등록된 매물 관리",
      description: "등록된 매물을 수정하거나 공개 상태를 바꿉니다.",
      href: "/admin/listings",
      badge: stats === null ? undefined : `등록 매물 ${stats.total}건`,
    },
    {
      title: "단지 정보 관리",
      description: "단지명·주소 등 단지 기본 정보를 관리합니다.",
      href: "/admin/complexes",
    },
    {
      title: "평면도 관리",
      description: "단지·타입별 평면도 이미지를 등록/관리합니다.",
      href: "/admin/floor-plans",
    },
    {
      title: "홈페이지 바로가기",
      description: "실제 공개 홈페이지를 새 탭에서 확인합니다.",
      href: "/",
      external: true,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        관리자 대시보드
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        오늘 확인해야 할 매물 접수와 매물 현황을 한눈에 볼 수 있어요.
      </p>

      {/* 상단 요약 */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`rounded-xl border p-5 ${
            newCount > 0
              ? "border-gold-500 bg-gold-500/10"
              : "border-navy-900/10 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-navy-800/60">신규 접수</p>
          <p
            className={`mt-1 text-3xl font-black ${
              newCount > 0 ? "text-gold-600" : "text-navy-950"
            }`}
          >
            {submissions === null ? "-" : `${newCount}건`}
          </p>
        </div>
        <div className="rounded-xl border border-navy-900/10 bg-white p-5">
          <p className="text-sm font-semibold text-navy-800/60">상담중 접수</p>
          <p className="mt-1 text-3xl font-black text-navy-950">
            {submissions === null ? "-" : `${confirmedCount}건`}
          </p>
        </div>
        <div className="rounded-xl border border-navy-900/10 bg-white p-5">
          <p className="text-sm font-semibold text-navy-800/60">등록된 매물</p>
          <p className="mt-1 text-3xl font-black text-navy-950">
            {stats === null ? "-" : `${stats.total}건`}
          </p>
        </div>
      </div>

      {/* 바로가기 카드 */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            target={card.external ? "_blank" : undefined}
            className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
              card.highlight
                ? "border-gold-500 bg-gold-500/5 hover:bg-gold-500/10"
                : "border-navy-900/10 bg-white hover:border-gold-500"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-navy-950">{card.title}</h2>
                {card.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      card.highlight
                        ? "bg-gold-500 text-navy-950"
                        : "bg-navy-900/5 text-navy-800"
                    }`}
                  >
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-navy-800/70">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* 최근 접수 */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-navy-950">최근 접수</h2>

        {submissions === null ? (
          <p className="mt-4 text-sm text-navy-800/50">불러오는 중...</p>
        ) : recentSubmissions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-navy-900/10 px-6 py-10 text-center text-sm text-navy-800/50">
            아직 접수된 매물이 없습니다.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {recentSubmissions.map((submission) => {
              const statusMeta = STATUS_META[submission.status];
              const buildingFloor = formatBuildingFloor(submission);
              return (
                <li
                  key={submission.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-900/10 p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                      <p className="text-sm font-bold text-navy-950">
                        {submission.complexName}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-navy-800/60">
                      {buildingFloor ? `${buildingFloor} · ` : ""}
                      {submission.transactionType} · {submission.desiredPriceLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-navy-800/40">
                      {formatSubmittedAt(submission.createdAt)}
                    </p>
                  </div>
                  <Link
                    href="/admin/listing-submissions"
                    className="shrink-0 rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                  >
                    접수 확인
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
