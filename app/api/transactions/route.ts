import { NextRequest, NextResponse } from "next/server";
import type { ComplexTransaction } from "../../data/complexTransactions";
import { getComplexById } from "../../lib/complexes";
import { formatPriceFull, getTransactionsByComplexId } from "../../lib/transactions";
import { fetchRecentAptTrades } from "../../lib/molit";

/** 같은 평형으로 간주할 전용면적 오차 허용 범위(㎡). 동일 타입 내 세대별 미세한 등록면적 차이를 흡수합니다. */
const AREA_TOLERANCE = 1;

/** 국토부 실거래 조회 기간(개월). 화면 캡션의 "최근 N개월"이 이 값과 항상 같도록 응답에 그대로 실어 보냅니다. */
const MOLIT_RECENT_MONTHS = 12;

/**
 * mock은 "manually confirmed"를 뜻하는 데이터가 실제로 있을 때만 씁니다.
 * empty는 (mock이든 molit 조회든) 보여줄 거래가 정말 하나도 없는 경우이고,
 * error는 국토부 API 호출 자체가 실패한 경우입니다 — 이전에는 empty와
 * error 둘 다 조용히 mock으로 되돌아가서, 손님이 지금 보는 게 실시간
 * 국토부 데이터인지 예전 수동 데이터인지 구분할 수 없었습니다.
 */
export interface TransactionsResponse {
  source: "molit" | "mock" | "empty" | "error";
  transactions: ComplexTransaction[];
  /** source가 "molit"일 때만: 실제로 조회한 개월 수. */
  months?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const complexId = searchParams.get("complexId");
  const exclusiveAreaParam = searchParams.get("exclusiveArea");
  const exclusiveArea =
    exclusiveAreaParam !== null && exclusiveAreaParam !== ""
      ? Number(exclusiveAreaParam)
      : null;

  if (!complexId) {
    return NextResponse.json(
      { error: "complexId 쿼리 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const complex = await getComplexById(complexId);

  if (!complex?.molit) {
    const fallback = getTransactionsByComplexId(complexId);
    return NextResponse.json<TransactionsResponse>({
      source: fallback.length > 0 ? "mock" : "empty",
      transactions: fallback,
    });
  }

  try {
    const trades = await fetchRecentAptTrades(complex.molit.lawdCode, MOLIT_RECENT_MONTHS);

    const matched = trades.filter((trade) => {
      if (trade.aptSeq !== complex.molit?.aptSeq) {
        return false;
      }
      if (exclusiveArea !== null && Number.isFinite(exclusiveArea)) {
        return Math.abs(trade.excluUseAr - exclusiveArea) <= AREA_TOLERANCE;
      }
      return true;
    });

    if (matched.length === 0) {
      // 국토부 조회 자체는 성공했지만 이 평형·기간엔 거래가 없는 경우입니다.
      // 다른 평형의(또는 오래된) mock 데이터로 조용히 대체하지 않습니다.
      return NextResponse.json<TransactionsResponse>({
        source: "empty",
        transactions: [],
      });
    }

    const transactions: ComplexTransaction[] = matched
      .map((trade, index) => ({
        id: `${complex.id}-molit-${trade.dealDate}-${index}`,
        complexId: complex.id,
        contractDate: trade.dealDate,
        price: trade.dealAmount,
        priceLabel: formatPriceFull(trade.dealAmount),
        floor: trade.floor,
        exclusiveArea: trade.excluUseAr,
        transactionType: "매매" as const,
        verifiedAt: new Date().toISOString().slice(0, 10),
      }))
      .sort((a, b) => a.contractDate.localeCompare(b.contractDate));

    return NextResponse.json<TransactionsResponse>({
      source: "molit",
      transactions,
      months: MOLIT_RECENT_MONTHS,
    });
  } catch (error) {
    console.error("[api/transactions] 국토교통부 API 연동 실패", error);
    return NextResponse.json<TransactionsResponse>({
      source: "error",
      transactions: [],
    });
  }
}
