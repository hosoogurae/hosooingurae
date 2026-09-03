"use client";

import { useState } from "react";
import Link from "next/link";
import type { MedianPriceSummary, PeriodComparison } from "../lib/sise";
import type { AskingListingsForBracket } from "../lib/siseAskingListings";
import { formatContractDate, formatPriceFull } from "../lib/transactions";
import { ChevronDownIcon } from "./icons";

export interface BracketEntry {
  representativeArea: number;
  recentPeriodLabel: string;
  recent: MedianPriceSummary;
  comparison: PeriodComparison | null;
  recentTrades: { dealDate: string; dealAmount: number; floor: number }[];
  asking: AskingListingsForBracket;
}

export interface ComplexSiseEntry {
  complexId: string;
  complexName: string;
  /** false면 molit_lawd_code/aptSeq가 없는 단지 — "실거래 정보 준비 중"만 안내하고 0건이라 말하지 않습니다. */
  hasMolit: boolean;
  recentTradeCount: number;
  brackets: BracketEntry[];
}

/**
 * /sise 전용 드릴다운: 단지 → 전용면적 구간 → 상세(실거래 통계 + 현재 매물).
 * 모든 데이터는 서버에서 이미 계산돼 내려오고, 이 컴포넌트는 펼침/접힘
 * 상태만 다룹니다 — 클릭할 때마다 새로 fetch하지 않습니다.
 */
