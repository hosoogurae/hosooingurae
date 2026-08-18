"use client";

import { useState } from "react";
import Link from "next/link";
import type { ComplexGroup } from "../lib/sise";
import { formatContractDate, formatPriceFull } from "../lib/transactions";

/**
 * /sise 전용 — 단지를 상위 카드로, 평형을 그 안의 하위 행으로 보여줍니다.
 * 단지 카드를 누르면 평형별 행이 펼쳐지고, 평형 행을 누르면 그 평형의
 * 개별 거래 내역이 다시 펼쳐집니다(2단계 펼침). complexIdByAptSeq에
 * 매핑이 있는 단지는 "평형별 상세 시세 보기" 링크로 /valuation(그 단지의
 * 2단계부터 시작)까지 이어집니다 — 매핑이 없는(우리 DB 미등록 또는 molit
 * 미연동) 단지는 이 링크가 자연히 빠집니다.
 */
export default function SiseComplexList({
  complexGroups,
  complexIdByAptSeq,
}: {
  complexGroups: ComplexGroup[];
  complexIdByAptSeq: Record<string, string>;
}) {
  const [expandedComplexAptSeq, setExpandedComplexAptSeq] = useState<string | null>(
    null,
  );
  const [expandedAreaKey, setExpandedAreaKey] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {complexGroups.map((group) => {
        const isComplexExpanded = expandedComplexAptSeq === group.aptSeq;
        const complexId = complexIdByAptSeq[group.aptSeq];

        return (
          <li
            key={group.aptSeq}
            className="overflow-hidden rounded-xl border border-navy-900/10 bg-white"
          >
            <button
              type="button"
              onClick={() => {
                setExpandedComplexAptSeq(isComplexExpanded ? null : group.aptSeq);
                setExpandedAreaKey(null);
              }}
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-navy-900/[0.02] sm:p-5"
            >
              <p className="font-bold text-navy-950">{group.aptNm}</p>
              <span className="shrink-0 text-sm text-navy-800/60">
                총 거래 <strong className="text-navy-950">{group.tradeCount}건</strong>
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-900/10 bg-navy-900/[0.02] px-4 py-2 sm:px-5">
              <span className="text-xs text-navy-800/40">
                {isComplexExpanded
                  ? "단지명을 누르면 접힙니다"
                  : "단지명을 누르면 평형별 시세가 펼쳐집니다"}
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

            {isComplexExpanded && (
              <ul className="divide-y divide-navy-900/10 border-t border-navy-900/10">
                {group.areaRows.map((row) => {
                  const areaKey = `${group.aptSeq}-${row.representativeArea}`;
                  const isAreaExpanded = expandedAreaKey === areaKey;

                  return (
                    <li key={areaKey}>
                      <button
                        type="button"
                        onClick={() => setExpandedAreaKey(isAreaExpanded ? null : areaKey)}
                        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-navy-900/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div>
                          <p className="text-sm font-bold text-navy-950">
                            전용 {row.representativeArea}㎡
                          </p>
                          <p className="mt-0.5 text-xs text-navy-800/50">
                            최근 거래 {formatContractDate(row.latestDealDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                          <div>
                            <p className="text-navy-800/50">거래건수</p>
                            <p className="font-bold text-navy-950">{row.tradeCount}건</p>
                          </div>
                          <div>
                            <p className="text-navy-800/50">평균가</p>
                            <p className="font-bold text-navy-950">
                              {formatPriceFull(row.averagePrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-navy-800/50">최고가 / 최저가</p>
                            <p className="font-bold text-navy-950">
                              {formatPriceFull(row.highestPrice)} /{" "}
                              {formatPriceFull(row.lowestPrice)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {isAreaExpanded && (
                        <div className="bg-navy-900/[0.02] px-4 py-3 sm:px-5">
                          <ul className="flex flex-col gap-1.5 text-sm text-navy-800/70">
                            {row.trades.map((trade, index) => (
                              <li
                                key={index}
                                className="flex items-center justify-between gap-2"
                              >
                                <span>
                                  {formatContractDate(trade.dealDate)} · {trade.floor}
                                  층 · 전용 {trade.excluUseAr}㎡
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
            )}
          </li>
        );
      })}
    </ul>
  );
}
