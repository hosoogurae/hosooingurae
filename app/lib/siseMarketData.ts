import { fetchRecentAptTrades, getYearMonthsBack, type MolitAptTradeItem } from "./molit";
import { filterValidDongTrades } from "./sise";

/**
 * "/sise" 기능이 국토교통부 실거래 데이터를 얻는 유일한 창구입니다. 화면·
 * 컴포넌트는 이 함수만 호출하고 fetchRecentAptTrades나 지역코드를 직접
 * 알지 못하게 합니다 — 지금은 요청 시 fetch + Next 캐시로 채우지만, 나중에
 * Supabase 캐시 테이블 등 다른 방식으로 바꾸더라도 이 함수의 반환 타입만
 * 유지하면 호출부(페이지·컴포넌트·테스트)는 전혀 안 바뀝니다.
 */

/** 김포시 법정동코드(시군구 단위) — 국토부 API는 동 단위 코드가 따로 없어, 이 코드로 받은 뒤 umdNm으로 걸러냅니다. */
const LAWD_CD_GIMPO = "41570";
const DONG_NAME = "구래동";

export interface GuraeMarketData {
  /** 구래동 아파트 매매, 해제(취소) 신고 제외. */
  trades: MolitAptTradeItem[];
  /** 실제로 조회한 연월(YYYYMM) 목록, 최신 달이 먼저. 화면의 "OOOO년 O월~O월 신고분" 표시에 씁니다. */
  coveredYearMonths: string[];
  /** 이 함수가 실행된 시각(ISO). 캐시된 데이터를 돌려줬더라도 "지금 이 화면을 만든 시각"은 맞으므로,
   * "방금 갱신"처럼 데이터가 방금 새로 조회됐다는 뜻으로 쓰면 안 되고 "조회 시각"으로만 표시합니다. */
  queriedAt: string;
}

/**
 * 구래동 아파트 매매 실거래를 최근 monthsBack개월치 조회합니다. 지역
 * 단위로 한 번만 부르고 단지별로 다시 부르지 않습니다 — molit 연동된
 * 12개 단지가 전부 같은 지역코드(41570)라, 이 한 번의 결과를 단지별
 * aptSeq로 걸러서 나눠 쓰면 됩니다.
 */
export async function getGuraeApartmentMarketData(
  monthsBack = 18,
): Promise<GuraeMarketData> {
  const trades = await fetchRecentAptTrades(LAWD_CD_GIMPO, monthsBack);
  return {
    trades: filterValidDongTrades(trades, DONG_NAME),
    coveredYearMonths: getYearMonthsBack(monthsBack),
    queriedAt: new Date().toISOString(),
  };
}
