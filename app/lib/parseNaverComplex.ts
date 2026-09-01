/**
 * 네이버 부동산 "단지정보" 탭에서 사람이 직접 복사해 붙여넣은 텍스트를 분석한
 * 결과. app/lib/naverTextParser.ts(매물용)와 동일한 원칙입니다 — 서버가
 * 네이버 페이지를 직접 요청하거나 크롤링하지 않고, 이 모듈은 순수 텍스트
 * 처리만 합니다. 텍스트에서 확실히 인식된 값만 채우고, 애매하면 채우지
 * 않습니다(추측/허위 값 생성 금지).
 *
 * 네이버 단지정보 화면은 상단에 "* 266세대", "* 용적률 119%" 같은 요약
 * 태그가 먼저 나오고, 그 아래 "기본 정보" 섹션에 "세대수\n266세대"처럼
 * 라벨+값이 다시 한번 나옵니다. 요약 태그는 라벨 텍스트가 없거나(예:
 * "* 266세대") 상세 섹션과 표기 형식이 달라서(예: "용적률 119%" vs
 * "용적률/건폐율\n119% / 12%"), 아래 라벨 패턴들은 대부분 자연히 상세
 * 섹션만 매칭합니다. 그래도 "기본 정보" 문자열을 찾으면 그 이후 구간으로
 * 검색 범위를 한 번 더 좁혀 상단 요약과 절대 섞이지 않게 합니다.
 */
export interface ParsedNaverComplex {
  name?: string;
  address?: string;
  /** YYYY-MM-DD */
  approvalDate?: string;
  totalHouseholds?: number;
  buildings?: number;
  /** 최고층이 "가장 낮은 동/가장 높은 동" 두 줄로 나올 수 있어, 더 큰 값을 씁니다. */
  maxFloor?: number;
  heating?: string;
  /** 건설사(시공사) 원문 그대로. */
  builder?: string;
  parkingCount?: number;
  parkingPerHousehold?: number;
  /** 용적률(%) */
  floorAreaRatio?: number;
  /** 건폐율(%) */
  buildingCoverageRatio?: number;
  managementOfficePhone?: string;
  managementFeeWon?: number | null;
  /** 네이버에 표시된 관리비 원문. 숫자 변환 실패 여부와 무관하게 보존합니다. */
  managementFeeRaw?: string;
  /** YYYY-MM */
  managementFeeAsOf?: string;
  nearbySchools?: string[];
  subway?: string;
  subwayDistance?: string;
  subwayWalkMinutes?: number;
  buses?: string[];
  /** 두 번째 이후 지하철역처럼 자동 저장하지 않은 확인 필요 안내. */
  notices?: string[];
}

/** 화면에 보여줄 한글 라벨. getUncertainComplexFieldLabels에서 사용합니다. */
const FIELD_LABELS: Partial<Record<keyof ParsedNaverComplex, string>> = {
  name: "단지명",
  address: "주소",
  approvalDate: "사용승인일",
  totalHouseholds: "세대수",
  buildings: "동수",
  maxFloor: "최고층",
  heating: "난방",
  builder: "건설사",
  parkingCount: "주차대수",
  parkingPerHousehold: "세대당 주차대수",
  floorAreaRatio: "용적률",
  buildingCoverageRatio: "건폐율",
  managementOfficePhone: "관리사무소 전화번호",
  managementFeeRaw: "관리비",
  managementFeeAsOf: "관리비 기준연월",
  nearbySchools: "배정 초등학교",
  subway: "지하철역",
  subwayDistance: "지하철 거리",
  subwayWalkMinutes: "지하철 도보시간",
  buses: "버스",
};

/** 네이버식 만원 혼합 표기(19만 9,546원)를 원 단위 정수로 변환합니다. */
export function parseManagementFeeWon(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(/,/g, "");
  const mixed = normalized.match(/(\d+(?:\.\d+)?)만(?:원)?(?:(\d+)원?)?/);
  if (mixed) {
    const won = Number(mixed[1]) * 10000 + Number(mixed[2] ?? 0);
    return Number.isInteger(won) && won >= 0 ? won : null;
  }
  const wonOnly = normalized.match(/(\d+)원/);
  if (!wonOnly) return null;
  const won = Number(wonOnly[1]);
  return Number.isSafeInteger(won) ? won : null;
}

