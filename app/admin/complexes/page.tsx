"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Complex } from "../../data/complexes";
import type { ComplexCompletion } from "../../lib/complexes";

type ComplexWithCompletion = Complex & { completion: ComplexCompletion };

function completionLabel(level: ComplexCompletion["basic"]): string {
  if (level === "complete") return "✓";
  if (level === "partial") return "△";
  return "미입력";
}

function completionClass(level: ComplexCompletion["basic"]): string {
  if (level === "complete") return "text-green-600";
  if (level === "partial") return "text-gold-600";
  return "text-navy-800/40";
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
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    <span className={completionClass(complex.completion.basic)}>
                      기본정보 {completionLabel(complex.completion.basic)}
                    </span>
                    <span className="text-navy-800/20">|</span>
                    <span className={completionClass(complex.completion.ai)}>
                      AI {completionLabel(complex.completion.ai)}
                    </span>
                    <span className="text-navy-800/20">|</span>
                    <span
                      className={
                        complex.completion.molitConnected
                          ? "text-green-600"
                          : "text-navy-800/40"
                      }
                    >
                      실거래 {complex.completion.molitConnected ? "연결됨" : "미연결"}
                    </span>
                    <span className="text-navy-800/20">|</span>
                    <span className="text-navy-800/60">
                      평면도 {complex.completion.floorPlanCount}개
                    </span>
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
