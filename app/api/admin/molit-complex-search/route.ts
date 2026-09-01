import { NextRequest, NextResponse } from "next/server";
import {
  fetchRecentAptTrades,
  MolitApiError,
  summarizeMolitComplexes,
} from "../../../lib/molit";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["요청 본문이 올바르지 않습니다."] }, { status: 400 });
  }
  const { lawdCode, months } =
    (body as { lawdCode?: unknown; months?: unknown } | null) ?? {};
  if (typeof lawdCode !== "string" || !/^\d{5}$/.test(lawdCode.trim())) {
    return NextResponse.json({ errors: ["지역코드(lawdCode)는 5자리 숫자로 입력해주세요."] }, { status: 400 });
  }
  const searchMonths = months === undefined ? 6 : months;
  if (!Number.isInteger(searchMonths) || Number(searchMonths) < 1 || Number(searchMonths) > 60) {
    return NextResponse.json({ errors: ["조회 기간은 1~60개월의 정수로 입력해주세요."] }, { status: 400 });
  }
  try {
    const trades = await fetchRecentAptTrades(lawdCode.trim(), Number(searchMonths));
    return NextResponse.json({ complexes: summarizeMolitComplexes(trades) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof MolitApiError ? error.message : "국토교통부 API 조회 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