function parseManagement(section: string): Pick<
  ParsedNaverComplex,
  "managementFeeRaw" | "managementFeeWon" | "managementFeeAsOf"
> {
  const match = section.match(/(?:월\s*)?관리비(?!\s*기준)\s*[:：]?\s*([^\n]+)/);
  if (!match) return {};
  const raw = match[1].trim();
  const date = (raw + "\n" + section.match(/관리비\s*기준(?:연월)?\s*[:：]?\s*([^\n]+)/)?.[1]).match(
    /(20\d{2})[.\-/년]\s*(\d{1,2})\s*(?:월)?/,
  );
  return {
    managementFeeRaw: raw,
    managementFeeWon: parseManagementFeeWon(raw),
    managementFeeAsOf: date ? `${date[1]}-${date[2].padStart(2, "0")}` : undefined,
  };
}

function parsePhone(section: string): string | undefined {
  return section.match(/관리사무소(?:\s*전화번호)?\s*[:：]?\s*(0\d{1,2}-\d{3,4}-\d{4})/)?.[1];
}

function parseSchools(text: string): string[] | undefined {
  const results = [...text.matchAll(/([가-힣A-Za-z0-9]+초등학교)\s*(?:[·|,]\s*)?(?:약\s*)?(\d[\d,]*)\s*m\s*(?:[·|,]\s*)?(?:도보\s*)?(\d+)\s*분/g)]
    .map((match) => `${match[1]} · 약 ${match[2].replace(/,/g, "")}m · 도보 ${match[3]}분`);
  return results.length > 0 ? [...new Set(results)] : undefined;
}

function parseSubways(text: string): Pick<ParsedNaverComplex, "subway" | "subwayDistance" | "subwayWalkMinutes" | "notices"> {
  const matches = [...text.matchAll(/([가-힣A-Za-z0-9]+역)\s*(?:[·|,]\s*)?(?:약\s*)?(\d[\d,]*)\s*m\s*(?:[·|,]\s*)?(?:도보\s*)?(\d+)\s*분/g)];
  if (matches.length === 0) return {};
  const first = matches[0];
  return {
    subway: first[1],
    subwayDistance: `약 ${first[2].replace(/,/g, "")}m`,
    subwayWalkMinutes: Number(first[3]),
    notices: matches.length > 1
      ? [`지하철역이 여러 개 확인되었습니다. ${matches.slice(1).map((match) => match[1]).join(", ")}은 직접 확인해주세요.`]
      : undefined,
  };
}

function parseBuses(text: string): string[] | undefined {
  const results = [...text.matchAll(/(?:버스\s*)?([A-Za-z]?\d{1,4}(?:-\d{1,3})?)\s*[\[(]?\s*(일반|간선|지선|광역|직행좌석|좌석|마을|공항)\s*[\])]?/g)]
    .map((match) => `${match[1]}(${match[2]})`);
  return results.length > 0 ? [...new Set(results)] : undefined;
}

/** "기본 정보" 문자열 이후 구간만 돌려줍니다. 못 찾으면 전체 텍스트를 그대로 씁니다(구형/다른 레이아웃 대비 — 위 클래스 코멘트 참고). */
function getBasicInfoSection(text: string): string {
  const boundaryIndex = text.search(/기본\s*정보/);
  return boundaryIndex === -1 ? text : text.slice(boundaryIndex);
}

function parseComplexName(text: string): string | undefined {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine || undefined;
}

/** "위치경기도 김포시 ...상세내역 보기" 형태에서 "위치" 라벨과 "상세내역 보기" UI 문구를 제거합니다. */
function parseAddress(text: string): string | undefined {
  const match = text.match(/위치\s*([^\n]+)/);
  if (!match) return undefined;
  const cleaned = match[1].replace(/상세내역\s*보기\s*$/, "").trim();
  return cleaned || undefined;
}

