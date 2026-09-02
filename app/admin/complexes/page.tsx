"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Complex } from "../../data/complexes";
import type { ComplexCompletion } from "../../lib/complexes";

type ComplexWithCompletion = Complex & { completion: ComplexCompletion };

function StatusBadge({
  label,
  complete,
  missing = [],
  optional = false,
}: {
  label: string;
  complete?: boolean;
  missing?: string[];
  optional?: boolean;
}) {
  const text = optional ? "선택 입력" : complete ? "입력 완료" : "확인 필요";
  const style = optional
    ? "bg-navy-900/5 text-navy-800/50"
    : complete
      ? "bg-green-50 text-green-700"
      : "bg-amber-50 text-amber-700";
  const detail = missing.length > 0 ? `확인 필요: ${missing.join(", ")}` : undefined;
  return (
    <details className="group relative">
      <summary title={detail} className={`cursor-pointer list-none rounded-full px-2.5 py-1 ${style}`}>
        {complete && !optional ? "✓ " : optional ? "○ " : "△ "}{label} · {text}
      </summary>
      {detail && (
        <span className="absolute left-0 top-full z-10 mt-1 hidden w-max max-w-xs rounded-md bg-navy-950 px-3 py-2 text-xs font-normal text-white shadow-lg group-open:block group-hover:block">
          {detail}
        </span>
      )}
    </details>
  );
}

export default function AdminComplexesPage() {
  const [complexes, setComplexes] = useState<ComplexWithCompletion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/complexes");
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(data.error ?? "단지 목록을 불러오지 못했습니다.");
          }
          return;
        }
        if (!cancelled) {
          setComplexes(data.complexes as ComplexWithCompletion[]);
        }
      } catch {
        if (!cancelled) {
          setLoadError("네트워크 오류로 단지 목록을 불러오지 못했습니다.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-950 sm:text-3xl">
          단지 정보 관리
        </h1>
        <Link
          href="/admin/complexes/new"
          className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
        >
          + 새 단지 등록
        </Link>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        단지별로 기본정보 · AI 검색용 정보 · MOLIT 실거래 연동 · 평면 타입이
        얼마나 채워져 있는지 한눈에 확인할 수 있습니다. 전부 채워야만 등록되는
        건 아니니, 부족한 영역은 나중에 언제든 보완하면 됩니다.
      </p>
      <div className="mt-3 rounded-lg bg-navy-900/[0.03] px-4 py-3 text-xs leading-relaxed text-navy-800/65">
        기본정보: 단지명·주소·건축물 용도·사용승인일·세대수 / 교통·학군:
        지하철 또는 학교 정보 / MOLIT: lawdCode와 aptSeq 연결 / 평면도·사진 등은 선택 입력
      </div>

      {loadError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {loadError}
        </p>
      )}

      {complexes === null ? (
        <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
      ) : complexes.length === 0 ? (
        <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
          등록된 단지가 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {complexes.map((complex) => (
            <li
              key={complex.id}
              className="rounded-xl border border-navy-900/10 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-navy-950">
                    {complex.name}
                  </p>
                  <p className="mt-1 text-sm text-navy-800/70">
                    {complex.address || "주소 미입력"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <StatusBadge label="기본정보" complete={complex.completion.basic === "complete"} missing={complex.completion.basicMissing} />
                    <StatusBadge label="교통·학군" complete={complex.completion.ai === "complete"} missing={complex.completion.aiMissing} />
                    <StatusBadge label="MOLIT" complete={complex.completion.molitConnected} missing={complex.completion.molitMissing} />
                    <StatusBadge label={`평면도 ${complex.completion.floorPlanCount}개`} optional />
                  </div>
                </div>
                <Link
                  href={`/admin/complexes/${complex.id}/edit`}
                  className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                >
                  관리
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
