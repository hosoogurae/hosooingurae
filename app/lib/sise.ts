import { isCanceledTrade, type MolitAptTradeItem } from "./molit";

/**
 * "84㎡ vs 59㎡" 등 서로 다른 평형을 구분하는 전용면적 오차 허용 범위(㎡).
 * app/lib/transactions.ts의 groupTransactionsByExclusiveArea와 같은 관례를
 * 그대로 따릅니다(세대별 등록면적이 미세하게 달라도 같은 평형으로 묶기 위함).
 */
const AREA_TOLERANCE = 1;

export interface ComplexAreaSummary {
  aptSeq: string;
  aptNm: string;
  /** 그룹 내 전용면적 평균(㎡, 소수 첫째 자리 반올림). */
  representativeArea: number;
  tradeCount: number;
  /** 만원 단위. */
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  /** YYYY-MM-DD, 그룹 내 가장 최근 계약일. */
  latestDealDate: string;
  /** 계약일 내림차순. */
  trades: MolitAptTradeItem[];
}

export interface SiseSummary {
  tradeCount: number;
  /** 만원 단위. 거래가 없으면 null. */
  averagePrice: number | null;
  highestTrade: MolitAptTradeItem | null;
  /** 거래 건수 많은 순. */
  complexAreaSummaries: ComplexAreaSummary[];
}

/** 해제(취소) 신고를 제외하고, 지정한 법정동(umdNm)의 거래만 남깁니다. */
export function filterValidDongTrades(
  trades: MolitAptTradeItem[],
  dongName: string,
): MolitAptTradeItem[] {
  return trades.filter((trade) => trade.umdNm === dongName && !isCanceledTrade(trade));
}

/** 이미 한 단지로 좁혀진 거래 목록을, 전용면적이 비슷한(±tolerance㎡) 것끼리 묶습니다. */
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

function summarizeGroup(
  aptSeq: string,
  aptNm: string,
  representativeArea: number,
  trades: MolitAptTradeItem[],
): ComplexAreaSummary {
  const sortedByDateDesc = [...trades].sort((a, b) => b.dealDate.localeCompare(a.dealDate));
  const prices = trades.map((trade) => trade.dealAmount);

  return {
    aptSeq,
    aptNm,
    representativeArea,
    tradeCount: trades.length,
    averagePrice: Math.round(
      prices.reduce((sum, price) => sum + price, 0) / prices.length,
    ),
    highestPrice: Math.max(...prices),
    lowestPrice: Math.min(...prices),
    latestDealDate: sortedByDateDesc[0].dealDate,
    trades: sortedByDateDesc,
  };
}

/**
 * 법정동 실거래 목록(이미 filterValidDongTrades를 거친 것을 넘겨야 함)을
 * 단지별·평형별로 묶어 요약합니다. 같은 단지라도 전용면적이 다르면(84㎡/59㎡
 * 등) 별도 행으로 나뉩니다. 결과는 거래 건수가 많은 순으로 정렬됩니다.
 */
export function summarizeDongTrades(trades: MolitAptTradeItem[]): SiseSummary {
  if (trades.length === 0) {
    return { tradeCount: 0, averagePrice: null, highestTrade: null, complexAreaSummaries: [] };
  }

  const byComplex = new Map<string, MolitAptTradeItem[]>();
  for (const trade of trades) {
    const key = trade.aptSeq || trade.aptNm;
    const group = byComplex.get(key) ?? [];
    group.push(trade);
    byComplex.set(key, group);
  }

  const complexAreaSummaries: ComplexAreaSummary[] = [];
  for (const [aptSeq, complexTrades] of byComplex) {
    const areaGroups = groupByArea(complexTrades, AREA_TOLERANCE);
    for (const areaGroup of areaGroups) {
      complexAreaSummaries.push(
        summarizeGroup(
          aptSeq,
          complexTrades[0].aptNm,
          areaGroup.representativeArea,
          areaGroup.trades,
        ),
      );
    }
  }

  complexAreaSummaries.sort((a, b) => b.tradeCount - a.tradeCount);

  const allPrices = trades.map((trade) => trade.dealAmount);
  const highestTrade = trades.reduce((max, trade) =>
    trade.dealAmount > max.dealAmount ? trade : max,
  );

  return {
    tradeCount: trades.length,
    averagePrice: Math.round(
      allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length,
    ),
    highestTrade,
    complexAreaSummaries,
  };
}
