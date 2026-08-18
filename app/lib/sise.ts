import { isCanceledTrade, type MolitAptTradeItem } from "./molit";

/**
 * "84㎡ vs 59㎡" 등 서로 다른 평형을 구분하는 전용면적 오차 허용 범위(㎡).
 * app/lib/transactions.ts의 groupTransactionsByExclusiveArea와 같은 관례를
 * 그대로 따릅니다(세대별 등록면적이 미세하게 달라도 같은 평형으로 묶기 위함).
 */
const AREA_TOLERANCE = 1;

/**
 * "e편한세상"/"이편한세상" 표기 통일, 끝의 "아파트" 제거, 공백 제거만 하는
 * 좁은 정규화입니다. 국토부 데이터에 같은 단지가 표기 차이로 서로 다른
 * aptSeq에 중복 등록된 경우(실사례: "호수마을e편한세상아파트"(41570-744)와
 * "호수마을이편한세상"(41570-763)이 실제로는 같은 단지)를 하나로 합치기
 * 위함입니다. "2단지"/"3차" 같은 구분자는 건드리지 않으므로 실제로 다른
 * 단지끼리는 정규화 후에도 여전히 분리됩니다 — 퍼지 매칭은 하지 않습니다.
 */
function normalizeComplexName(name: string): string {
  return name
    .replace(/이편한세상/g, "e편한세상")
    .replace(/아파트$/, "")
    .replace(/\s+/g, "")
    .trim();
}

export interface ComplexAreaRow {
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

export interface ComplexGroup {
  /**
   * 정규화 후 이름이 같아 하나로 묶인 거래 중, 거래건수가 가장 많은 쪽의
   * aptSeq/aptNm을 대표값으로 씁니다(표기가 여러 개면 다수결).
   */
  aptSeq: string;
  aptNm: string;
  /** 단지 전체(모든 평형 합산) 거래건수. */
  tradeCount: number;
  /** 거래건수 많은 순. */
  areaRows: ComplexAreaRow[];
}

export interface SiseSummary {
  tradeCount: number;
  /** 만원 단위. 거래가 없으면 null. */
  averagePrice: number | null;
  highestTrade: MolitAptTradeItem | null;
  /** 단지 총 거래건수 많은 순. */
  complexGroups: ComplexGroup[];
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

function summarizeAreaRow(
  trades: MolitAptTradeItem[],
  representativeArea: number,
): ComplexAreaRow {
  const sortedByDateDesc = [...trades].sort((a, b) => b.dealDate.localeCompare(a.dealDate));
  const prices = trades.map((trade) => trade.dealAmount);

  return {
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
 * 단지별로 묶고, 그 안에서 다시 평형별로 묶어 요약합니다. 단지는 이름을
 * normalizeComplexName으로 정규화한 값을 기준으로 묶여(표기 차이로 인한
 * 중복 등록 통합), 같은 단지라도 전용면적이 다르면(84㎡/59㎡ 등) 평형별로
 * 별도 행이 됩니다. 결과는 단지 총 거래건수가 많은 순으로 정렬됩니다.
 */
export function summarizeDongTrades(trades: MolitAptTradeItem[]): SiseSummary {
  if (trades.length === 0) {
    return { tradeCount: 0, averagePrice: null, highestTrade: null, complexGroups: [] };
  }

  const byNormalizedName = new Map<string, MolitAptTradeItem[]>();
  for (const trade of trades) {
    const key = normalizeComplexName(trade.aptNm);
    const group = byNormalizedName.get(key) ?? [];
    group.push(trade);
    byNormalizedName.set(key, group);
  }

  const complexGroups: ComplexGroup[] = [];
  for (const complexTrades of byNormalizedName.values()) {
    const aptSeqCounts = new Map<string, number>();
    for (const trade of complexTrades) {
      aptSeqCounts.set(trade.aptSeq, (aptSeqCounts.get(trade.aptSeq) ?? 0) + 1);
    }
    const [representativeAptSeq] = [...aptSeqCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    const representativeAptNm = complexTrades.find(
      (trade) => trade.aptSeq === representativeAptSeq,
    )!.aptNm;

    const areaRows = groupByArea(complexTrades, AREA_TOLERANCE)
      .map((group) => summarizeAreaRow(group.trades, group.representativeArea))
      .sort((a, b) => b.tradeCount - a.tradeCount);

    complexGroups.push({
      aptSeq: representativeAptSeq,
      aptNm: representativeAptNm,
      tradeCount: complexTrades.length,
      areaRows,
    });
  }

  complexGroups.sort((a, b) => b.tradeCount - a.tradeCount);

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
    complexGroups,
  };
}
