import { isCanceledTrade, type MolitAptTradeItem } from "./molit";

/**
 * "84㎡ vs 59㎡" 등 서로 다른 평형을 구분하는 전용면적 오차 허용 범위(㎡).
 * app/lib/transactions.ts의 groupTransactionsByExclusiveArea와 같은 관례를
 * 그대로 따릅니다(세대별 등록면적이 미세하게 달라도 같은 평형으로 묶기 위함).
 */
const AREA_TOLERANCE = 1;

/** 통계(중앙값 등)를 보여줄 최소 표본 수. 이보다 적으면 수치를 감추고 안내 문구로 대체합니다. */
export const MIN_SAMPLE_SIZE = 5;

/** 해제(취소) 신고를 제외하고, 지정한 법정동(umdNm)의 거래만 남깁니다. */
export function filterValidDongTrades(
  trades: MolitAptTradeItem[],
  dongName: string,
): MolitAptTradeItem[] {
  return trades.filter((trade) => trade.umdNm === dongName && !isCanceledTrade(trade));
}

/** 거래 목록을, 전용면적이 비슷한(±tolerance㎡) 것끼리 묶습니다. */
function groupByArea(
  trades: MolitAptTradeItem[],
  tolerance: number,
): { representativeArea: number; trades: MolitAptTradeItem[] }[] {
  const sorted = [...trades].sort((a, b) => a.excluUseAr - b.excluUseAr);
  const groups: { representativeArea: number; trades: MolitAptTradeItem[] }[] = [];

  for (const trade of sorted) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && trade.excluUseAr - currentGroup.representativeArea <= tolerance) {
      currentGroup.trades.push(trade);
      const sum = currentGroup.trades.reduce((acc, item) => acc + item.excluUseAr, 0);
      currentGroup.representativeArea = Math.round((sum / currentGroup.trades.length) * 10) / 10;
    } else {
      groups.push({ representativeArea: trade.excluUseAr, trades: [trade] });
    }
  }

  return groups;
}

