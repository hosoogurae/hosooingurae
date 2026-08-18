"use client";

import { useState } from "react";
import Link from "next/link";
import type { ComplexAreaSummary } from "../lib/sise";
import { formatContractDate, formatPriceFull } from "../lib/transactions";

/**
 * /sise 전용 — 단지·평형별 요약 카드 목록. 카드를 누르면 그 그룹의 개별
 * 거래 내역이 펼쳐집니다. complexIdByAptSeq에 매핑이 있는 단지는 "평형별
 * 상세 시세 보기" 링크로 /valuation(그 단지의 2단계부터 시작)까지 이어집니다
 * — 매핑이 없는(우리 DB 미등록 또는 molit 미연동) 단지는 이 링크가 자연히
 * 빠집니다.
 */
export default function SiseComplexList({
  summaries,
  complexIdByAptSeq,
}: {
  summaries: ComplexAreaSummary[];
  complexIdByAptSeq: Record<string, string>;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {summaries.map((summary) => {
        const key = `${summary.aptSeq}-${summary.representativeArea}`;
        const isExpanded = expandedKey === key;
        const complexId = complexIdByAptSeq[summary.aptSeq];

        return (
          <li
            key={key}
            className="overflow-hidden rounded-xl border border-navy-900/10 bg-white"
          >
            <button
              type="button"
              onClick={() => setExpandedKey(isExpanded ? null : key)}
              className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-navy-900/[0.02] sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div>
                <p className="font-bold text-navy-950">
                  {summary.aptNm}
                  <span className="ml-2 text-sm font-normal text-navy-800/50">
                    전용 {summary.representativeArea}㎡
                  </span>
                </p>
                <p className="mt-1 text-xs text-navy-800/50">
                  최근 거래 {formatContractDate(summary.latestDealDate)}
                </p>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-navy-800/50">거래건수</p>
                  <p className="font-bold text-navy-950">{summary.tradeCount}건</p>
                </div>
                <div>
                  <p className="text-xs text-navy-800/50">평균가</p>
                  <p className="font-bold text-navy-950">
                    {formatPriceFull(summary.averagePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-navy-800/50">최고가 / 최저가</p>
                  <p className="font-bold text-navy-950">
                    {formatPriceFull(summary.highestPrice)} /{" "}
                    {formatPriceFull(summary.lowestPrice)}
                  </p>
                </div>
              </div>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-900/10 bg-navy-900/[0.02] px-4 py-2 sm:px-5">
              <span className="text-xs text-navy-800/40">
                카드를 누르면 개별 거래 내역이 펼쳐집니다
              </span>
              {complexId && (
                <Link
                  href={`/valuation?complexId=${encodeURIComponent(complexId)}`}
                  className="shrink-0 text-xs font-bold text-gold-600 hover:underline"
                >
                  평형별 상세 시세 보기 →
                </Link>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 sm:px-5">
                <ul className="flex flex-col gap-1.5 text-sm text-navy-800/70">
                  {summary.trades.map((trade, index) => (
                    <li key={index} className="flex items-center justify-between gap-2">
                      <span>
                        {formatContractDate(trade.dealDate)} · {trade.floor}층 · 전용{" "}
                        {trade.excluUseAr}㎡
                      </span>
                      <span className="font-semibold text-navy-900">
                        {formatPriceFull(trade.dealAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