export default function SiseExplorer({
  complexes,
  marketDataMonthsBack,
}: {
  complexes: ComplexSiseEntry[];
  /** 서버가 실제로 조회한 개월 수 — "최근 N개월 내 거래가 없습니다" 안내 문구가 조회 기간과 어긋나지 않게 여기서 그대로 받습니다. */
  marketDataMonthsBack: number;
}) {
  const [expandedComplexId, setExpandedComplexId] = useState<string | null>(null);
  const [expandedBracketKey, setExpandedBracketKey] = useState<string | null>(null);

  if (complexes.length === 0) {
    return (
      <p className="rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/60">
        등록된 아파트 단지가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {complexes.map((complex) => {
        const isComplexExpanded = expandedComplexId === complex.complexId;

        return (
          <li
            key={complex.complexId}
            className="overflow-hidden rounded-xl border border-navy-900/10 bg-white"
          >
            <button
              type="button"
              onClick={() => {
                setExpandedComplexId(isComplexExpanded ? null : complex.complexId);
                setExpandedBracketKey(null);
              }}
              className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-navy-900/[0.02] sm:p-5"
            >
              <div className="min-w-0">
                <p className="font-bold text-navy-950">{complex.complexName}</p>
                <p className="mt-1 text-xs text-navy-800/50">
                  {!complex.hasMolit
                    ? "실거래 정보 준비 중"
                    : complex.brackets.length === 0
                      ? `최근 ${marketDataMonthsBack}개월 내 신고된 거래가 없습니다`
                      : `최근 6개월 거래 ${complex.recentTradeCount}건`}
                </p>
              </div>
              {complex.hasMolit && complex.brackets.length > 0 && (
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 text-navy-800/40 transition-transform ${
                    isComplexExpanded ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {isComplexExpanded && complex.brackets.length > 0 && (
              <ul className="divide-y divide-navy-900/10 border-t border-navy-900/10">
                {complex.brackets.map((bracket) => {
                  const bracketKey = `${complex.complexId}-${bracket.representativeArea}`;
                  const isBracketExpanded = expandedBracketKey === bracketKey;

                  return (
                    <li key={bracketKey}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBracketKey(isBracketExpanded ? null : bracketKey)
                        }
                        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-navy-900/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div>
                          <p className="text-sm font-bold text-navy-950">
                            전용 {bracket.representativeArea}㎡
                          </p>
                          <p className="mt-0.5 text-xs text-navy-800/50">
                            {bracket.recent.hidden
                              ? `${bracket.recentPeriodLabel} 거래 ${bracket.recent.count}건`
                              : `${bracket.recentPeriodLabel} 실거래 ${bracket.recent.count}건`}
                          </p>
                        </div>
                        {!bracket.recent.hidden && (
                          <p className="text-sm font-bold text-navy-950">
                            {formatPriceFull(bracket.recent.minPrice)} ~{" "}
                            {formatPriceFull(bracket.recent.maxPrice)}
                          </p>
                        )}
                      </button>

                      {isBracketExpanded && (
                        <BracketDetail bracket={bracket} complexId={complex.complexId} />
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

/**
 * 구간 상세. 모바일에서 위→아래 순서가 곧 표시 순서라, 실거래 통계를 매물
 * 목록보다 먼저 두는 것만으로 "시세부터, 광고는 그다음" 순서가 됩니다.
 * 데스크톱은 같은 DOM 순서를 grid 2열로 나란히 배치합니다.
 */
function BracketDetail({
  bracket,
  complexId,
}: {
  bracket: BracketEntry;
  complexId: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 bg-navy-900/[0.02] px-4 py-5 sm:grid-cols-2 sm:px-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-navy-800/50">
          실거래 통계
        </h3>

        {bracket.recent.hidden ? (
          <p className="mt-3 rounded-md border border-navy-900/10 bg-white px-3 py-3 text-sm text-navy-800/60">
            거래가 적어 산출이 어렵습니다 ({bracket.recentPeriodLabel} {bracket.recent.count}건).
          </p>
        ) : (
          <div className="mt-3 rounded-md border border-navy-900/10 bg-white px-4 py-3">
            <p className="text-lg font-black text-navy-950">
              {formatPriceFull(bracket.recent.minPrice)} ~ {formatPriceFull(bracket.recent.maxPrice)}
            </p>
            <p className="mt-1 text-xs text-navy-800/50">
              {bracket.recentPeriodLabel} {bracket.recent.count}건 기준
            </p>
          </div>
        )}

        {bracket.comparison && (
          <div className="mt-3 rounded-md border border-navy-900/10 bg-white px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-navy-800/50">전년 동기 대비</p>
            <p className="mt-1 text-navy-950">
              <span className="font-bold">
                {formatPriceFull(bracket.comparison.previous.medianPrice)}
              </span>
              <span className="text-navy-800/50">
                {" "}
                ({bracket.comparison.previous.count}건, {bracket.comparison.previous.label})
              </span>
              {" → "}
              <span className="font-bold">
                {formatPriceFull(bracket.comparison.current.medianPrice)}
              </span>
              <span className="text-navy-800/50">
                {" "}
                ({bracket.comparison.current.count}건, {bracket.comparison.current.label})
              </span>
            </p>
            <p
              className={`mt-1 text-xs font-semibold ${
                bracket.comparison.changePercent >= 0 ? "text-red-600" : "text-blue-600"
              }`}
            >
              {bracket.comparison.changePercent >= 0 ? "+" : ""}
              {bracket.comparison.changePercent.toFixed(1)}% (중앙값 기준)
            </p>
          </div>
        )}

        {bracket.recentTrades.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-navy-800/50">최근 거래 내역</p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-navy-800/70">
              {bracket.recentTrades.map((trade, index) => (
                <li key={index} className="flex items-center justify-between gap-2">
                  <span>
                    {formatContractDate(trade.dealDate)} · {trade.floor}층
                  </span>
                  <span className="font-semibold text-navy-900">
                    {formatPriceFull(trade.dealAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-navy-800/50">
          현재 매물
        </h3>

        {bracket.asking.saleListings.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {bracket.asking.saleListings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/listings/${listing.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-navy-900/10 bg-white px-4 py-3 text-sm transition-colors hover:border-gold-500 hover:bg-gold-500/5"
                >
                  <span className="text-navy-800/70">
                    {listing.floor}층 · 전용 {listing.exclusiveArea}㎡
                  </span>
                  <span className="font-bold text-navy-950">{listing.priceLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : bracket.asking.jeonseCount > 0 || bracket.asking.wolseCount > 0 ? (
          <Link
            href={`/listings?complexId=${encodeURIComponent(complexId)}`}
            className="mt-3 block rounded-md border border-navy-900/10 bg-white px-4 py-3 text-sm text-navy-800/70 transition-colors hover:border-gold-500 hover:bg-gold-500/5"
          >
            매매 매물은 없지만{" "}
            {bracket.asking.jeonseCount > 0 && `전세 ${bracket.asking.jeonseCount}건`}
            {bracket.asking.jeonseCount > 0 && bracket.asking.wolseCount > 0 && " · "}
            {bracket.asking.wolseCount > 0 && `월세 ${bracket.asking.wolseCount}건`}이 있습니다 →
          </Link>
        ) : (
          <p className="mt-3 rounded-md border border-navy-900/10 bg-white px-4 py-3 text-sm text-navy-800/50">
            현재 등록된 매물이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
