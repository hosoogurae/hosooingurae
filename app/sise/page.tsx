import type { Metadata } from "next";
import { fetchRecentAptTrades, MolitApiError } from "../lib/molit";
import {
  filterValidDongTrades,
  summarizeDongTrades,
  type SiseSummary,
} from "../lib/sise";
import { formatContractDate, formatPriceFull } from "../lib/transactions";
import SiseComplexList from "../components/SiseComplexList";

export const metadata: Metadata = {
  title: "구래동 아파트 시세 | 호수공인중개사사무소",
  description:
    "국토교통부 실거래가 공개시스템 기준, 최근 6개월 김포 구래동 아파트 매매 실거래 시세를 단지별로 확인하세요.",
};

// 데이터는 fetchRecentAptTrades 내부의 1시간 fetch 캐시로 관리되므로, 이
// 페이지 자체는 매 요청마다 새로 실행되게 둡니다(다른 공개 페이지와 동일한 패턴).
export const dynamic = "force-dynamic";

/** 김포시 법정동코드(시군구 단위) — 국토부 API는 동 단위 코드가 따로 없어, 이 코드로 받은 뒤 umdNm으로 걸러냅니다. */
const LAWD_CD_GIMPO = "41570";
const DONG_NAME = "구래동";
const RECENT_MONTHS = 6;

export default async function SisePage() {
  let summary: SiseSummary = {
    tradeCount: 0,
    averagePrice: null,
    highestTrade: null,
    complexAreaSummaries: [],
  };
  let loadError: string | null = null;

  try {
    const trades = await fetchRecentAptTrades(LAWD_CD_GIMPO, RECENT_MONTHS);
    const validTrades = filterValidDongTrades(trades, DONG_NAME);
    summary = summarizeDongTrades(validTrades);
  } catch (error) {
    loadError =
      error instanceof MolitApiError
        ? error.message
        : "실거래가를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          SISE
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          구래동 아파트 시세
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          국토교통부 실거래가 공개시스템에 신고된 최근 {RECENT_MONTHS}개월 김포
          구래동 아파트 매매 거래를 단지별로 모았습니다.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        {loadError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {!loadError && summary.tradeCount === 0 && (
          <p className="rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/60">
            최근 {RECENT_MONTHS}개월간 구래동에 신고된 매매 거래가 없습니다.
          </p>
        )}

        {!loadError && summary.tradeCount > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-navy-900/10 bg-white p-5">
                <p className="text-sm font-semibold text-navy-800/60">
                  최근 {RECENT_MONTHS}개월 거래건수
                </p>
                <p className="mt-1 text-3xl font-black text-navy-950">
                  {summary.tradeCount}건
                </p>
              </div>
              <div className="rounded-xl border border-navy-900/10 bg-white p-5">
                <p className="text-sm font-semibold text-navy-800/60">평균 거래가</p>
                <p className="mt-1 text-3xl font-black text-navy-950">
                  {summary.averagePrice !== null
                    ? formatPriceFull(summary.averagePrice)
                    : "-"}
                </p>
              </div>
              {summary.highestTrade && (
                <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-5">
                  <p className="text-sm font-semibold text-navy-800/60">최고가 거래</p>
                  <p className="mt-1 text-xl font-black text-navy-950">
                    {formatPriceFull(summary.highestTrade.dealAmount)}
                  </p>
                  <p className="mt-1 text-xs text-navy-800/50">
                    {summary.highestTrade.aptNm} ·{" "}
                    {formatContractDate(summary.highestTrade.dealDate)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-10">
              <h2 className="text-lg font-bold text-navy-950">단지별 시세</h2>
              <p className="mt-1 text-sm text-navy-800/60">
                거래 건수가 많은 순으로 정렬했습니다. 카드를 누르면 개별 거래
                내역을 확인할 수 있습니다.
              </p>
              <div className="mt-4">
                <SiseComplexList summaries={summary.complexAreaSummaries} />
              </div>
            </div>

            <ul className="mt-10 list-disc space-y-1 pl-4 text-xs leading-relaxed text-navy-800/50">
              <li>해제(취소) 신고된 거래는 집계에서 제외했습니다.</li>
              <li>실거래가는 신고 및 정정 여부에 따라 변경될 수 있습니다.</li>
              <li>
                정확한 거래 정보는 국토교통부 실거래가 공개시스템에서 확인해
                주세요.
              </li>
            </ul>
          </>
        )}
      </section>
    </>
  );
}
