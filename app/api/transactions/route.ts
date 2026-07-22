import { NextRequest, NextResponse } from "next/server";
import type { ComplexTransaction } from "../../data/complexTransactions";
import { getComplexById } from "../../lib/complexes";
import { formatPriceFull, getTransactionsByComplexId } from "../../lib/transactions";
import { fetchRecentAptTrades } from "../../lib/molit";

/** 같은 평형으로 간주할 전용면적 오차 허용 범위(㎡). 동일 타입 내 세대별 미세한 등록면적 차이를 흡수합니다. */
const AREA_TOLERANCE = 1;

interface TransactionsResponse {
  source: "molit" | "mock";
  transactions: ComplexTransaction[];
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

  const fallback = getTransactionsByComplexId(complexId);
  const complex = await getComplexById(complexId);

  if (!complex?.molit) {
    return NextResponse.json<TransactionsResponse>({
      source: "mock",
      transactions: fallback,
    });
  }

  try {
    const trades = await fetchRecentAptTrades(complex.molit.lawdCode, 12);

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
      return NextResponse.json<TransactionsResponse>({
        source: "mock",
        transactions: fallback,
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
      }))
      .sort((a, b) => a.contractDate.localeCompare(b.contractDate));

    return NextResponse.json<TransactionsResponse>({
      source: "molit",
      transactions,
    });
  } catch (error) {
    console.error(
      "[api/transactions] 국토교통부 API 연동 실패, mock 데이터로 대체합니다.",
      error,
    );
    return NextResponse.json<TransactionsResponse>({
      source: "mock",
      transactions: fallback,
    });
  }
}
