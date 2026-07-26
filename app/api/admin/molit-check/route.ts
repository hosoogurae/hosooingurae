import { NextRequest, NextResponse } from "next/server";
import { fetchRecentAptTrades, MolitApiError } from "../../../lib/molit";

export interface MolitCheckSample {
  dealDate: string;
  floor: number;
  exclusiveArea: number;
  dealAmount: number;
  aptNm: string;
}

/**
 * /admin/complexes 등록·수정 화면의 "실거래 연결 확인" 버튼 전용. 아직 저장하지
 * 않은 lawdCode/aptSeq만으로 국토교통부 API를 실제로 호출해, 저장 전에 실거래가
 * 조회되는지 미리 확인합니다. app/api/transactions와 동일한 fetchRecentAptTrades를
 * 그대로 재사용하며, DB에는 아무것도 쓰지 않습니다.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { lawdCode, aptSeq } =
    (body as { lawdCode?: unknown; aptSeq?: unknown } | null) ?? {};

  if (typeof lawdCode !== "string" || lawdCode.trim() === "") {
    return NextResponse.json(
      { errors: ["지역코드(lawdCode)를 입력해주세요."] },
      { status: 400 },
    );
  }
  if (typeof aptSeq !== "string" || aptSeq.trim() === "") {
    return NextResponse.json(
      { errors: ["단지코드(aptSeq)를 입력해주세요."] },
      { status: 400 },
    );
  }

  try {
    const trades = await fetchRecentAptTrades(lawdCode.trim(), 12);
    const matched = trades.filter((trade) => trade.aptSeq === aptSeq.trim());

    const sample: MolitCheckSample[] = matched
      .slice(-5)
      .reverse()
      .map((trade) => ({
        dealDate: trade.dealDate,
        floor: trade.floor,
        exclusiveArea: trade.excluUseAr,
        dealAmount: trade.dealAmount,
        aptNm: trade.aptNm,
      }));

    return NextResponse.json({
      ok: true,
      matchCount: matched.length,
      totalTradesInRegion: trades.length,
      sample,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof MolitApiError
            ? error.message
            : "국토교통부 API 확인 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 502 },
    );
  }
}