/** "사용승인일\n2018. 8. 31. (8년차)" → "2018-08-31". */
function parseApprovalDate(section: string): string | undefined {
  const match = section.match(
    /사용승인일\s*[:：]?\s*(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\./,
  );
  if (!match) return undefined;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseTotalHouseholds(section: string): number | undefined {
  const match = section.match(/세대수\s*[:：]?\s*([\d,]+)\s*세대/);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

function parseBuildings(section: string): number | undefined {
  const match = section.match(/동수\s*[:：]?\s*([\d,]+)\s*개/);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

/**
 * "최고층\n15층 (가장 낮은 동)\n18층 (가장 높은 동)"처럼 값이 한 줄 또는
 * 두 줄로 나올 수 있습니다. "최고층" 라벨 뒤 짧은 구간 안의 "N층" 숫자를
 * 전부 찾아 그중 가장 큰 값을 씁니다.
 */
function parseMaxFloor(section: string): number | undefined {
  const labelMatch = section.match(/최고층\s*[:：]?\s*([\s\S]{1,80})/);
  if (!labelMatch) return undefined;
  const floorNumbers = [...labelMatch[1].matchAll(/(\d+)\s*층/g)].map((m) =>
    Number(m[1]),
  );
  if (floorNumbers.length === 0) return undefined;
  return Math.max(...floorNumbers);
}

function parseHeating(section: string): string | undefined {
  const match = section.match(/난방\s*[:：]?\s*([^\n]{1,30})/);
  const value = match?.[1]?.trim();
  return value || undefined;
}

function parseBuilder(section: string): string | undefined {
  const match = section.match(/건설사\s*[:：]?\s*([^\n]{1,100})/);
  const value = match?.[1]?.trim();
  return value || undefined;
}

/** "주차\n360대 (세대당 1.35대)" → { count: 360, perHousehold: 1.35 }. */
function parseParking(
  section: string,
): { count?: number; perHousehold?: number } {
  const match = section.match(
    /주차\s*[:：]?\s*([\d,]+)\s*대\s*\(\s*세대당\s*([\d.]+)\s*대\s*\)/,
  );
  if (!match) return {};
  const count = Number(match[1].replace(/,/g, ""));
  const perHousehold = Number(match[2]);
  return {
    count: Number.isFinite(count) ? count : undefined,
    perHousehold: Number.isFinite(perHousehold) ? perHousehold : undefined,
  };
}

/** "용적률/건폐율\n119% / 12%" → { floorAreaRatio: 119, buildingCoverageRatio: 12 }. */
function parseRatios(
  section: string,
): { floorAreaRatio?: number; buildingCoverageRatio?: number } {
  const match = section.match(
    /용적률\s*\/\s*건폐율\s*[:：]?\s*([\d.]+)\s*%\s*\/\s*([\d.]+)\s*%/,
  );
  if (!match) return {};
  const floorAreaRatio = Number(match[1]);
  const buildingCoverageRatio = Number(match[2]);
  return {
    floorAreaRatio: Number.isFinite(floorAreaRatio) ? floorAreaRatio : undefined,
    buildingCoverageRatio: Number.isFinite(buildingCoverageRatio)
      ? buildingCoverageRatio
      : undefined,
  };
}

/** 네이버 단지정보 탭에서 복사한 텍스트를 분석합니다. 네트워크 호출이 전혀 없습니다. */
export function parseNaverComplexText(rawText: string): ParsedNaverComplex {
  const text = rawText.replace(/\r\n/g, "\n");
  const section = getBasicInfoSection(text);

  const parking = parseParking(section);
  const ratios = parseRatios(section);
  const management = parseManagement(section);
  const subways = parseSubways(text);

  return {
    name: parseComplexName(text),
    address: parseAddress(text),
    approvalDate: parseApprovalDate(section),
    totalHouseholds: parseTotalHouseholds(section),
    buildings: parseBuildings(section),
    maxFloor: parseMaxFloor(section),
    heating: parseHeating(section),
    builder: parseBuilder(section),
    parkingCount: parking.count,
    parkingPerHousehold: parking.perHousehold,
    floorAreaRatio: ratios.floorAreaRatio,
    buildingCoverageRatio: ratios.buildingCoverageRatio,
    managementOfficePhone: parsePhone(section),
    ...management,
    nearbySchools: parseSchools(text),
    ...subways,
    buses: parseBuses(text),
  };
}

/** 인식하지 못해 관리자가 직접 확인해야 하는 필드의 한글 라벨 목록. */
export function getUncertainComplexFieldLabels(
  parsed: ParsedNaverComplex,
): string[] {
  const labels: string[] = [];
  for (const [key, label] of Object.entries(FIELD_LABELS) as [
    keyof ParsedNaverComplex,
    string,
  ][]) {
    if (parsed[key] === undefined) {
      labels.push(label);
    }
  }
  return labels;
}
