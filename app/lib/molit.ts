import { XMLParser } from "fast-xml-parser";

const MOLIT_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

/** 정상 처리로 간주하는 국토부 응답 resultCode 값 (API 버전에 따라 자릿수가 다를 수 있음) */
const SUCCESS_RESULT_CODES = new Set(["00", "000"]);

export class MolitApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MolitApiError";
  }
}

export interface MolitAptTradeItem {
  aptNm: string;
  aptSeq: string;
  jibun: string;
  umdNm: string;
  floor: number;
  /** 전용면적(㎡) */
  excluUseAr: number;
  /** 거래금액(만원 단위) */
  dealAmount: number;
  /** 계약일 (YYYY-MM-DD) */
  dealDate: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  // 자동 숫자 변환을 끕니다. 그렇지 않으면 "000" 같은 코드 값이 0으로
  // 변환되어 버려 결과코드 비교가 깨집니다. 숫자가 필요한 필드는 toNumber()로 직접 변환합니다.
  parseTagValue: false,
});

function toNumber(value: unknown): number {
  const text = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  const num = Number(text);
  return Number.isFinite(num) ? num : NaN;
}

function pad2(value: unknown): string {
  return String(value ?? "").trim().padStart(2, "0");
}

function getYearMonthsBack(months: number): string[] {
  const result: string[] = [];
  const now = new Date();

  for (let i = 0; i < months; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    result.push(`${yyyy}${mm}`);
  }

  return result;
}

/**
 * 국토교통부 아파트매매 실거래자료(상세) API에서 특정 지역(LAWD_CD)·월(DEAL_YMD)의
 * 거래 목록을 조회해 JSON으로 변환합니다.
 */
export async function fetchAptTrades(
  lawdCode: string,
  dealYmd: string,
): Promise<MolitAptTradeItem[]> {
  const serviceKey = process.env.MOLIT_API_KEY;

  if (!serviceKey) {
    throw new MolitApiError(
      "MOLIT_API_KEY 환경변수가 설정되어 있지 않습니다.",
    );
  }

  const url = new URL(MOLIT_ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("LAWD_CD", lawdCode);
  url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("pageNo", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // 게이트웨이가 User-Agent 없는 요청을 차단하는 경우가 있어 명시적으로 지정합니다.
        "User-Agent": "Mozilla/5.0 (compatible; HosooRealtyBot/1.0)",
      },
      // 실거래가는 월 단위로만 갱신되므로 1시간 캐시로 불필요한 재호출을 줄입니다.
      next: { revalidate: 60 * 60 },
    });
  } catch (error) {
    throw new MolitApiError(
      `국토교통부 API 호출에 실패했습니다: ${(error as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new MolitApiError(
      `국토교통부 API가 오류 응답을 반환했습니다. (HTTP ${response.status})`,
    );
  }

  const xmlText = await response.text();

  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xmlText);
  } catch (error) {
    throw new MolitApiError(
      `국토교통부 API 응답(XML)을 파싱하지 못했습니다: ${(error as Error).message}`,
    );
  }

  const root = parsed as {
    OpenAPI_ServiceResponse?: {
      cmmMsgHeader?: { returnAuthMsg?: string; errMsg?: string };
    };
    response?: {
      header?: { resultCode?: unknown; resultMsg?: unknown };
      body?: { items?: { item?: unknown } };
    };
  };

  // 서비스키 인증 실패 등은 <response> 대신 <OpenAPI_ServiceResponse> 형태로 내려옵니다.
  if (root.OpenAPI_ServiceResponse) {
    const header = root.OpenAPI_ServiceResponse.cmmMsgHeader;
    const authMessage =
      header?.returnAuthMsg ?? header?.errMsg ?? "알 수 없는 인증 오류";
    throw new MolitApiError(`국토교통부 API 인증 오류: ${authMessage}`);
  }

  const resultCode = String(root.response?.header?.resultCode ?? "");

  if (!SUCCESS_RESULT_CODES.has(resultCode)) {
    const resultMsg = root.response?.header?.resultMsg ?? "알 수 없는 오류";
    throw new MolitApiError(
      `국토교통부 API 오류 (resultCode: ${resultCode}): ${resultMsg}`,
    );
  }

  const rawItems = root.response?.body?.items?.item;

  if (!rawItems) {
    return [];
  }

  const itemList = Array.isArray(rawItems) ? rawItems : [rawItems];

  return itemList.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      aptNm: String(record.aptNm ?? "").trim(),
      aptSeq: String(record.aptSeq ?? "").trim(),
      jibun: String(record.jibun ?? "").trim(),
      umdNm: String(record.umdNm ?? "").trim(),
      floor: toNumber(record.floor),
      excluUseAr: toNumber(record.excluUseAr),
      dealAmount: toNumber(record.dealAmount),
      dealDate: `${record.dealYear}-${pad2(record.dealMonth)}-${pad2(record.dealDay)}`,
    };
  });
}

/**
 * 최근 N개월(기본 12개월)의 아파트매매 실거래자료를 지역코드 기준으로 조회해 합칩니다.
 * 국토부 API는 한 번에 한 달치만 조회할 수 있어 월별로 나눠 호출하며,
 * 일부 달 조회가 실패해도 나머지 달의 데이터는 최대한 반환합니다.
 */
export async function fetchRecentAptTrades(
  lawdCode: string,
  months = 12,
): Promise<MolitAptTradeItem[]> {
  const yearMonths = getYearMonthsBack(months);

  const results = await Promise.allSettled(
    yearMonths.map((dealYmd) => fetchAptTrades(lawdCode, dealYmd)),
  );

  const succeeded = results.filter(
    (result): result is PromiseFulfilledResult<MolitAptTradeItem[]> =>
      result.status === "fulfilled",
  );

  if (succeeded.length === 0) {
    const firstRejected = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    );
    if (firstRejected?.reason instanceof Error) {
      throw firstRejected.reason;
    }
    throw new MolitApiError("국토교통부 API 조회에 모두 실패했습니다.");
  }

  return succeeded.flatMap((result) => result.value);
}
