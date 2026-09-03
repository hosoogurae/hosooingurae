import type { Metadata } from "next";
import { getAllComplexes } from "../lib/complexes";
import { getAllListings } from "../lib/listings";
import { MolitApiError } from "../lib/molit";
import {
  getGuraeApartmentMarketData,
  type GuraeMarketData,
} from "../lib/siseMarketData";
import { buildAskingListingsForBracket } from "../lib/siseAskingListings";
import { buildComplexAreaBrackets, countRecentTrades } from "../lib/sise";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { PhoneIcon } from "../components/icons";
import SiseExplorer, { type ComplexSiseEntry } from "../components/SiseExplorer";

export const metadata: Metadata = {
  title: "구래동 아파트 시세 | 호수공인중개사사무소",
  description:
    "국토교통부 실거래가 공개시스템 기준, 구래동 아파트 단지·평형별 실거래 시세와 현재 매물을 함께 확인하세요.",
};

// 데이터는 siseMarketData의 1시간/24시간 tiered 캐시로 관리되므로, 이 페이지
// 자체는 매 요청마다 새로 실행되게 둡니다(다른 공개 페이지와 동일한 패턴).
export const dynamic = "force-dynamic";

const MOLIT_PUBLIC_SYSTEM_URL = "https://rt.molit.go.kr";
const RECENT_MONTHS = 6;
/** MOLIT 18개월 조회 + 전년 동기 비교(최근 6개월 vs 그 직전 6개월)에 필요한 최소 기간. */
const MARKET_DATA_MONTHS_BACK = 18;

/** 최근 거래 내역 화면에 몇 건까지 펼쳐 보여줄지. */
const MAX_RECENT_TRADES_SHOWN = 10;

async function buildComplexEntries(
  market: GuraeMarketData,
  now: Date,
): Promise<ComplexSiseEntry[]> {
  const allComplexes = await getAllComplexes();
  const apartmentComplexes = allComplexes.filter(
    (complex) => complex.propertyType === "아파트",
  );

  const entries = await Promise.all(
    apartmentComplexes.map(async (complex): Promise<ComplexSiseEntry> => {
      if (!complex.molit) {
        return {
          complexId: complex.id,
          complexName: complex.name,
          hasMolit: false,
          recentTradeCount: 0,
          brackets: [],
        };
      }

      const complexTrades = market.trades.filter(
        (trade) => trade.aptSeq === complex.molit?.aptSeq,
      );
      const brackets = buildComplexAreaBrackets(complexTrades, now, RECENT_MONTHS);

      // 매물은 단지당 한 번만 조회하고, 구간마다는 이미 받아온 목록을 나눠 씁니다.
      const complexListings = await getAllListings({
        filters: { complexId: complex.id, propertyType: "아파트" },
      });

      return {
        complexId: complex.id,
        complexName: complex.name,
        hasMolit: true,
        recentTradeCount: countRecentTrades(complexTrades, now, RECENT_MONTHS),
        brackets: brackets.map((bracket) => ({
          representativeArea: bracket.representativeArea,
          recentPeriodLabel: bracket.recentPeriod.label,
          recent: bracket.recent,
          comparison: bracket.comparison,
          recentTrades: bracket.trades.slice(0, MAX_RECENT_TRADES_SHOWN).map((trade) => ({
            dealDate: trade.dealDate,
            dealAmount: trade.dealAmount,
            floor: trade.floor,
          })),
          asking: buildAskingListingsForBracket(
            complexListings,
            bracket.representativeArea,
          ),
        })),
      };
    }),
  );

  // 최근 거래가 많은 단지가 먼저 보이도록 정렬(molit 미연동 단지는 뒤로).
  return entries.sort((a, b) => {
    if (a.hasMolit !== b.hasMolit) return a.hasMolit ? -1 : 1;
    return b.recentTradeCount - a.recentTradeCount;
  });
}

export default async function SisePage() {
  let entries: ComplexSiseEntry[] = [];
  let loadError: string | null = null;
  let queriedAt: string | null = null;
  let coveredPeriodLabel: string | null = null;

  try {
    const now = new Date();
    const market = await getGuraeApartmentMarketData(MARKET_DATA_MONTHS_BACK);
    queriedAt = market.queriedAt;
    const months = market.coveredYearMonths;
    if (months.length > 0) {
      const oldest = months[months.length - 1];
      const newest = months[0];
      coveredPeriodLabel =
        oldest === newest
          ? `${oldest.slice(0, 4)}년 ${Number(oldest.slice(4))}월 신고분`
          : `${oldest.slice(0, 4)}년 ${Number(oldest.slice(4))}월~${newest.slice(0, 4)}년 ${Number(
              newest.slice(4),
            )}월 신고분`;
    }
    entries = await buildComplexEntries(market, now);
  } catch (error) {
    loadError =
      error instanceof MolitApiError
        ? error.message
        : "실거래가를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  const queriedAtLabel = queriedAt
    ? new Date(queriedAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

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
          단지를 고르면 전용면적 구간별로 국토교통부 실거래 시세와 현재 등록된
          매물을 함께 볼 수 있습니다.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        {loadError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <p>{loadError}</p>
            <a
              href="/sise"
              className="mt-2 inline-block font-bold underline underline-offset-2"
            >
              다시 시도
            </a>
          </div>
        )}

        {!loadError && (
          <>
            {coveredPeriodLabel && queriedAtLabel && (
              <p className="text-xs text-navy-800/50">
                국토교통부 실거래가 공개시스템 · {coveredPeriodLabel} · 조회{" "}
                {queriedAtLabel}
              </p>
            )}

            <div className="mt-6">
              <SiseExplorer complexes={entries} />
            </div>

            <ul className="mt-10 list-disc space-y-1 pl-4 text-xs leading-relaxed text-navy-800/50">
              <li>해제(취소) 신고된 거래는 집계에서 제외했습니다.</li>
              <li>실거래가는 신고 및 정정 여부에 따라 변경될 수 있습니다.</li>
            </ul>
          </>
        )}

        <section className="mt-12 rounded-xl border border-navy-900/10 bg-navy-900/[0.02] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-navy-950">찾는 단지가 없나요?</h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-800/60">
            등록되지 않은 단지나 오피스텔·상가는 담당자가 직접 확인해드릴 수
            있어요.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-8 text-center shadow-lg shadow-gold-500/30">
            <p className="text-base font-bold text-navy-950">
              어느 단지든 시세를 확인해 알려드립니다
            </p>
            <a
              href={PHONE_HREF}
              className="mt-1 inline-flex items-center gap-2 rounded-md bg-navy-950 px-8 py-3.5 text-base font-black text-white shadow-md transition-transform hover:scale-[1.02]"
            >
              <PhoneIcon className="h-5 w-5 text-gold-400" />
              전화 상담 {PHONE_NUMBER}
            </a>
          </div>

          <div className="mt-6 text-center">
            <a
              href={MOLIT_PUBLIC_SYSTEM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
            >
              국토교통부 실거래가 공개시스템에서 직접 찾아보기 (rt.molit.go.kr) →
            </a>
          </div>
        </section>
      </section>
    </>
  );
}
