import type { MolitComplexSearchResult } from "./molit";

const LAWD_CODES: ReadonlyArray<[RegExp, string]> = [
  [/경기도\s*김포시/, "41570"],
];

/** 주소에서 확실히 매칭되는 시군구의 국토부 LAWD_CD만 반환합니다. */
export function findLawdCodeFromAddress(address: string): string | undefined {
  return LAWD_CODES.find(([pattern]) => pattern.test(address))?.[1];
}

/** 공백·기호와 '아파트' 표기만 무시합니다. 차수 숫자는 그대로 보존합니다. */
export function normalizeMolitComplexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[e이]편한/g, "e편한")
    .replace(/아파트/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizeMolitBrandBase(name: string): string {
  return normalizeMolitComplexName(name).replace(/\d+단지$/, "");
}

function extractJibun(address: string): string | undefined {
  return address.match(/(?:^|\s)(\d+(?:-\d+)?)(?:\s|$)/)?.[1];
}

function extractYear(approvalDate: string): number | undefined {
  const year = Number(approvalDate.match(/^(\d{4})/)?.[1]);
  return Number.isInteger(year) && year > 0 ? year : undefined;
}

export function findUniqueMolitComplexMatch(
  name: string,
  complexes: MolitComplexSearchResult[],
  context: { address: string; approvalDate: string },
): MolitComplexSearchResult | undefined {
  const normalized = normalizeMolitComplexName(name);
  const normalizedBase = normalizeMolitBrandBase(name);
  const jibun = extractJibun(context.address);
  const buildYear = extractYear(context.approvalDate);
  if (!normalized || !jibun || !buildYear) return undefined;
  const matches = complexes.filter(
    (complex) => {
      const candidateName = normalizeMolitComplexName(complex.aptNm);
      const nameMatches = candidateName === normalized ||
        normalizeMolitBrandBase(complex.aptNm) === normalizedBase;
      return nameMatches && complex.jibun === jibun && complex.buildYear === buildYear;
    },
  );
  return matches.length === 1 ? matches[0] : undefined;
}