/** 가격(만원) 배열의 중앙값. 짝수 개면 가운데 두 값의 평균(표준적인 중앙값 정의)을 반올림합니다. */
export function medianPrice(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export type MedianPriceSummary =
  | { hidden: true; count: number }
  | { hidden: false; count: number; medianPrice: number; minPrice: number; maxPrice: number };

/**
 * 표본이 MIN_SAMPLE_SIZE 미만이면 수치를 숨깁니다(CLAUDE.md 1-3 — "거래가
 * 적어 산출 어려움"은 화면이 표시하고, 이 함수는 hidden 플래그만 돌려줍니다).
 */
export function summarizeMedianPrice(trades: MolitAptTradeItem[]): MedianPriceSummary {
  const count = trades.length;
  if (count < MIN_SAMPLE_SIZE) return { hidden: true, count };

  const prices = trades.map((trade) => trade.dealAmount);
  return {
    hidden: false,
    count,
    medianPrice: medianPrice(prices),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}

export interface PeriodRange {
  /** YYYY-MM-DD, 이 날짜 이상. */
  startDate: string;
  /** YYYY-MM-DD, 이 날짜 이하(그 달의 말일). */
  endDate: string;
  /** "2026.03~2026.08" 형태. */
  label: string;
}

function monthsAgo(now: Date, n: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - n, 1);
}

function lastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * "이번 달은 아직 신고가 다 안 끝났을 수 있다"고 보고 이번 달은 제외한,
 * monthsBack개월짜리 기간을 만듭니다. monthsAgoOffset(기본 1)을 더 크게
 * 주면 그만큼 더 과거로 밀린 같은 길이의 기간이 됩니다(예: monthsBack=6,
 * offset=1이면 최근 기간, offset=7이면 그 바로 직전 6개월, offset=13이면
 * 정확히 1년 전의 같은 6개월 — comparePeriods는 전년 동기 비교를 위해
 * offset=13을 씁니다, 계절이 다른 offset=7과 헷갈리지 말 것).
 */
export function getPeriodRange(
  now: Date,
  monthsBack: number,
  monthsAgoOffset = 1,
): PeriodRange {
  const endMonth = monthsAgo(now, monthsAgoOffset);
  const startMonth = monthsAgo(now, monthsAgoOffset + monthsBack - 1);
  return {
    startDate: toDateString(startMonth),
    endDate: toDateString(lastDayOfMonth(endMonth)),
    label: `${formatYearMonth(startMonth)}~${formatYearMonth(endMonth)}`,
  };
}

function filterTradesInRange(
  trades: MolitAptTradeItem[],
  range: PeriodRange,
): MolitAptTradeItem[] {
  return trades.filter(
    (trade) => trade.dealDate >= range.startDate && trade.dealDate <= range.endDate,
  );
}

export interface PeriodComparison {
  current: { label: string; medianPrice: number; count: number };
  previous: { label: string; medianPrice: number; count: number };
  /** previous 대비 current의 변화율(%). 반올림 안 함 — 화면에서 소수 자리 결정. */
  changePercent: number;
}

/** 전년 동기 비교의 "동기"를 얼마나 과거로 밀지(개월). */
const YEAR_OVER_YEAR_OFFSET_MONTHS = 12;

/**
 * "최근 기간 vs 정확히 1년 전 같은 달들(전년 동기)" 비교입니다. 예를 들어
 * monthsBack=6이면 "2026.03~2026.08" vs "2025.03~2025.08"처럼 같은
 * 계절끼리 비교합니다 — 원래는 "그 직전 같은 길이의 기간"(예: 2025.09~
 * 2026.02 vs 2026.03~2026.08)이었는데, 이러면 이사철(봄·여름)과 비수기
 * (가을·겨울)를 비교하게 돼서 계절성이 시세 변동처럼 보이는 문제가
 * 있었습니다. 양쪽 다 MIN_SAMPLE_SIZE 이상일 때만 결과를 돌려주고,
 * 하나라도 부족하면 null입니다 — 표본이 적은 비교는 아예 보여주지
 * 않습니다("한 건 빠지면 크게 흔들리는 값을 단단해 보이게 만들지
 * 않는다"는 원칙).
 */
function comparePeriods(
  allTrades: MolitAptTradeItem[],
  now: Date,
  monthsBack: number,
): PeriodComparison | null {
  const currentRange = getPeriodRange(now, monthsBack, 1);
  const previousRange = getPeriodRange(
    now,
    monthsBack,
    1 + YEAR_OVER_YEAR_OFFSET_MONTHS,
  );

  const currentSummary = summarizeMedianPrice(filterTradesInRange(allTrades, currentRange));
  const previousSummary = summarizeMedianPrice(filterTradesInRange(allTrades, previousRange));

  if (currentSummary.hidden || previousSummary.hidden) return null;

  const changePercent =
    ((currentSummary.medianPrice - previousSummary.medianPrice) / previousSummary.medianPrice) *
    100;

  return {
    current: {
      label: currentRange.label,
      medianPrice: currentSummary.medianPrice,
      count: currentSummary.count,
    },
    previous: {
      label: previousRange.label,
      medianPrice: previousSummary.medianPrice,
      count: previousSummary.count,
    },
    changePercent,
  };
}

export interface AreaBracket {
  /** 그룹 내 전용면적 평균(㎡, 소수 첫째 자리 반올림). 호가(우리 매물) 쪽도 같은 값으로 구간을 맞춥니다. */
  representativeArea: number;
  recentPeriod: PeriodRange;
  recent: MedianPriceSummary;
  comparison: PeriodComparison | null;
  /** 계약일 내림차순, 상세 화면의 "최근 거래 내역"용. recent 기간 밖의 거래도 포함(호출부가 넘긴 조회 기간 전체 — 전년 동기 비교를 하려면 24개월 필요). */
  trades: MolitAptTradeItem[];
}

/**
 * 이미 한 단지(aptSeq)로 좁혀진 거래(전년 동기 비교를 하려면 24개월치가
 * 필요합니다 — 호출부인 app/sise/page.tsx의 MARKET_DATA_MONTHS_BACK 참고)를
 * 전용면적 구간으로 나누고, 구간별로 중앙값 요약과 전년 동기 대비를
 * 계산합니다. 거래건수 많은 순으로 정렬합니다.
 */
export function buildComplexAreaBrackets(
  complexTrades: MolitAptTradeItem[],
  now: Date,
  recentMonths = 6,
): AreaBracket[] {
  const recentPeriod = getPeriodRange(now, recentMonths, 1);

  return groupByArea(complexTrades, AREA_TOLERANCE)
    .map((group) => ({
      representativeArea: group.representativeArea,
      recentPeriod,
      recent: summarizeMedianPrice(filterTradesInRange(group.trades, recentPeriod)),
      comparison: comparePeriods(group.trades, now, recentMonths),
      trades: [...group.trades].sort((a, b) => b.dealDate.localeCompare(a.dealDate)),
    }))
    .sort((a, b) => b.trades.length - a.trades.length);
}

/** 단지 목록 화면의 "최근 N개월 M건" 배지용 — 구간 나누기 전, 단지 전체 거래건수. */
export function countRecentTrades(
  complexTrades: MolitAptTradeItem[],
  now: Date,
  recentMonths = 6,
): number {
  return filterTradesInRange(complexTrades, getPeriodRange(now, recentMonths, 1)).length;
}
